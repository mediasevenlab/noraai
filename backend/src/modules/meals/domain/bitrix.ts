export const NORA_BITRIX_TOOL = {
  type: 'function' as const,
  function: {
    name: 'bitrix',
    description:
      'Читает портал Битрикс24. files с именем папки в query открывает эту папку. projects — проекты, events — события календаря. delete_task удаляет задачу только когда человек прямо попросил. call — любой другой метод REST.',
    parameters: {
      type: 'object',
      properties: {
        action: {
          type: 'string',
          enum: ['users', 'tasks', 'deals', 'funnels', 'files', 'file', 'projects', 'events', 'call', 'create_task', 'comment_task', 'delete_task'],
          description:
            'users — сотрудники, tasks — задачи, deals — сделки, funnels — воронки, files — диск или содержимое папки, file — текст файла, projects — проекты, имя проекта в query открывает его задачи, файлы и участников, events — события, call — любой другой метод REST, create_task — новая задача, comment_task — комментарий, delete_task — удалить задачу',
        },
        method: { type: 'string', description: 'Для action call: имя метода, например crm.lead.list или calendar.event.get.' },
        params: { type: 'object', description: 'Для action call: параметры метода. Пустой объект, если параметров нет.' },
        query: { type: 'string', description: 'Часть имени или названия. Для сделок воронки передай номер воронки. Для файла — имя или номер.' },
        title: { type: 'string', description: 'Название новой задачи' },
        text: { type: 'string', description: 'Описание задачи или текст комментария' },
        taskId: { type: 'string', description: 'Номер задачи для комментария' },
        responsibleId: { type: 'string', description: 'Номер сотрудника, если его назвали' },
      },
      required: ['action'],
    },
  },
}

export const BITRIX_READY_RULE =
  'Кнопка Битрикса включена. Если ниже есть блок «Данные Битрикса», отвечай по нему и не выдумывай данные портала. Если этого блока нет или нужен другой раздел, вызови инструмент bitrix. Папку открывай действием files и передавай её имя в query, даже если имя было в предыдущей реплике. Список проектов — действие projects. Что внутри одного проекта — тоже projects, и имя проекта передай в query. События календаря — events. Если человек спрашивает, где встреча из предыдущей реплики, назови раздел «Календарь», дату, название и номер из неё. Не пиши, что доступа к календарю нет. Для лидов, контактов, компаний, чатов, групп, бизнес-процессов, роботов, отделов, товаров, списков, звонков и всего остального используй action call: method — имя метода REST, params — объект параметров. Имена для чтения: crm.lead.list, crm.contact.list, crm.company.list, crm.activity.list, crm.quote.list, crm.product.list, im.recent.get, sonet_group.user.groups, bizproc.workflow.template.list, department.get, lists.get, voximplant.statistic.get, timeman.status, sale.order.list. Карточку по номеру бери методом с тем же началом и .get. create_task, comment_task, file, delete_task и любой метод, который создаёт, меняет или удаляет, вызывай только когда человек в этом сообщении прямо об этом просит. Если в блоке уже написано, что задача удалена и указан номер, повтори это: её удалили этим запросом. Не пиши, что её удаляли раньше. Подтверди только то, что вернул инструмент. Назови номер. Адрес портала не упоминай.'

export const BITRIX_MISSING_RULE =
  'Кнопка Битрикса включена, но портал не подключён. Скажи это коротко и не выдумывай сотрудников, задачи и сделки.'

const ACTIONS = ['users', 'tasks', 'deals', 'funnels', 'files', 'file', 'projects', 'events', 'call', 'create_task', 'comment_task', 'delete_task'] as const
const REST_METHOD = /^[a-z][a-z0-9]*(\.[a-z0-9_]+){1,6}$/i

export type BitrixRead = 'users' | 'tasks' | 'deals' | 'funnels' | 'files' | 'file'

export type BitrixCall =
  | { action: BitrixRead; query: string; all?: boolean; deep?: boolean }
  | { action: 'projects'; query: string }
  | { action: 'events'; query: string }
  | { action: 'call'; method: string; params: Record<string, unknown> }
  | { action: 'create_task'; title: string; text: string; responsibleId: string }
  | { action: 'comment_task'; taskId: string; text: string }
  | { action: 'delete_task'; title: string; taskId: string }

export type FunnelLine = { id: string; name: string; stages: string[] }

export type DiskItem = { id: string; name: string; kind: 'file' | 'folder'; storage: string }

export type DiskNode = { id: string; name: string; kind: 'file' | 'folder'; children?: DiskNode[] }

const TASK_STATUS: Record<string, string> = {
  '2': 'ждёт',
  '3': 'выполняется',
  '4': 'ждёт контроля',
  '5': 'завершена',
  '6': 'отложена',
}

export function bitrixReads(text: string): BitrixRead[] {
  const value = text.toLowerCase()
  const wants = new Set<BitrixRead>()
  if (/сотрудник|пользовател|коллег/.test(value)) wants.add('users')
  if (/задач/.test(value) && !/созда|добав|постав/.test(value)) wants.add('tasks')
  if (/сделк|процесс/.test(value)) wants.add('deals')
  if (/воронк/.test(value)) wants.add('funnels')
  if (/файл|диск|документ/.test(value) && !namedFile(value)) wants.add('files')
  if (namedFile(value)) wants.add('file')
  if (wants.size === 0 && /битрикс/.test(value) && !/созда|коммент/.test(value)) {
    wants.add('tasks')
    wants.add('deals')
  }
  return [...wants]
}

export function bitrixPrefetch(text: string): BitrixCall[] {
  const removal = taskToDelete(text)
  if (removal) return [{ action: 'delete_task', title: removal.title, taskId: removal.taskId }]
  if (documentRequest(text)) return []
  const value = text.toLowerCase()
  const reads = bitrixReads(text)
  const hinted = folderHint(text)
  if (hinted && !reads.includes('files') && !reads.includes('file')) reads.push('files')
  const allTasks = wantsAllTasks(value)
  const calls: BitrixCall[] = reads.map((action) => ({
    action,
    query: action === 'file' ? namedFile(text) : action === 'files' ? hinted : '',
    ...(action === 'tasks' && allTasks ? { all: true } : {}),
  }))
  if (/проект/.test(value)) calls.push({ action: 'projects', query: projectHint(text) })
  if (/событ|календар|встреч/.test(value) && !meetingRequest(text)) {
    calls.push({ action: 'events', query: /прошл|уже |прошед/.test(value) ? 'past' : 'planned' })
  }
  const extras: Array<[RegExp, string, Record<string, unknown>]> = [
    [/лид/, 'crm.lead.list', { order: { ID: 'DESC' }, select: ['ID', 'TITLE', 'STATUS_ID', 'NAME', 'LAST_NAME'], start: 0 }],
    [/контакт/, 'crm.contact.list', { order: { ID: 'DESC' }, select: ['ID', 'NAME', 'LAST_NAME'], start: 0 }],
    [/компан/, 'crm.company.list', { order: { ID: 'DESC' }, select: ['ID', 'TITLE'], start: 0 }],
    [/чат|диалог/, 'im.recent.get', {}],
    [/групп/, 'sonet_group.user.groups', {}],
    [/бизнес-процесс|робот|шаблон процесса/, 'bizproc.workflow.template.list', {}],
    [/отдел/, 'department.get', {}],
    [/списк/, 'lists.get', { IBLOCK_TYPE_ID: 'lists' }],
    [/товар|каталог/, 'crm.product.list', { order: { ID: 'DESC' }, select: ['ID', 'NAME', 'PRICE'], start: 0 }],
    [/звонк|телефон/, 'voximplant.statistic.get', {}],
    [/рабочий день|учёт времени|учет времени/, 'timeman.status', {}],
  ]
  for (const [pattern, method, params] of extras) {
    if (pattern.test(value)) calls.push({ action: 'call', method, params })
  }
  return calls.slice(0, 4)
}

export function taskToDelete(text: string) {
  const value = text.trim()
  if (!/удал|сотри|убери/.test(value.toLowerCase()) || !/задач/.test(value.toLowerCase())) return null
  const quoted = value.match(/[«"]([^»"]+)[»"]/)
  if (quoted?.[1]?.trim()) return { title: quoted[1].trim(), taskId: '' }
  let rest = value.replace(/.*(?:удали\w*|сотри|убери)\s+/i, '').trim()
  rest = rest.replace(/^(?:задачу|задача|задачи|задач)\s+/i, '').replace(/[?!.]+$/g, '').trim()
  if (/^\d+$/.test(rest)) return { title: '', taskId: rest }
  if (!rest) return null
  return { title: rest, taskId: '' }
}

export function projectHint(text: string) {
  const cleaned = text.replace(/[?!.]+$/g, '').trim()
  const named = cleaned.match(/(?:в проекте|о проекте|проект[аеу]?)\s+(.+)$/i)
  const name = named?.[1]?.replace(/^[«"]/, '').replace(/[»"]$/, '').trim() ?? ''
  if (!name || /^(?:есть|компании|портала)$/i.test(name)) return ''
  return name
}

export function clientAsk(text: string) {
  const value = text.toLowerCase()
  if (/созда|добав|встреч|удал/.test(value)) return false
  if (spreadsheetAsk(text)) return false
  if (/\.(?:xlsx|xls|csv|docx|pdf)\b/i.test(value)) return false
  return /клиент/.test(value)
}

export function spreadsheetAsk(text: string) {
  const cleaned = text.replace(/[?!.]+$/g, '').trim()
  if (!/(?:построй|извлеки|выведи|покажи|отобраз|нарисуй)/i.test(cleaned) || !/таблиц/i.test(cleaned)) return ''
  const rest = cleaned
    .replace(/^(?:построй|извлеки|выведи|покажи|отобраз|нарисуй)\s+таблиц\p{L}*(?:\s+из)?(?:\s+файл\p{L}*)?\s+/iu, '')
    .replace(/^[«"]|[»"]$/g, '')
    .trim()
  if (!/\.(?:xlsx|xls|csv)$/i.test(rest)) return ''
  return rest.slice(0, 180)
}

export function outcomeAsk(text: string) {
  const value = text.toLowerCase()
  return /дозвон|договор|заключ|успешн\p{L}*\s+сделк/iu.test(value)
}

const MONTHS = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря']

export type MeetingRequest = {
  title: string
  person: string
  company: string
  when: 'today' | 'tomorrow' | 'after'
  date: string
  hour: number
  minute: number
  withPerson: boolean
  withCompany: boolean
}

export function meetingRequest(text: string): MeetingRequest | null {
  const value = text.toLowerCase().replaceAll('ё', 'е')
  if (!/встреч/.test(value) || !/созда|постав|назнач|добав|запланиру/.test(value)) return null
  if (/какие|список|покаж|удал|сотри|убери/.test(value)) return null
  const when = /послезавтра/.test(value) ? 'after' as const : /завтра/.test(value) ? 'tomorrow' as const : 'today' as const
  const clock = value.match(new RegExp(`(?:^|\\s)(?:в|на)\\s+(\\d{1,2})(?:[:.](\\d{2}))?(?!\\d)(?!\\s*(?:${MONTHS.join('|')}))`))
  let hour = 10
  let minute = 0
  if (clock?.[1]) {
    const parsedHour = Number(clock[1])
    const parsedMinute = clock[2] ? Number(clock[2]) : 0
    if (parsedHour >= 0 && parsedHour <= 23 && parsedMinute >= 0 && parsedMinute <= 59) {
      hour = parsedHour
      minute = parsedMinute
    }
  }
  const guest = readGuests(text)
  return {
    title: (guest.person || guest.company || 'Встреча').slice(0, 120),
    person: guest.person.slice(0, 120),
    company: guest.company.slice(0, 120),
    when,
    date: meetingDay(text),
    hour,
    minute,
    withPerson: Boolean(guest.person),
    withCompany: Boolean(guest.company),
  }
}

export function meetingsAsk(text: string) {
  const value = text.toLowerCase()
  if (/удал|сотри|убери/.test(value)) return false
  if (meetingRequest(text) || meetingPlaceAsk(text)) return false
  return /встреч/i.test(text)
}

export function meetingToDelete(messages: readonly { role: string; text: string }[]) {
  const last = messages.at(-1)
  if (!last || last.role !== 'user') return null
  const value = last.text.toLowerCase().replaceAll('ё', 'е')
  if (!/удал|сотри|убери/.test(value) || !/встреч/.test(value)) return null
  const named = last.text.match(/номер\s+(\d{2,})/i)?.[1] ?? ''
  if (named) return { id: named, name: '' }
  for (let index = messages.length - 2; index >= 0; index -= 1) {
    const message = messages[index]
    if (message?.role !== 'assistant') continue
    const created = meetingCreatedNote(message.text)
    if (created) return { id: created.id, name: created.name }
  }
  return { id: '', name: '' }
}

function readGuests(text: string) {
  const company = text.match(/(?:^|\s)с\s+((?:ооо|оао|зао|пао|ип|ао)\s+\S+)/iu)?.[1]?.replace(/[.,]+$/g, '').trim() ?? ''
  const tail = text.match(/(?:^|\s)для\s+(.+)$/iu)?.[1] ?? ''
  const words: string[] = []
  for (const word of tail.split(/\s+/)) {
    const clean = word.replace(/[.,]+$/g, '')
    if (!clean || /^(?:с|на|в|и|от|по)$/iu.test(clean) || /^(?:ооо|оао|зао|пао|ип|ао)$/iu.test(clean) || /^\d/.test(clean)) break
    if (MONTHS.includes(clean.toLowerCase().replaceAll('ё', 'е'))) break
    words.push(clean)
    if (words.length === 3) break
  }
  return { person: words.join(' '), company }
}

function meetingDay(text: string) {
  const match = text.toLowerCase().replaceAll('ё', 'е').match(new RegExp(`(\\d{1,2})\\s+(${MONTHS.join('|')})(?:\\s+(\\d{4}))?`))
  if (!match?.[1] || !match[2]) return ''
  const day = Number(match[1])
  const month = MONTHS.indexOf(match[2]) + 1
  if (day < 1 || day > 31 || month < 1) return ''
  const today = new Date()
  let year = match[3] ? Number(match[3]) : today.getFullYear()
  if (!match[3]) {
    const candidate = new Date(year, month - 1, day)
    const start = new Date(today.getFullYear(), today.getMonth(), today.getDate())
    if (candidate < start) year += 1
  }
  return `${String(day).padStart(2, '0')}.${String(month).padStart(2, '0')}.${year}`
}

export function personMatches(query: string, fullName: string) {
  const parts = query.toLowerCase().replaceAll('ё', 'е').split(/\s+/).filter((part) => part.length >= 3)
  const names = fullName.toLowerCase().replaceAll('ё', 'е').split(/\s+/).filter(Boolean)
  if (parts.length === 0 || names.length === 0) return false
  return parts.every((part) => names.some((name) => sameNameToken(part, name)))
}

function sameNameToken(left: string, right: string) {
  if (left === right) return true
  const size = Math.min(5, left.length, right.length)
  return size >= 4 && left.slice(0, size) === right.slice(0, size)
}

export function meetingPlaceAsk(text: string) {
  const value = text.toLowerCase().replaceAll('ё', 'е')
  if (/где/.test(value) && /встреч/.test(value)) return true
  return /где\s+ее\s+найти|как\s+ее\s+найти|где\s+посмотреть|в каком календаре|где\s+искать/.test(value)
}

export function meetingPlaceReply(messages: readonly { role: string; text: string }[]) {
  const found = meetingPlaceTarget(messages)
  if (!found) return ''
  return [
    `Встреча «${found.name}» уже стоит в календаре Битрикс24: ${found.day}, ${found.time}, номер ${found.id}.`,
    `Откройте Битрикс24 → Календарь → ${found.day}. Событие называется «${found.name}».`,
  ].join('\n')
}

export function meetingPlaceTarget(messages: readonly { role: string; text: string }[]) {
  const last = messages.at(-1)
  if (!last || last.role !== 'user' || !meetingPlaceAsk(last.text)) return null
  const prior = [...messages].slice(0, -1).reverse().find((message) => message.role === 'assistant')
  return prior ? meetingCreatedNote(prior.text) : null
}

function meetingCreatedNote(text: string) {
  const match = text.match(/Встреча «([^»]+)» создана на (\d{2}\.\d{2}\.\d{4}), (\d{2}:\d{2}[–-]\d{2}:\d{2}), номер (\d+)/)
  if (!match?.[1] || !match[2] || !match[3] || !match[4]) return null
  return { name: match[1], day: match[2], time: match[3], id: match[4] }
}

export function documentRequest(text: string) {
  const value = text.toLowerCase()
  if (/удал|сотри|убери/.test(value)) return null
  const creating = /созда|добав|сделай|подготов/.test(value)
  const chain = /согласован|цепочк/.test(value)
  if (!creating || !/документ/.test(value)) return null
  const quoted = text.match(/[«"]([^»"]+)[»"]/)
  const title = quoted?.[1]?.trim() || 'Тестовый документ'
  return { title: title.slice(0, 120), chain }
}

export function folderHint(text: string) {
  const cleaned = text.replace(/[?!.]+$/g, '').trim()
  if (documentRequest(cleaned)) return ''
  if (/документ/.test(cleaned.toLowerCase()) && !namedFile(cleaned) && !/папк/.test(cleaned.toLowerCase())) return 'документы'
  const inside = cleaned.match(/(?:находится в|содержимое(?:\s+папки)?|что есть в|что внутри|в папке)\s+(.+)$/i)
  if (!inside?.[1]?.trim()) return ''
  const hint = inside[1]
    .trim()
    .replace(/^(?:папк\p{L}*)\s+/iu, '')
    .replace(/\s+(?:со всеми вложениями|со всеми файлами|и все вложения|подробно)$/iu, '')
    .trim()
  if (/файл/i.test(hint) && !/папк/i.test(hint)) return ''
  return hint
}

export function treeDeep(text: string) {
  return /всеми вложен|всеми файл|разверн\p{L}*(?:\s+\S+){0,3}\s+вложен|полн\p{L}*\s+дерев|подробн\p{L}*\s+дерев/iu.test(text)
}

export const DISK_TREE_OVERVIEW_HINT =
  'Это общее дерево, без файлов внутри папок. Напишите «покажи дерево со всеми вложениями», чтобы раскрыть их.'

export function contentAsk(text: string) {
  const value = text.toLowerCase()
  if (/скач/.test(value)) return false
  if (/папк/.test(value) && !/файл/.test(value)) return false
  return /содержим|прочитай|что написано|текст файла/.test(value)
}

export function treeAsk(text: string) {
  return /дерев/.test(text.toLowerCase())
}

export function wantsAllTasks(text: string) {
  return /все\s+задач|полн\p{L}*\s+список|остальн\p{L}*\s+задач/iu.test(text)
}

export function readBitrixCall(call: { name: string; arguments: string }): BitrixCall | { error: string } | null {
  if (call.name !== 'bitrix') return null
  let parsed: {
    action?: unknown
    query?: unknown
    title?: unknown
    text?: unknown
    taskId?: unknown
    responsibleId?: unknown
    method?: unknown
    params?: unknown
  }
  try {
    parsed = JSON.parse(call.arguments) as typeof parsed
  } catch {
    return { error: 'Не разобрала запрос к Битриксу.' }
  }
  const action = typeof parsed.action === 'string' ? parsed.action : ''
  if (!ACTIONS.includes(action as (typeof ACTIONS)[number])) return { error: 'Такого действия в Битриксе нет.' }
  const query = clip(parsed.query, 80)
  const title = clip(parsed.title, 200)
  const text = clip(parsed.text, 2000)
  const taskId = digits(parsed.taskId)
  const responsibleId = digits(parsed.responsibleId)
  if (action === 'create_task') {
    if (!title) return { error: 'Нужно название задачи.' }
    return { action, title, text, responsibleId }
  }
  if (action === 'comment_task') {
    if (!taskId || !text) return { error: 'Нужны номер задачи и текст комментария.' }
    return { action, taskId, text }
  }
  if (action === 'delete_task') {
    const named = title || query
    if (!named && !taskId) return { error: 'Нужно название или номер задачи.' }
    return { action, title: named, taskId }
  }
  if (action === 'projects') return { action, query }
  if (action === 'events') return { action, query: /прошл|уже |прошед/.test(query.toLowerCase()) ? 'past' : '' }
  if (action === 'call') {
    const called = bitrixCallMethod(parsed.method, parsed.params)
    if ('error' in called) return called
    return { action, method: called.method, params: called.params }
  }
  if (action === 'file') {
    const named = query || namedFile(title) || namedFile(text)
    if (!named && !taskId) return { error: 'Нужно имя или номер файла.' }
    return { action, query: named || taskId }
  }
  return { action: action as BitrixRead, query }
}

const FILE_EXT = 'pdf|docx|xlsx|xls|txt|doc|csv|zip|png|jpe?g|webp'

export function namedFile(text: string) {
  const match = text.match(/[^\s«»"']+\.(pdf|docx|xlsx|xls|txt|doc|csv|png|jpe?g|webp)/i)
  return match?.[0]?.replace(/[),.;:]+$/, '') ?? ''
}

export function downloadAsk(text: string) {
  const value = text.toLowerCase()
  if (/содержим|прочитай|открой/.test(value) && !/скач/.test(value)) return false
  return /скач|для скачивания|прикрепи|отправь файл|дай этот файл|сам файл|файл для/.test(value)
}

export function placeAsk(text: string) {
  if (meetingPlaceAsk(text)) return false
  return /где\s+(?:(?:он|она|этот|эта|это)\s+)?(?:располож|лежит|наход)|в какой папке|путь к файл|путь к документ|где найти/i.test(text)
}

export function fileTarget(text: string) {
  const quoted = text.match(new RegExp(`[«"]([^»"]+?\\.(?:${FILE_EXT}))[»"]`, 'i'))
  if (quoted?.[1]?.trim()) return quoted[1].trim()
  const named = namedFile(text)
  if (named) return named
  const stripped = text.replace(/.*(?:скачай|скачать|прикрепи|отправь файл|дай файл|дай)\s+/i, '')
  const loose = stripped.match(new RegExp(`([\\p{L}\\d][\\p{L}\\d ._()\\-]{0,80}\\.(?:${FILE_EXT}))`, 'iu'))
  if (loose?.[1]?.trim()) return loose[1].trim()
  return text.match(/файл\w*\s+(\d{2,})\b/i)?.[1] ?? ''
}

export function fileTargetInThread(texts: readonly string[]) {
  for (let index = texts.length - 1; index >= 0; index -= 1) {
    const found = fileTarget(texts[index] ?? '')
    if (found) return found
  }
  return ''
}

export function bitrixMethod(call: BitrixCall) {
  if (call.action === 'users') {
    if (call.query) return { method: 'user.search', body: { FIND: call.query } }
    return { method: 'user.get', body: { FILTER: { ACTIVE: 'Y' }, sort: 'LAST_NAME', order: 'ASC' } }
  }
  if (call.action === 'tasks') {
    return {
      method: 'tasks.task.list',
      body: {
        order: { ID: 'desc' },
        filter: call.query ? { '%TITLE': call.query } : {},
        select: ['ID', 'TITLE', 'STATUS', 'RESPONSIBLE_ID'],
        start: 0,
      },
    }
  }
  if (call.action === 'deals') {
    return {
      method: 'crm.deal.list',
      body: {
        order: { ID: 'DESC' },
        filter: dealFilter(call.query),
        select: ['ID', 'TITLE', 'STAGE_ID', 'CATEGORY_ID', 'OPPORTUNITY', 'CURRENCY_ID'],
        start: 0,
      },
    }
  }
  if (call.action === 'call') return { method: call.method, body: call.params }
  if (call.action === 'projects') return { method: 'sonet_group.get', body: { ORDER: { NAME: 'ASC' } } }
  if (call.action === 'events') return { method: 'calendar.event.get', body: {} }
  if (call.action === 'delete_task') return { method: 'tasks.task.delete', body: call.taskId ? { taskId: Number(call.taskId) } : {} }
  if (call.action === 'funnels') return { method: 'crm.category.list', body: { entityTypeId: 2 } }
  if (call.action === 'files') return { method: 'disk.storage.getlist', body: {} }
  if (call.action === 'file') {
    return { method: 'disk.file.get', body: /^\d+$/.test(call.query) ? { id: call.query } : {} }
  }
  if (call.action === 'create_task') {
    return {
      method: 'tasks.task.add',
      body: {
        fields: {
          TITLE: call.title,
          ...(call.text ? { DESCRIPTION: call.text } : {}),
          ...(call.responsibleId ? { RESPONSIBLE_ID: call.responsibleId } : {}),
        },
      },
    }
  }
  return {
    method: 'task.commentitem.add',
    body: { TASKID: call.taskId, FIELDS: { POST_MESSAGE: call.text } },
  }
}

export function formatBitrixPayload(call: BitrixCall, payload: unknown) {
  if (!payload || typeof payload !== 'object') return 'Битрикс вернул пустой ответ.'
  const record = payload as { error?: unknown; error_description?: unknown; result?: unknown }
  if (typeof record.error === 'string' && record.error.trim()) {
    const detail = typeof record.error_description === 'string' ? record.error_description : record.error
    const text = publicText(detail)
    return text ? `Битрикс отказал: ${text}` : 'Битрикс отказал в запросе.'
  }
  if (call.action === 'users') return formatUsers(record.result)
  if (call.action === 'tasks') return formatTasks(record.result)
  if (call.action === 'deals') return formatDeals(record.result)
  if (call.action === 'call') return formatBitrixRaw(payload)
  if (call.action === 'funnels' || call.action === 'files' || call.action === 'file' || call.action === 'projects' || call.action === 'events' || call.action === 'delete_task') {
    return 'Этот ответ собирается отдельно.'
  }
  if (call.action === 'create_task') {
    if (record.result == null) return 'Задача не сохранилась.'
    const id = createdTaskId(record.result)
    return id ? `Задача «${call.title}» создана, номер ${id}.` : 'Задача создана, но номер не пришёл.'
  }
  if (record.result == null) return 'Комментарий не сохранился.'
  return `Комментарий добавлен к задаче ${call.taskId}.`
}

export function portalReached(text: string) {
  return text !== 'Битрикс сейчас не отвечает.' && text !== 'Портал не подключён.'
}

function formatUsers(result: unknown) {
  const rows = records(result).slice(0, 15)
  if (rows.length === 0) return 'Сотрудников не нашлось.'
  const lines = rows.map((row, index) => {
    const name = [field(row, 'NAME', 'name'), field(row, 'LAST_NAME', 'lastName')].filter(Boolean).join(' ')
    const id = field(row, 'ID', 'id')
    const position = field(row, 'WORK_POSITION', 'workPosition')
    return `${index + 1}. ${[name || 'Без имени', id, position].filter(Boolean).join(', ')}`
  })
  return ['Сотрудники:', ...lines, rows.length === 15 ? 'Показаны первые 15.' : ''].filter(Boolean).join('\n')
}

function formatTasks(result: unknown) {
  const rows = records(result, 'tasks')
  return formatTaskList(rows.slice(0, 10), rows.length)
}

export function formatTaskList(rows: readonly Record<string, unknown>[], total = rows.length) {
  if (rows.length === 0) return 'Задач не нашлось.'
  const lines = rows.map((row, index) => {
    const id = field(row, 'id', 'ID')
    const title = field(row, 'title', 'TITLE') || 'Без названия'
    const status = TASK_STATUS[field(row, 'status', 'STATUS')] ?? ''
    const owner = field(row, 'responsibleId', 'RESPONSIBLE_ID')
    const tail = [status, owner ? `ответственный ${owner}` : ''].filter(Boolean).join('. ')
    return `${index + 1}. ${id}. ${title}${tail ? `. ${tail}` : ''}`
  })
  const more = total > rows.length ? `Показаны первые ${rows.length} из ${total}.` : ''
  return ['Задачи:', ...lines, more].filter(Boolean).join('\n')
}

export function formatProjectCard(card: {
  id: string
  name: string
  members: readonly string[]
  tasks: readonly string[]
  files: readonly string[]
  taskTotal?: number
}) {
  const members = card.members.length
    ? ['Участники:', ...card.members.map((member, index) => `${index + 1}. ${member}`)]
    : ['Участников не нашлось.']
  const tasks = card.tasks.length
    ? ['Задачи проекта:', ...card.tasks.map((task, index) => `${index + 1}. ${task}`)]
    : ['Задач в этом проекте не нашлось.']
  const more = card.taskTotal && card.taskTotal > card.tasks.length ? [`Показаны первые ${card.tasks.length} из ${card.taskTotal}.`] : []
  const files = card.files.length
    ? ['Файлы проекта:', ...card.files.map((file, index) => `${index + 1}. ${file}`)]
    : ['Файлов в этом проекте не нашлось.']
  return [`Проект «${card.name}», номер ${card.id}.`, ...members, ...tasks, ...more, ...files].join('\n')
}

export function formatProjectList(rows: readonly Record<string, unknown>[]) {
  if (rows.length === 0) return 'Проектов не нашлось.'
  const shown = rows.slice(0, 30)
  const lines = shown.map((row, index) => {
    const id = field(row, 'ID', 'id')
    const name = field(row, 'NAME', 'name') || 'Без названия'
    const closed = field(row, 'CLOSED', 'closed') === 'Y' ? 'закрыт' : ''
    return `${index + 1}. ${[id, name, closed].filter(Boolean).join('. ')}`
  })
  return ['Проекты:', ...lines, rows.length > shown.length ? 'Показаны первые 30.' : ''].filter(Boolean).join('\n')
}

export function formatEventList(rows: readonly { name: string; when: string; shared?: boolean }[]) {
  if (rows.length === 0) return 'Событий за этот срок не нашлось.'
  const shown = rows.slice(0, 40)
  const lines = shown.map((row, index) => {
    const where = row.shared ? 'общий календарь' : ''
    return `${index + 1}. ${[row.when, row.name, where].filter(Boolean).join('. ')}`
  })
  return ['События:', ...lines, rows.length > shown.length ? 'Показаны первые 40.' : ''].filter(Boolean).join('\n')
}

function formatDeals(result: unknown) {
  const rows = records(result).slice(0, 10)
  if (rows.length === 0) return 'Сделок не нашлось.'
  const lines = rows.map((row, index) => {
    const id = field(row, 'ID', 'id')
    const title = field(row, 'TITLE', 'title') || 'Без названия'
    const stage = field(row, 'STAGE_ID', 'stageId')
    const category = field(row, 'CATEGORY_ID', 'categoryId')
    const money = [field(row, 'OPPORTUNITY', 'opportunity'), field(row, 'CURRENCY_ID', 'currencyId')].filter(Boolean).join(' ')
    return `${index + 1}. ${id}. ${[title, stage, category ? `воронка ${category}` : '', money].filter(Boolean).join('. ')}`
  })
  return ['Сделки:', ...lines, records(result).length > 10 ? 'Показаны первые 10.' : ''].filter(Boolean).join('\n')
}

function createdTaskId(result: unknown) {
  if (typeof result === 'number' || typeof result === 'string') return String(result).trim()
  if (!result || typeof result !== 'object' || !('task' in result)) return ''
  const task = (result as { task?: { id?: unknown } }).task
  if (!task) return ''
  return typeof task.id === 'number' || typeof task.id === 'string' ? String(task.id).trim() : ''
}

function records(result: unknown, nested?: string) {
  if (Array.isArray(result)) return result.filter(isRecord)
  if (!isRecord(result)) return []
  const value = nested ? result[nested] : result
  if (Array.isArray(value)) return value.filter(isRecord)
  if (nested && isRecord(value)) return Object.values(value).filter(isRecord)
  for (const key of ['tasks', 'users', 'deals']) {
    const item = result[key]
    if (Array.isArray(item)) return item.filter(isRecord)
    if (isRecord(item)) return Object.values(item).filter(isRecord)
  }
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

export function formatFunnelList(funnels: readonly FunnelLine[], more = false) {
  if (funnels.length === 0) return 'Воронок не нашлось.'
  const lines = funnels.map((funnel, index) => {
    const stages = funnel.stages.slice(0, 8).join(', ')
    return `${index + 1}. ${funnel.id}. ${funnel.name}${stages ? `. стадии: ${stages}` : ''}`
  })
  return ['Воронки:', ...lines, more ? 'Показаны первые 8.' : ''].filter(Boolean).join('\n')
}

export function encodeDiskTree(nodes: readonly DiskNode[], heading = 'Дерево диска:') {
  const slim = (node: DiskNode): DiskNode => {
    const next: DiskNode = { id: node.id, name: node.name, kind: node.kind }
    if (node.children && node.children.length > 0) next.children = node.children.map(slim)
    return next
  }
  return [heading, '', '```nora-disk', JSON.stringify({ nodes: nodes.map(slim) }), '```'].join('\n')
}

export function formatDiskList(items: readonly DiskItem[], more = false, heading = 'Файлы:') {
  if (items.length === 0) return 'Файлов не нашлось.'
  const lines = items.map((item) => {
    const kind = item.kind === 'folder' ? 'папка' : 'файл'
    const place = item.storage ? ` — ${item.storage.split('@').join('@\u200b')}` : ''
    return `№${item.id} ${item.name} — ${kind}${place}`
  })
  const cap = heading === 'Файлы:' ? 'Показаны первые 15.' : 'Показаны первые 30.'
  return [heading, ...lines, more ? cap : ''].filter(Boolean).join('\n')
}

export function bitrixCallMethod(method: unknown, params: unknown) {
  const name = typeof method === 'string' ? method.trim() : ''
  if (!REST_METHOD.test(name)) return { error: 'Нужно имя метода Битрикса, например crm.lead.list.' }
  let body = params
  if (typeof body === 'string' && body.trim()) {
    try {
      body = JSON.parse(body) as unknown
    } catch {
      return { error: 'Параметры метода должны быть объектом.' }
    }
  }
  if (body == null) body = {}
  if (!body || typeof body !== 'object' || Array.isArray(body)) return { error: 'Параметры метода должны быть объектом.' }
  if (JSON.stringify(body).length > 8000) return { error: 'Слишком большой запрос к Битриксу.' }
  return { method: name, params: body as Record<string, unknown> }
}

export function formatBitrixRaw(payload: unknown) {
  if (!payload || typeof payload !== 'object') return 'Битрикс вернул пустой ответ.'
  const record = payload as { error?: unknown; error_description?: unknown; result?: unknown }
  if (typeof record.error === 'string' && record.error.trim()) {
    const detail = typeof record.error_description === 'string' ? record.error_description : record.error
    const text = publicText(detail)
    return text ? `Битрикс отказал: ${text}` : 'Битрикс отказал в запросе.'
  }
  const text = JSON.stringify(shrinkBitrixValue(record.result ?? null), null, 1)
  return text.length > 8000 ? `${text.slice(0, 8000)}\n…` : text
}

function shrinkBitrixValue(value: unknown, depth = 0): unknown {
  if (depth > 4) return '…'
  if (Array.isArray(value)) {
    const items = value.slice(0, 20).map((item) => shrinkBitrixValue(item, depth + 1))
    if (value.length > 20) items.push(`… ещё ${value.length - 20}`)
    return items
  }
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {}
    for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
      out[key] = /download|token|password|secret|webhook|auth/i.test(key) ? 'скрыто' : shrinkBitrixValue(item, depth + 1)
    }
    return out
  }
  if (typeof value === 'string') {
    const clean = value.replace(/https?:\/\/\S*\/rest\/\S*/gi, '').trim()
    return clean.length > 400 ? `${clean.slice(0, 400)}…` : clean
  }
  return value
}

function dealFilter(query: string) {
  if (!query) return {}
  if (/^\d+$/.test(query)) return { CATEGORY_ID: query }
  return { '%TITLE': query }
}

function clip(value: unknown, max: number) {
  return typeof value === 'string' ? value.trim().slice(0, max) : ''
}

function digits(value: unknown) {
  const text = clip(value, 12)
  return /^\d+$/.test(text) ? text : ''
}

function publicText(value: string) {
  return value.replace(/https?:\/\/\S+/gi, '').replace(/\s+/g, ' ').trim().slice(0, 240)
}
