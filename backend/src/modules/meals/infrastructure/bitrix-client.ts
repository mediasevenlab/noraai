import { AsyncLocalStorage } from 'node:async_hooks'

import { readOfficeText } from '../../knowledge'
import {
  bitrixMethod,
  formatBitrixPayload,
  DISK_TREE_OVERVIEW_HINT,
  encodeDiskTree,
  formatDiskList,
  formatEventList,
  formatFunnelList,
  formatProjectCard,
  formatProjectList,
  formatTaskList,
  personMatches,
  type BitrixCall,
  type MeetingRequest,
  type DiskItem,
  type DiskNode,
  type FunnelLine,
} from '../domain/bitrix'

const BITRIX_TIMEOUT_MS = 20_000
const bitrixSignalStore = new AsyncLocalStorage<AbortSignal | undefined>()

function currentBitrixSignal() {
  const parent = bitrixSignalStore.getStore()
  const timeout = AbortSignal.timeout(BITRIX_TIMEOUT_MS)
  if (!parent) return timeout
  return AbortSignal.any([parent, timeout])
}

function abortedBitrixRead(error: unknown) {
  const parent = bitrixSignalStore.getStore()
  return Boolean(parent?.aborted) || (error instanceof Error && error.name === 'AbortError')
}
const FILE_BYTES_LIMIT = 12 * 1024 * 1024
const FILE_TEXT_LIMIT = 6_000

/** Incoming webhook base: https://portal/rest/{user}/{code}/ */
export function bitrixRestBase(raw: string) {
  let url: URL
  try {
    url = new URL(raw.trim())
  } catch {
    return ''
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return ''
  const parts = url.pathname.split('/').filter(Boolean)
  const rest = parts.indexOf('rest')
  const user = parts[rest + 1]
  const code = parts[rest + 2]
  if (rest < 0 || !user || !code || code.includes('.')) return ''
  return `${url.origin}/rest/${user}/${code}/`
}

export function takeBitrixFile(webhook: string, query: string, signal?: AbortSignal) {
  return bitrixSignalStore.run(signal, () => takeBitrixFileNow(webhook, query))
}

export function placeBitrixFile(webhook: string, query: string, signal?: AbortSignal) {
  return bitrixSignalStore.run(signal, () => placeBitrixFileNow(webhook, query))
}

export function readBitrixClients(webhook: string, signal?: AbortSignal) {
  return bitrixSignalStore.run(signal, () => readBitrixClientsNow(webhook))
}

export function readBitrixOutcomes(webhook: string, signal?: AbortSignal) {
  return bitrixSignalStore.run(signal, () => readBitrixOutcomesNow(webhook))
}

export function deleteBitrixMeeting(webhook: string, eventId: string, signal?: AbortSignal) {
  return bitrixSignalStore.run(signal, () => deleteBitrixMeetingNow(webhook, eventId))
}

export function locateBitrixMeeting(webhook: string, eventId: string, signal?: AbortSignal) {
  return bitrixSignalStore.run(signal, () => locateBitrixMeetingNow(webhook, eventId))
}

export function createBitrixMeeting(
  webhook: string,
  request: Pick<MeetingRequest, 'title' | 'when'> & Partial<Pick<MeetingRequest, 'hour' | 'minute' | 'withPerson' | 'withCompany' | 'person' | 'company' | 'date'>>,
  signal?: AbortSignal,
) {
  return bitrixSignalStore.run(signal, () => createBitrixMeetingNow(webhook, request))
}

export function createBitrixDocument(
  webhook: string,
  request: { title: string; chain: boolean },
  signal?: AbortSignal,
) {
  return bitrixSignalStore.run(signal, () => createBitrixDocumentNow(webhook, request))
}

export function readBitrixTree(webhook: string, signal?: AbortSignal, deep = false) {
  return bitrixSignalStore.run(signal, () => readBitrixTreeNow(webhook, deep))
}

async function takeBitrixFileNow(webhook: string, query: string) {
  const base = bitrixRestBase(webhook)
  if (!base) return { error: 'Портал не подключён.' }
  const nameOrId = query.trim()
  if (!nameOrId) return { error: 'Назовите файл, который нужно скачать.' }
  const located = await locateBitrixFile(base, nameOrId)
  if ('error' in located) return located
  const loaded = await postJson(base, 'disk.file.get', { id: located.id })
  if (loaded.failed) return { error: loaded.failed }
  const denied = scopeHint(loaded.payload, 'disk')
  if (denied) return { error: denied }
  const row = resultOf(loaded.payload)
  if (!isRecord(row)) return { error: 'Файл не открылся.' }
  const name = field(row, 'NAME', 'name') || located.name
  const download = field(row, 'DOWNLOAD_URL', 'downloadUrl')
  if (!download.startsWith('http')) return { error: 'Файл не скачался.' }
  const bytes = await downloadBytes(download)
  if (typeof bytes === 'string') return { error: bytes }
  if (bytes.length > 8 * 1024 * 1024) return { error: 'Файл слишком большой, чтобы приложить его к ответу.' }
  return { name, mime: mimeFor(name), bytes }
}

async function placeBitrixFileNow(webhook: string, query: string) {
  const base = bitrixRestBase(webhook)
  if (!base) return 'Портал не подключён.'
  const nameOrId = query.trim()
  if (!nameOrId) return 'Назовите файл, расположение которого нужно найти.'
  const located = await locateBitrixFile(base, nameOrId)
  if ('error' in located) return located.error
  const loaded = await postJson(base, 'disk.file.get', { id: located.id })
  if (loaded.failed) return loaded.failed
  const denied = scopeHint(loaded.payload, 'disk')
  if (denied) return denied
  const row = resultOf(loaded.payload)
  if (!isRecord(row)) return 'Файл не открылся.'
  const name = field(row, 'NAME', 'name') || located.name
  const id = field(row, 'ID', 'id') || located.id
  const path = await diskPath(base, row, name)
  return scrub(`Файл «${name}», номер ${id}. Путь в Битриксе: ${path}.`, base)
}

async function diskPath(base: string, row: Record<string, unknown>, fileName: string) {
  const storageId = field(row, 'STORAGE_ID', 'storageId')
  const parentId = field(row, 'PARENT_ID', 'parentId')
  let disk = 'Диск'
  let rootId = ''
  if (storageId) {
    const storage = await postJson(base, 'disk.storage.get', { id: storageId })
    const storageRow = resultOf(storage.payload)
    if (isRecord(storageRow)) {
      rootId = field(storageRow, 'ROOT_OBJECT_ID', 'rootObjectId')
      disk = await diskLabel(base, storageRow)
    }
  }
  const folders: string[] = []
  const seen = new Set<string>()
  let current = parentId
  while (current && current !== rootId && !seen.has(current) && folders.length < 8) {
    seen.add(current)
    const folder = await postJson(base, 'disk.folder.get', { id: current })
    const folderRow = resultOf(folder.payload)
    if (!isRecord(folderRow)) break
    const folderName = field(folderRow, 'NAME', 'name')
    if (folderName) folders.unshift(readableBitrixName(folderName))
    current = field(folderRow, 'PARENT_ID', 'parentId')
  }
  return [disk, ...folders, fileName].join(' / ')
}

async function diskLabel(base: string, storage: Record<string, unknown>) {
  const entity = field(storage, 'ENTITY_TYPE', 'entityType').toLowerCase()
  const entityId = field(storage, 'ENTITY_ID', 'entityId')
  const name = field(storage, 'NAME', 'name')
  if (entity === 'user' && entityId) {
    const people = await postJson(base, 'user.get', { ID: entityId })
    const person = records(resultOf(people.payload))[0]
    if (person) {
      const full = [field(person, 'NAME', 'name'), field(person, 'LAST_NAME', 'lastName')].filter(Boolean).join(' ')
      if (full) return `Диск «${full}»`
    }
  }
  if (entity === 'group' && name) return `Диск проекта «${readableBitrixName(name)}»`
  if (name) return `Диск «${readableBitrixName(name)}»`
  if (entity === 'common') return 'Общий диск'
  return 'Диск'
}

function readableBitrixName(name: string) {
  return name.split('@').join('@\u200b')
}

function displayName(name: string) {
  return readableBitrixName(name.replace(/_/g, ' ').replace(/ {2,}/g, ' ').trim())
}

export function askBitrix(webhook: string, call: BitrixCall, signal?: AbortSignal) {
  return bitrixSignalStore.run(signal, () => askBitrixNow(webhook, call))
}

async function askBitrixNow(webhook: string, call: BitrixCall) {
  const base = bitrixRestBase(webhook)
  if (!base) return 'Портал не подключён.'
  if (call.action === 'funnels') return scrub(await readFunnels(base), base)
  if (call.action === 'files') return scrub(await readFileList(base, call.query, call.deep === true), base)
  if (call.action === 'file') return scrub(await readOneFile(base, call.query), base, true)
  if (call.action === 'tasks') return scrub(await readTasks(base, call), base)
  if (call.action === 'projects') return scrub(await readProjects(base, call.query), base)
  if (call.action === 'events') return scrub(await readEvents(base, call.query), base)
  if (call.action === 'delete_task') return scrub(await deleteTask(base, call.title, call.taskId), base)
  const { method, body } = bitrixMethod(call)
  const loaded = await postJson(base, method, body)
  if (loaded.failed) return loaded.failed
  return scrub(formatBitrixPayload(call, loaded.payload), base)
}

async function readFunnels(base: string) {
  let loaded = await postJson(base, 'crm.category.list', { entityTypeId: 2 })
  if (loaded.failed) return loaded.failed
  let rows = funnelRows(loaded.payload)
  if (rows.length === 0) {
    const hint = scopeHint(loaded.payload, 'crm')
    if (hint) {
      loaded = await postJson(base, 'crm.dealcategory.list', {})
      if (loaded.failed) return hint
      rows = funnelRows(loaded.payload)
      if (rows.length === 0) return scopeHint(loaded.payload, 'crm') || hint
    }
  }
  const shown = rows.slice(0, 8)
  const funnels: FunnelLine[] = []
  for (const row of shown) {
    funnels.push({ id: row.id, name: row.name, stages: await stageNames(base, row.id) })
  }
  return formatFunnelList(funnels, rows.length > 8)
}

async function stageNames(base: string, categoryId: string) {
  const entity = categoryId === '0' ? 'DEAL_STAGE' : `DEAL_STAGE_${categoryId}`
  const loaded = await postJson(base, 'crm.status.list', { filter: { ENTITY_ID: entity } })
  if (loaded.failed) return []
  return records(resultOf(loaded.payload))
    .map((row) => ({ name: field(row, 'NAME', 'name'), sort: Number(field(row, 'SORT', 'sort')) || 0 }))
    .filter((row) => row.name)
    .sort((left, right) => left.sort - right.sort)
    .map((row) => row.name)
}

async function readTasks(base: string, call: Extract<BitrixCall, { action: 'tasks' }>) {
  const page = bitrixMethod(call)
  const cap = call.all ? 100 : 10
  const rows: Record<string, unknown>[] = []
  let total = 0
  let start = 0
  for (let pageIndex = 0; pageIndex < 4 && rows.length < cap; pageIndex += 1) {
    const loaded = await postJson(base, page.method, { ...page.body, start })
    if (loaded.failed) return rows.length > 0 ? formatTaskList(rows.slice(0, cap), total || rows.length) : loaded.failed
    const batch = taskRows(loaded.payload)
    total = payloadNumber(loaded.payload, 'total') || total
    rows.push(...batch)
    const next = payloadNumber(loaded.payload, 'next')
    if (!call.all || next == null || batch.length === 0) break
    start = next
  }
  return formatTaskList(rows.slice(0, cap), total || rows.length)
}

async function readProjects(base: string, query: string) {
  const loaded = await postJson(base, 'sonet_group.get', { ORDER: { NAME: 'ASC' } })
  if (loaded.failed) return loaded.failed
  const rows = records(resultOf(loaded.payload))
  const denied = payloadError(loaded.payload)
  if (denied && rows.length === 0) return denied
  const needle = query.trim()
  if (!needle) return formatProjectList(rows)
  const wanted = normalizeName(needle.replace(/^\d+\.\s*/, ''))
  const id = needle.match(/^(\d+)\b/)?.[1] ?? ''
  const exact = rows.filter((row) => field(row, 'ID', 'id') === id || normalizeName(field(row, 'NAME', 'name')) === wanted)
  const matched = exact.length > 0 ? exact : rows.filter((row) => normalizeName(field(row, 'NAME', 'name')).includes(wanted))
  if (matched.length === 0) return `Проект «${needle}» не нашёлся.`
  if (matched.length > 1) return formatProjectList(matched)
  return readProjectCard(base, matched[0]!)
}

async function readProjectCard(base: string, project: Record<string, unknown>) {
  const id = field(project, 'ID', 'id')
  const name = field(project, 'NAME', 'name') || 'Без названия'
  const [membersLoaded, tasksLoaded, diskLoaded] = await Promise.all([
    postJson(base, 'sonet_group.user.get', { ID: Number(id) }),
    postJson(base, 'tasks.task.list', {
      order: { ID: 'desc' },
      filter: { GROUP_ID: id },
      select: ['ID', 'TITLE', 'STATUS'],
      start: 0,
    }),
    postJson(base, 'disk.storage.getlist', {}),
  ])
  const memberRows = records(resultOf(membersLoaded.payload)).slice(0, 20)
  const memberIds = memberRows.map((row) => field(row, 'USER_ID', 'userId', 'ID', 'id')).filter(Boolean)
  const named = memberIds.length > 0
    ? await postJson(base, 'user.get', { FILTER: { ID: memberIds } })
    : { payload: { result: [] } }
  const people = new Map(records(resultOf(named.payload)).map((row) => [field(row, 'ID', 'id'), [field(row, 'NAME', 'name'), field(row, 'LAST_NAME', 'lastName')].filter(Boolean).join(' ')]))
  const roles: Record<string, string> = { A: 'владелец', E: 'модератор', K: 'участник' }
  const members = memberRows.map((row) => {
    const userId = field(row, 'USER_ID', 'userId', 'ID', 'id')
    const person = people.get(userId) || `сотрудник ${userId}`
    const role = roles[field(row, 'ROLE', 'role').toUpperCase()] ?? ''
    return [person, role].filter(Boolean).join(', ')
  })
  const taskRowsPage = taskRows(tasksLoaded.payload).slice(0, 15)
  const taskTotal = payloadNumber(tasksLoaded.payload, 'total') || taskRowsPage.length
  const taskStatus: Record<string, string> = { '2': 'ждёт', '3': 'выполняется', '4': 'ждёт контроля', '5': 'завершена', '6': 'отложена' }
  const tasks = taskRowsPage.map((row) => {
    const taskId = field(row, 'id', 'ID')
    const title = field(row, 'title', 'TITLE') || 'Без названия'
    const status = taskStatus[field(row, 'status', 'STATUS')] ?? ''
    return [taskId, title, status].filter(Boolean).join('. ')
  })
  const storage = storageRows(diskLoaded.payload).find((item) => normalizeName(item.name) === normalizeName(name))
    ?? storageRows(diskLoaded.payload).find((item) => normalizeName(item.name).includes(normalizeName(name)))
  let files: string[] = []
  if (storage?.rootId) {
    const children = await postJson(base, 'disk.folder.getchildren', { id: storage.rootId })
    if (!children.failed) {
      files = diskItems(resultOf(children.payload), name).slice(0, 15).map((item) => `${item.id}. ${item.name}. ${item.kind === 'folder' ? 'папка' : 'файл'}`)
    }
  }
  return formatProjectCard({ id, name, members, tasks, files, taskTotal })
}

async function readEvents(base: string, query: string) {
  const ownerId = webhookUserId(base)
  const today = new Date()
  const past = query === 'past'
  const planned = query === 'planned'
  const from = bitrixDay(past ? shiftYears(today, -4) : planned ? today : shiftDays(today, -30))
  const to = bitrixDay(past ? today : shiftDays(today, 180))
  const personal = await postJson(base, 'calendar.event.get', { type: 'user', ownerId, from, to })
  const shared = await postJson(base, 'calendar.event.get', { type: 'company_calendar', ownerId: 0, from, to })
  if (personal.failed && shared.failed) return personal.failed
  const rows = [
    ...eventRows(personal.payload, false),
    ...eventRows(shared.payload, true),
  ]
  if (rows.length === 0) {
    const denied = payloadError(personal.payload) || payloadError(shared.payload)
    if (denied) return denied
    return formatEventList([])
  }
  const seen = new Set<string>()
  const unique = rows.filter((row) => {
    const key = `${row.when}\n${row.name}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
  const start = dateValue(`${bitrixDay(today)} 00:00`)
  const shown = (planned ? unique.filter((row) => dateValue(row.when) >= start) : unique)
    .sort((left, right) => dateValue(left.when) - dateValue(right.when))
  return formatEventList(shown)
}

async function deleteTask(base: string, title: string, taskId: string) {
  let id = taskId
  let name = title
  if (!id) {
    const loaded = await postJson(base, 'tasks.task.list', {
      order: { ID: 'desc' },
      filter: { '%TITLE': title },
      select: ['ID', 'TITLE'],
      start: 0,
    })
    if (loaded.failed) return loaded.failed
    const denied = payloadError(loaded.payload)
    const found = taskRows(loaded.payload)
    if (denied && found.length === 0) return denied
    const wanted = normalizeName(title)
    const exact = found.filter((row) => normalizeName(field(row, 'title', 'TITLE')) === wanted)
    const picked = exact.length > 0 ? exact : found.filter((row) => normalizeName(field(row, 'title', 'TITLE')).includes(wanted))
    if (picked.length === 0) return `Задача «${title}» не нашлась.`
    if (picked.length > 1) {
      const lines = picked.slice(0, 5).map((row) => `${field(row, 'id', 'ID')}. ${field(row, 'title', 'TITLE')}`)
      return `Нашлось несколько задач: ${lines.join('; ')}. Назовите номер.`
    }
    id = field(picked[0]!, 'id', 'ID')
    name = field(picked[0]!, 'title', 'TITLE') || title
  }
  if (!id) return `Задача «${title}» не нашлась.`
  const deleted = await postJson(base, 'tasks.task.delete', { taskId: Number(id) })
  if (deleted.failed) return deleted.failed
  const denied = payloadError(deleted.payload)
  if (denied) return denied
  const result = resultOf(deleted.payload)
  if (result == null || result === false) return `Задача «${name}» не удалилась.`
  return `Задача «${name}» удалена, номер ${id}.`
}

async function readBitrixClientsNow(webhook: string) {
  const base = bitrixRestBase(webhook)
  if (!base) return 'Портал не подключён.'
  const [companies, contacts] = await Promise.all([
    postJson(base, 'crm.company.list', { order: { TITLE: 'ASC' }, select: ['ID', 'TITLE'], start: 0 }),
    postJson(base, 'crm.contact.list', { order: { LAST_NAME: 'ASC' }, select: ['ID', 'NAME', 'LAST_NAME'], start: 0 }),
  ])
  if (companies.failed && contacts.failed) return companies.failed
  const companyRows = records(resultOf(companies.payload))
  const contactRows = records(resultOf(contacts.payload))
  const companyTotal = payloadNumber(companies.payload, 'total') || companyRows.length
  const contactTotal = payloadNumber(contacts.payload, 'total') || contactRows.length
  const companyLines = companyRows.slice(0, 15).map((row) => `№${field(row, 'ID', 'id')} ${field(row, 'TITLE', 'title') || 'Без названия'}`)
  const contactLines = contactRows.slice(0, 15).map((row) => {
    const name = [field(row, 'NAME', 'name'), field(row, 'LAST_NAME', 'lastName')].filter(Boolean).join(' ') || 'Без имени'
    return `№${field(row, 'ID', 'id')} ${name}`
  })
  const lines = [
    companyRows.length === 0 ? 'Компаний не нашлось.' : `Компании, всего ${companyTotal}:`,
    ...companyLines,
    companyTotal > companyLines.length ? `Показаны первые ${companyLines.length} из ${companyTotal}.` : '',
    contactRows.length === 0 ? 'Контактов не нашлось.' : `Контакты, всего ${contactTotal}:`,
    ...contactLines,
    contactTotal > contactLines.length ? `Показаны первые ${contactLines.length} из ${contactTotal}.` : '',
  ]
  return scrub(lines.filter(Boolean).join('\n'), base)
}

async function readBitrixOutcomesNow(webhook: string) {
  const base = bitrixRestBase(webhook)
  if (!base) return 'Портал не подключён.'
  const [deals, calls] = await Promise.all([
    postJson(base, 'crm.deal.list', {
      order: { ID: 'DESC' },
      filter: { STAGE_SEMANTIC_ID: 'S' },
      select: ['ID', 'TITLE', 'OPPORTUNITY', 'CURRENCY_ID'],
      start: 0,
    }),
    postJson(base, 'voximplant.statistic.get', { FILTER: { '>CALL_DURATION': 0 }, SORT: 'CALL_START_DATE', ORDER: 'DESC' }),
  ])
  const dealRows = records(resultOf(deals.payload))
  const dealTotal = payloadNumber(deals.payload, 'total') || dealRows.length
  const callTotal = calls.failed ? 0 : payloadNumber(calls.payload, 'total') || records(resultOf(calls.payload)).length
  const dealLines = dealRows.slice(0, 8).map((row) => {
    const amount = Number(field(row, 'OPPORTUNITY', 'opportunity'))
    const currency = field(row, 'CURRENCY_ID', 'currencyId')
    const money = Number.isFinite(amount) && amount > 0
      ? `, ${Number.isInteger(amount) ? String(amount) : String(Math.round(amount * 100) / 100)}${currency ? ` ${currency}` : ''}`
      : ''
    return `№${field(row, 'ID', 'id')} ${field(row, 'TITLE', 'title') || 'Без названия'}${money}`
  })
  const lines = [
    calls.failed ? 'Статистика звонков не открылась.' : `Успешные дозвоны: ${callTotal}. Это звонки, в которых был разговор.`,
    dealRows.length === 0 ? 'Успешно закрытых сделок не нашлось.' : `Успешно закрытые сделки, всего ${dealTotal}:`,
    ...dealLines,
    dealTotal > dealLines.length ? `Показаны первые ${dealLines.length} из ${dealTotal}.` : '',
  ]
  return scrub(lines.filter(Boolean).join('\n'), base)
}

async function deleteBitrixMeetingNow(webhook: string, eventId: string) {
  const base = bitrixRestBase(webhook)
  if (!base || !/^\d+$/.test(eventId)) return 'Назовите номер встречи.'
  const loaded = await postJson(base, 'calendar.event.getbyid', { id: Number(eventId) })
  const result = loaded.failed ? null : resultOf(loaded.payload)
  const row = isRecord(result) ? result : null
  const name = row ? field(row, 'NAME', 'name') : ''
  const removed = await postJson(base, 'calendar.event.delete', { id: Number(eventId) })
  if (removed.failed) return removed.failed
  const denied = payloadError(removed.payload)
  if (denied) return denied
  const label = name ? `«${name}» ` : ''
  return scrub(`Встреча ${label}удалена, номер ${eventId}.`, base)
}

async function locateBitrixMeetingNow(webhook: string, eventId: string) {
  const base = bitrixRestBase(webhook)
  if (!base || !/^\d+$/.test(eventId)) return ''
  const loaded = await postJson(base, 'calendar.event.getbyid', { id: Number(eventId) })
  if (loaded.failed) return ''
  const result = resultOf(loaded.payload)
  const row = isRecord(result) ? result : records(result)[0]
  if (!row) return ''
  const name = field(row, 'NAME', 'name')
  const from = field(row, 'DATE_FROM', 'dateFrom').replace(/:\d{2}$/, '')
  const day = from.match(/\d{2}\.\d{2}\.\d{4}/)?.[0] ?? ''
  if (!name || !day) return ''
  return scrub([
    `Встреча «${name}» стоит в календаре Битрикс24: ${from}, номер ${eventId}.`,
    `Откройте Битрикс24 → Календарь → ${day}. Событие называется «${name}».`,
  ].join('\n'), base)
}

async function createBitrixMeetingNow(
  webhook: string,
  request: Pick<MeetingRequest, 'title' | 'when'> & Partial<Pick<MeetingRequest, 'hour' | 'minute' | 'withPerson' | 'withCompany' | 'person' | 'company' | 'date'>>,
) {
  const base = bitrixRestBase(webhook)
  if (!base) return 'Портал не подключён.'
  const ownerId = webhookUserId(base)
  const day = request.date && /^\d{2}\.\d{2}\.\d{4}$/.test(request.date)
    ? parseBitrixDay(request.date)
    : shiftDays(new Date(), request.when === 'after' ? 2 : request.when === 'tomorrow' ? 1 : 0)
  const hour = request.hour ?? 10
  const minute = request.minute ?? 0
  const span = meetingSpan(day, hour, minute)
  const withPerson = request.withPerson === true
  const withCompany = request.withCompany ?? !withPerson
  const personQuery = (request.person || (withPerson ? request.title : '')).trim()
  const companyQuery = (request.company || (withCompany ? request.title : '')).trim()
  const people = personQuery ? await findPortalPeople(base, personQuery) : []
  const person = people.length === 1 ? people[0] : undefined
  const needle = companyQuery.replace(/^(?:ооо|оао|зао|пао|ип|ао)\s+/iu, '').trim()
  const found = companyQuery
    ? await postJson(base, 'crm.company.list', {
      filter: { '%TITLE': needle || companyQuery },
      select: ['ID', 'TITLE'],
      start: 0,
    })
    : null
  const company = found
    ? records(resultOf(found.payload)).find((row) => normalizeName(field(row, 'TITLE', 'title')).includes(normalizeName(needle)))
    : undefined
  const companyId = company ? field(company, 'ID', 'id') : ''
  const companyName = company ? field(company, 'TITLE', 'title') : ''
  const sections = await postJson(base, 'calendar.section.get', { type: 'user', ownerId })
  const sectionId = field(records(resultOf(sections.payload))[0] ?? {}, 'ID', 'id')
  const firm = companyName || companyQuery
  const name = person && firm
    ? `Встреча: ${person.name}, ${firm}`
    : person
      ? `Встреча: ${person.name}`
      : request.title.toLowerCase().startsWith('встреча')
        ? request.title
        : `Встреча с ${firm || request.title}`
  const attendeeId = person && Number(person.id) !== ownerId ? Number(person.id) : 0
  const description = [
    person ? `Участник: ${person.name}.` : '',
    companyName ? `Компания «${companyName}», номер ${companyId}.` : '',
  ].filter(Boolean).join(' ')
  const added = await postJson(base, 'calendar.event.add', {
    type: 'user',
    ownerId,
    name,
    from: span.from,
    to: span.to,
    ...(sectionId ? { section: Number(sectionId) } : {}),
    ...(attendeeId ? { is_meeting: 'Y', host: ownerId, attendees: [ownerId, attendeeId] } : {}),
    ...(description ? { description } : {}),
  })
  if (added.failed) return added.failed
  const eventId = createdTaskId(resultOf(added.payload)) || field(isRecord(resultOf(added.payload)) ? resultOf(added.payload) as Record<string, unknown> : {}, 'ID', 'id')
  if (!eventId) {
    const denied = payloadError(added.payload)
    return denied || 'Встреча не создалась.'
  }
  const lines = [`Встреча «${name}» создана на ${bitrixDay(day)}, ${span.label}, номер ${eventId}.`]
  if (person) lines.push(`Участник: ${person.name}.`)
  else if (personQuery && people.length > 1) lines.push(`Нашлись несколько сотрудников: ${people.map((item) => item.name).join(', ')}. В приглашение никого не добавила.`)
  else if (personQuery) lines.push(`Сотрудник «${personQuery}» в портале не нашёлся.`)
  if (companyQuery) {
    lines.push(companyName
      ? `Компания «${companyName}» есть в CRM, номер ${companyId}.`
      : `Компании «${companyQuery}» в CRM нет.`)
  }
  return scrub(lines.join(' '), base)
}

async function findPortalPeople(base: string, name: string) {
  const found = new Map<string, { id: string; name: string }>()
  for (const stem of personStems(name)) {
    const loaded = await postJson(base, 'user.search', { FIND: stem })
    if (loaded.failed) continue
    for (const row of records(resultOf(loaded.payload))) {
      const person = {
        id: field(row, 'ID', 'id'),
        name: [field(row, 'NAME', 'name'), field(row, 'LAST_NAME', 'lastName')].filter(Boolean).join(' '),
      }
      if (person.id && person.name && personMatches(name, person.name)) found.set(person.id, person)
    }
    if (found.size > 0) break
  }
  return [...found.values()]
}

function personStems(name: string) {
  const tokens = name.toLowerCase().replaceAll('ё', 'е').split(/\s+/).filter((part) => part.length >= 4)
  const stems = tokens.flatMap((part) => {
    const trimmed = part.replace(/(а|я|у|ю|е|ы|и)$/u, '')
    return trimmed.length >= 4 && trimmed !== part ? [trimmed, part] : [part]
  })
  return [...new Set(stems)].slice(0, 4)
}

function meetingSpan(day: Date, hour: number, minute: number) {
  const endMinutes = hour * 60 + minute + 60
  const endDay = endMinutes >= 24 * 60 ? shiftDays(day, 1) : day
  const endClock = endMinutes % (24 * 60)
  const startLabel = `${padClock(hour)}:${padClock(minute)}`
  const endLabel = `${padClock(Math.floor(endClock / 60))}:${padClock(endClock % 60)}`
  return {
    from: `${bitrixDay(day)} ${startLabel}:00`,
    to: `${bitrixDay(endDay)} ${endLabel}:00`,
    label: `${startLabel}–${endLabel}`,
  }
}

function padClock(value: number) {
  return String(value).padStart(2, '0')
}

function parseBitrixDay(value: string) {
  const [day, month, year] = value.split('.').map(Number)
  return new Date(year ?? 0, (month ?? 1) - 1, day ?? 1)
}

async function createBitrixDocumentNow(webhook: string, request: { title: string; chain: boolean }) {
  const base = bitrixRestBase(webhook)
  if (!base) return 'Портал не подключён.'
  const storages = await postJson(base, 'disk.storage.getlist', {})
  if (storages.failed) return storages.failed
  const rows = records(resultOf(storages.payload))
  const rootId = commonDiskRoot(rows)
  if (!rootId) return scopeHint(storages.payload, 'disk') || 'Общий диск не нашёлся.'
  const safeTitle = request.title.replace(/[\\/:*?"<>|]+/g, ' ').replace(/\s+/g, ' ').trim() || 'Тестовый документ'
  const fileName = /\.[a-z0-9]{2,5}$/i.test(safeTitle) ? safeTitle : `${safeTitle}.txt`
  const uploaded = await postJson(base, 'disk.folder.uploadfile', {
    id: Number(rootId),
    data: { NAME: fileName },
    fileContent: Buffer.from(`Документ «${safeTitle}».\nЕго нужно согласовать.\n`, 'utf8').toString('base64'),
    generateUniqueName: true,
  })
  if (uploaded.failed) return uploaded.failed
  const denied = scopeHint(uploaded.payload, 'disk')
  const file = resultOf(uploaded.payload)
  if (!isRecord(file)) return denied || 'Документ не создался.'
  const fileId = field(file, 'ID', 'id')
  const savedName = field(file, 'NAME', 'name') || fileName
  if (!fileId) return denied || 'Документ не создался.'
  const created = `Документ «${savedName}» создан на общем диске, номер ${fileId}.`
  if (!request.chain) return scrub(created, base)
  const people = await postJson(base, 'user.get', { FILTER: { ACTIVE: true }, sort: 'LAST_NAME', order: 'ASC' })
  if (people.failed) return scrub(`${created}\nСотрудники не открылись, цепочку собрать не удалось.`, base)
  const owner = webhookUserId(base)
  const staff = records(resultOf(people.payload))
    .map((row) => ({
      id: field(row, 'ID', 'id'),
      name: [field(row, 'NAME', 'name'), field(row, 'LAST_NAME', 'lastName')].filter(Boolean).join(' '),
    }))
    .filter((person) => person.id && person.name && person.id !== String(owner))
    .slice(0, 8)
  if (staff.length === 0) return scrub(`${created}\nАктивных сотрудников для согласования не нашлось.`, base)
  const steps: string[] = []
  let previous = ''
  for (const [index, person] of staff.entries()) {
    const added = await postJson(base, 'tasks.task.add', {
      fields: {
        TITLE: `Согласовать: ${safeTitle}`,
        DESCRIPTION: `Шаг ${index + 1} из ${staff.length}. Документ «${savedName}» на общем диске, номер ${fileId}.`,
        RESPONSIBLE_ID: Number(person.id),
        ...(previous ? { DEPENDS_ON: [previous] } : {}),
      },
    })
    if (added.failed) return scrub(`${created}\n${added.failed}`, base)
    const taskId = createdTaskId(resultOf(added.payload))
    if (!taskId) return scrub(`${created}\nЗадача для ${person.name} не создалась.`, base)
    previous = taskId
    steps.push(`- ${person.name} — задача №${taskId}`)
  }
  return scrub([created, 'Цепочка согласования, по очереди:', ...steps].join('\n'), base)
}

function commonDiskRoot(rows: Record<string, unknown>[]) {
  const common = rows.find((row) => field(row, 'ENTITY_TYPE', 'entityType').toLowerCase() === 'common')
  const named = rows.find((row) => /общ/i.test(field(row, 'NAME', 'name')))
  const picked = common ?? named ?? rows[0]
  return picked ? field(picked, 'ROOT_OBJECT_ID', 'rootObjectId') : ''
}

function createdTaskId(result: unknown) {
  if (typeof result === 'number' || typeof result === 'string') return String(result).trim()
  if (!isRecord(result)) return ''
  const task = result.task
  if (isRecord(task)) {
    const id = task.id ?? task.ID
    if (typeof id === 'number' || typeof id === 'string') return String(id).trim()
  }
  const id = result.id ?? result.ID
  return typeof id === 'number' || typeof id === 'string' ? String(id).trim() : ''
}

async function readFileList(base: string, query: string, deep = false) {
  if (normalizeName(query) === 'документы') return readDocuments(base)
  const collected = await collectDisk(base, query ? 21 : 4)
  if (collected.error) return collected.error
  const needle = query.trim()
  if (!needle) return formatDiskList(collected.items.slice(0, 15), collected.items.length > 15)
  const folders = collected.items.filter((item) => folderHit(item, needle))
  if (folders.length === 1) return readFolder(base, folders[0]!, deep)
  if (folders.length === 0) {
    const nested = await findFolderDeeper(base, collected.items.filter((item) => item.kind === 'folder').slice(0, 8), needle)
    if (nested) return readFolder(base, nested, deep)
  }
  const matched = collected.items.filter((item) => normalizeName(item.name).includes(normalizeName(needle.replace(/^\d+\.\s*/, ''))) || item.id === needle)
  if (matched.length === 0) return 'Папка или файл с таким именем на диске не нашлись.'
  return formatDiskList(matched.slice(0, 15), matched.length > 15)
}

async function locateBitrixFile(base: string, query: string): Promise<{ id: string; name: string } | { error: string }> {
  if (/^\d+$/.test(query)) return { id: query, name: query }
  const collected = await collectDisk(base, 21)
  if (collected.error) return { error: collected.error }
  const needle = normalizeName(query)
  const atRoot = collected.items.find((item) => item.kind === 'file' && fileNameHit(item.name, needle))
  if (atRoot) return { id: atRoot.id, name: atRoot.name }
  const nested = await findFileDeeper(base, collected.items.filter((item) => item.kind === 'folder').slice(0, 40), needle, 2)
  if (nested) return nested
  return { error: 'Файл с таким именем на диске не нашёлся.' }
}

async function findFileDeeper(
  base: string,
  folders: DiskItem[],
  needle: string,
  depth: number,
): Promise<{ id: string; name: string } | null> {
  for (const folder of folders) {
    const loaded = await postJson(base, 'disk.folder.getchildren', { id: folder.id })
    if (loaded.failed) continue
    const items = diskItems(resultOf(loaded.payload), folder.name)
    const file = items.find((item) => item.kind === 'file' && fileNameHit(item.name, needle))
    if (file) return { id: file.id, name: file.name }
    if (depth > 1) {
      const deeper = await findFileDeeper(base, items.filter((item) => item.kind === 'folder').slice(0, 8), needle, depth - 1)
      if (deeper) return deeper
    }
  }
  return null
}

function mimeFor(name: string) {
  const ext = name.split('.').pop()?.toLowerCase() ?? ''
  const types: Record<string, string> = {
    pdf: 'application/pdf',
    doc: 'application/msword',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    xls: 'application/vnd.ms-excel',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    txt: 'text/plain',
    csv: 'text/csv',
    zip: 'application/zip',
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    gif: 'image/gif',
    webp: 'image/webp',
  }
  return types[ext] ?? 'application/octet-stream'
}

async function readOneFile(base: string, query: string) {
  const nameOrId = query.trim()
  if (!nameOrId) return 'Нужно имя или номер файла.'
  const prefixed = nameOrId.match(/^(\d+)\.\s+(.+)$/)
  const id = /^\d+$/.test(nameOrId) ? nameOrId : prefixed?.[1] ?? ''
  const name = prefixed?.[2]?.trim() || nameOrId
  if (id) {
    const opened = await readOpenedFile(base, id, name)
    if (opened) return opened
  }
  const located = await locateBitrixFile(base, name.replace(/^\d+\.\s+/, ''))
  if ('error' in located) return located.error
  return (await readOpenedFile(base, located.id, located.name)) ?? 'Файл не открылся.'
}

async function readOpenedFile(base: string, id: string, fallbackName: string) {
  if (/\.(png|jpe?g|gif|webp)$/i.test(fallbackName)) {
    return `Файл «${fallbackName}» — изображение. Его можно прислать в чат.`
  }
  const loaded = await postJson(base, 'disk.file.get', { id })
  if (loaded.failed) return null
  const denied = scopeHint(loaded.payload, 'disk')
  if (denied) return denied
  const row = resultOf(loaded.payload)
  if (!isRecord(row)) return null
  const name = field(row, 'NAME', 'name') || fallbackName
  if (field(row, 'TYPE', 'type').toLowerCase() === 'folder') return null
  if (/\.(png|jpe?g|gif|webp)$/i.test(name)) {
    return `Файл «${name}» — изображение. Его можно прислать в чат.`
  }
  const download = field(row, 'DOWNLOAD_URL', 'downloadUrl')
  if (!download.startsWith('http')) return 'Файл не скачался.'
  const bytes = await downloadBytes(download)
  if (typeof bytes === 'string') return bytes
  try {
    const text = (await readOfficeText(name, bytes)).replace(/\s+\n/g, '\n').trim()
    if (!text) return `В файле «${name}» не нашлось текста.`
    const body = text.length > FILE_TEXT_LIMIT ? `${text.slice(0, FILE_TEXT_LIMIT)}\n…` : text
    return `Файл «${name}»:\n${body}`
  } catch {
    return `Файл «${name}» не удалось прочитать.`
  }
}

async function readFolder(base: string, folder: DiskItem, deep: boolean) {
  const loaded = await postJson(base, 'disk.folder.getchildren', { id: folder.id })
  if (loaded.failed) return loaded.failed
  const denied = scopeHint(loaded.payload, 'disk')
  const items = diskItems(resultOf(loaded.payload), folder.name)
  if (denied && items.length === 0) return denied
  if (items.length === 0) return `В папке «${folder.name}» пусто.`
  const budget = { left: 80, cut: false }
  const children = deep ? await growNodes(base, items, 1, budget) : items.map(diskNode)
  const text = encodeDiskTree(children, `В папке «${displayName(folder.name)}», номер ${folder.id}:`)
  return budget.cut ? `${text}\nПоказана часть дерева.` : text
}

function diskNode(item: DiskItem): DiskNode {
  return { id: item.id, name: displayName(item.name), kind: item.kind }
}

async function readBitrixTreeNow(webhook: string, deep: boolean) {
  const base = bitrixRestBase(webhook)
  if (!base) return 'Портал не подключён.'
  const loaded = await postJson(base, 'disk.storage.getlist', {})
  if (loaded.failed) return loaded.failed
  const rows = records(resultOf(loaded.payload))
  if (rows.length === 0) return scopeHint(loaded.payload, 'disk') || 'Файлов не нашлось.'
  const budget = { left: 300, cut: false }
  const nodes: DiskNode[] = deep
    ? await deepStorageNodes(base, rows, budget)
    : await overviewStorageNodes(base, rows)
  const text = encodeDiskTree(nodes, 'Дерево диска:')
  const withHint = deep ? text : `${text}\n\n${DISK_TREE_OVERVIEW_HINT}`
  return scrub(budget.cut ? `${withHint}\nПоказана часть дерева.` : withHint, base)
}

async function overviewStorageNodes(base: string, rows: Record<string, unknown>[]) {
  return Promise.all(rows.map(async (row) => {
    const rootId = field(row, 'ROOT_OBJECT_ID', 'rootObjectId')
    const [label, children] = await Promise.all([
      diskLabel(base, row),
      rootId ? listLevel(base, rootId) : Promise.resolve([]),
    ])
    return {
      id: rootId || label,
      name: label,
      kind: 'folder' as const,
      children: children.map(diskNode),
    }
  }))
}

async function deepStorageNodes(
  base: string,
  rows: Record<string, unknown>[],
  budget: { left: number; cut: boolean },
) {
  const nodes: DiskNode[] = []
  for (const row of rows) {
    if (budget.left <= 0) {
      budget.cut = true
      break
    }
    const rootId = field(row, 'ROOT_OBJECT_ID', 'rootObjectId')
    const label = await diskLabel(base, row)
    const children = rootId ? await growFolder(base, rootId, 0, budget) : []
    nodes.push({ id: rootId || label, name: label, kind: 'folder', children })
  }
  return nodes
}

async function listLevel(base: string, id: string) {
  const loaded = await postJson(base, 'disk.folder.getchildren', { id })
  if (loaded.failed) return []
  return diskItems(resultOf(loaded.payload), '')
}

async function growFolder(
  base: string,
  id: string,
  depth: number,
  budget: { left: number; cut: boolean },
): Promise<DiskNode[]> {
  if (budget.left <= 0) {
    budget.cut = true
    return []
  }
  const loaded = await postJson(base, 'disk.folder.getchildren', { id })
  if (loaded.failed) return []
  return growNodes(base, diskItems(resultOf(loaded.payload), ''), depth, budget)
}

async function growNodes(
  base: string,
  items: DiskItem[],
  depth: number,
  budget: { left: number; cut: boolean },
): Promise<DiskNode[]> {
  const nodes: DiskNode[] = []
  const folders: Array<{ id: string; node: DiskNode }> = []
  for (const item of items) {
    if (budget.left <= 0) {
      budget.cut = true
      break
    }
    budget.left -= 1
    const node: DiskNode = { id: item.id, name: displayName(item.name), kind: item.kind }
    nodes.push(node)
    if (item.kind === 'folder') folders.push({ id: item.id, node })
  }
  if (depth + 1 >= 5) {
    if (folders.length > 0) budget.cut = true
    return nodes
  }
  for (const folder of folders) {
    if (budget.left <= 0) {
      budget.cut = true
      break
    }
    folder.node.children = await growFolder(base, folder.id, depth + 1, budget)
  }
  return nodes
}

async function findFolderDeeper(base: string, folders: DiskItem[], query: string) {
  for (const folder of folders) {
    const loaded = await postJson(base, 'disk.folder.getchildren', { id: folder.id })
    if (loaded.failed) continue
    const hit = diskItems(resultOf(loaded.payload), folder.name).find((item) => folderHit(item, query))
    if (hit) return hit
  }
  return null
}

async function readDocuments(base: string) {
  const loaded = await postJson(base, 'disk.storage.getlist', {})
  if (loaded.failed) return loaded.failed
  const rows = records(resultOf(loaded.payload))
  if (rows.length === 0) return scopeHint(loaded.payload, 'disk') || 'Документов не нашлось.'
  const storages = await Promise.all(rows.map(async (row) => ({
    rootId: field(row, 'ROOT_OBJECT_ID', 'rootObjectId'),
    name: await diskLabel(base, row),
  })))
  const found: DiskItem[] = []
  const seen = new Set<string>()
  const add = (item: DiskItem) => {
    if (item.kind !== 'file' || !officeFile(item.name) || seen.has(item.id) || found.length >= 30) return
    seen.add(item.id)
    found.push(item)
  }
  await mapPool(storages, 6, async (storage) => {
    if (!storage.rootId || found.length >= 30) return
    const children = await postJson(base, 'disk.folder.getchildren', { id: storage.rootId })
    if (children.failed) return
    const nested: DiskItem[] = []
    for (const item of diskItems(resultOf(children.payload), storage.name)) {
      add(item)
      if (item.kind === 'folder' && normalizeName(item.name).includes('документ')) nested.push(item)
    }
    for (const folder of nested) {
      const inner = await postJson(base, 'disk.folder.getchildren', { id: folder.id })
      if (inner.failed) continue
      for (const child of diskItems(resultOf(inner.payload), folder.name)) add(child)
    }
  })
  if (found.length === 0) return 'Документов не нашлось.'
  const nodes = new Map<string, DiskNode>()
  for (const item of found.slice(0, 30)) {
    const disk = nodes.get(item.storage) ?? { id: item.storage, name: item.storage.split('@').join('@\u200b'), kind: 'folder' as const, children: [] }
    disk.children = [...(disk.children ?? []), diskNode(item)]
    nodes.set(item.storage, disk)
  }
  const text = encodeDiskTree([...nodes.values()], 'Документы:')
  return found.length > 30 ? `${text}\nПоказана часть списка.` : text
}

async function collectDisk(base: string, limit: number) {
  const loaded = await postJson(base, 'disk.storage.getlist', {})
  if (loaded.failed) return { error: loaded.failed, items: [] as DiskItem[] }
  const storages = storageRows(loaded.payload)
  if (storages.length === 0) {
    const hint = scopeHint(loaded.payload, 'disk')
    return { error: hint || 'Файлов не нашлось.', items: [] as DiskItem[] }
  }
  const items: DiskItem[] = []
  for (const storage of storages.slice(0, limit)) {
    if (!storage.rootId) continue
    const children = await postJson(base, 'disk.folder.getchildren', { id: storage.rootId })
    if (children.failed) continue
    items.push(...diskItems(resultOf(children.payload), storage.name))
  }
  return { items }
}

async function mapPool<T>(items: readonly T[], limit: number, run: (item: T) => Promise<void>) {
  let cursor = 0
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const current = items[cursor]
      cursor += 1
      if (current !== undefined) await run(current)
    }
  })
  await Promise.all(workers)
}

function diskItems(result: unknown, storage: string): DiskItem[] {
  return records(result).flatMap((row) => {
    const name = field(row, 'NAME', 'name')
    const id = field(row, 'ID', 'id')
    if (!name || !id) return []
    const kind = field(row, 'TYPE', 'type').toLowerCase() === 'folder' ? 'folder' as const : 'file' as const
    return [{ id, name, kind, storage }]
  })
}

function folderHit(item: DiskItem, query: string) {
  if (item.kind !== 'folder') return false
  const id = query.trim().match(/^(\d+)\b/)?.[1] ?? ''
  if (id && item.id === id) return true
  const wanted = normalizeName(query.replace(/^\d+\.\s*/, ''))
  const name = normalizeName(item.name)
  return Boolean(wanted) && (name === wanted || name.includes(wanted))
}

function officeFile(name: string) {
  return /\.(docx?|xlsx?|pptx?|pdf|csv|txt)$/i.test(name)
}

function normalizeName(value: string) {
  return value.toLowerCase().replace(/[_«»"'.]+/g, ' ').replace(/\s+/g, ' ').trim()
}

function fileNameHit(name: string, needle: string) {
  const current = normalizeName(name)
  return Boolean(needle) && (current === needle || current.includes(needle))
}

function taskRows(payload: unknown) {
  const result = resultOf(payload)
  if (Array.isArray(result)) return result.filter(isRecord)
  if (!isRecord(result)) return []
  const tasks = result.tasks
  if (Array.isArray(tasks)) return tasks.filter(isRecord)
  if (isRecord(tasks)) return Object.values(tasks).filter(isRecord)
  return []
}

function eventRows(payload: unknown, shared: boolean) {
  return records(resultOf(payload)).flatMap((row) => {
    const name = field(row, 'NAME', 'name')
    const when = field(row, 'DATE_FROM', 'dateFrom').replace(/:\d{2}$/, '')
    if (!name || !when) return []
    return [{ name, when, shared }]
  })
}

function payloadNumber(payload: unknown, key: string) {
  if (!isRecord(payload)) return null
  const value = payload[key]
  const number = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : NaN
  return Number.isFinite(number) ? number : null
}

function webhookUserId(base: string) {
  const id = new URL(base).pathname.split('/').filter(Boolean)[1] ?? ''
  return /^\d+$/.test(id) ? Number(id) : 0
}

function bitrixDay(date: Date) {
  const day = String(date.getDate()).padStart(2, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  return `${day}.${month}.${date.getFullYear()}`
}

function shiftYears(date: Date, years: number) {
  const next = new Date(date)
  next.setFullYear(next.getFullYear() + years)
  return next
}

function shiftDays(date: Date, days: number) {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}

function dateValue(value: string) {
  const match = value.match(/(\d{2})\.(\d{2})\.(\d{4})(?:\s+(\d{2}):(\d{2}))?/)
  if (!match) return 0
  return Date.UTC(Number(match[3]), Number(match[2]) - 1, Number(match[1]), Number(match[4] ?? 0), Number(match[5] ?? 0))
}

async function postJson(base: string, method: string, body: Record<string, unknown>) {
  let response: Response
  try {
    response = await fetch(`${base}${method}.json`, {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      redirect: 'manual',
      signal: currentBitrixSignal(),
    })
  } catch (error) {
    if (abortedBitrixRead(error)) throw error
    return { failed: 'Битрикс сейчас не отвечает.' as const }
  }
  if (response.status >= 300 && response.status < 400) return { failed: 'Битрикс сейчас не отвечает.' as const }
  const raw = await response.text()
  try {
    return { payload: JSON.parse(raw) as unknown }
  } catch {
    return { failed: (response.ok ? 'Битрикс вернул пустой ответ.' : 'Битрикс сейчас не отвечает.') as const }
  }
}

async function downloadBytes(url: string) {
  let response: Response
  try {
    response = await fetch(url, { redirect: 'follow', signal: currentBitrixSignal() })
  } catch (error) {
    if (abortedBitrixRead(error)) throw error
    return 'Файл не скачался.'
  }
  if (!response.ok) return 'Файл не скачался.'
  const announced = Number(response.headers.get('content-length') || 0)
  if (announced > FILE_BYTES_LIMIT) return 'Файл слишком большой.'
  const bytes = Buffer.from(await response.arrayBuffer())
  if (bytes.length > FILE_BYTES_LIMIT) return 'Файл слишком большой.'
  return bytes
}

function funnelRows(payload: unknown) {
  const source = resultOf(payload)
  const rows = records(source, 'categories')
  return rows
    .map((row) => ({ id: field(row, 'id', 'ID'), name: field(row, 'name', 'NAME') || 'Общая' }))
    .filter((row) => row.id)
}

function storageRows(payload: unknown) {
  return records(resultOf(payload)).map((row) => ({
    name: field(row, 'NAME', 'name') || 'Диск',
    rootId: field(row, 'ROOT_OBJECT_ID', 'rootObjectId'),
  }))
}

function scopeHint(payload: unknown, kind: 'disk' | 'crm') {
  const error = payloadError(payload)
  if (!error) return ''
  const raw = typeof payload === 'object' && payload ? JSON.stringify(payload) : ''
  if (/insufficient_scope|ACCESS_DENIED|NO_AUTH|authorization|scope/i.test(`${error} ${raw}`)) {
    return kind === 'disk'
      ? 'К файлам нет доступа. Во входящем вебхуке нужно право «Диск».'
      : 'К воронкам нет доступа. Во входящем вебхуке нужно право CRM.'
  }
  return error
}

function payloadError(payload: unknown) {
  if (!isRecord(payload)) return ''
  if (typeof payload.error !== 'string' || !payload.error.trim()) return ''
  const detail = typeof payload.error_description === 'string' ? payload.error_description : payload.error
  const text = detail.replace(/https?:\/\/\S+/gi, '').replace(/\s+/g, ' ').trim().slice(0, 240)
  return text ? `Битрикс отказал: ${text}` : 'Битрикс отказал в запросе.'
}

function resultOf(payload: unknown) {
  if (!isRecord(payload)) return payload
  return 'result' in payload ? payload.result : payload
}

function records(result: unknown, nested?: string) {
  if (Array.isArray(result)) return result.filter(isRecord)
  if (!isRecord(result)) return []
  const value = nested ? result[nested] : result
  if (Array.isArray(value)) return value.filter(isRecord)
  if (nested && isRecord(value)) return Object.values(value).filter(isRecord)
  return []
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function field(row: Record<string, unknown>, ...names: string[]) {
  for (const name of names) {
    const value = row[name]
    if (typeof value === 'string' && value.trim()) return value.trim()
    if (typeof value === 'number' && Number.isFinite(value)) return String(value)
  }
  return ''
}

function scrub(text: string, base: string, keepLinks = false) {
  const code = new URL(base).pathname.split('/').filter(Boolean)[2] ?? ''
  const hidden = code ? text.split(code).join('') : text
  const withoutLinks = keepLinks ? hidden : hidden.replace(/https?:\/\/\S+/gi, '')
  return withoutLinks.replace(/[ \t]+\n/g, '\n').replace(/[ \t]{2,}/g, ' ').trim()
}
