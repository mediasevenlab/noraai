import { expect, test } from 'bun:test'

import {
  bitrixMethod,
  bitrixPrefetch,
  bitrixReads,
  clientAsk,
  contentAsk,
  documentRequest,
  meetingPlaceReply,
  meetingRequest,
  meetingsAsk,
  meetingToDelete,
  personMatches,
  spreadsheetAsk,
  outcomeAsk,
  downloadAsk,
  encodeDiskTree,
  placeAsk,
  treeAsk,
  treeDeep,
  fileTarget,
  fileTargetInThread,
  folderHint,
  projectHint,
  formatBitrixRaw,
  formatBitrixPayload,
  formatDiskList,
  formatFunnelList,
  formatTaskList,
  readBitrixCall,
  taskToDelete,
} from './bitrix'

test('a question about tasks reads tasks and does not create one', () => {
  expect(bitrixReads('Какие у меня задачи?')).toEqual(['tasks'])
  expect(bitrixReads('Создай задачу проверить отчёт')).toEqual([])
  expect(bitrixReads('Что в битриксе?')).toEqual(['tasks', 'deals'])
  expect(bitrixReads('Разбери процессы продаж')).toEqual(['deals'])
  expect(bitrixReads('Какие воронки есть?')).toEqual(['funnels'])
  expect(bitrixReads('Покажи файлы на диске')).toEqual(['files'])
  expect(bitrixReads('Открой Договор.pdf')).toEqual(['file'])
  expect(bitrixPrefetch('Какие лиды в работе?').some((call) => call.action === 'call' && call.method === 'crm.lead.list')).toBe(true)
  expect(readBitrixCall({ name: 'bitrix', arguments: '{"action":"call","method":"crm.lead.list","params":{"start":0}}' })).toEqual({
    action: 'call',
    method: 'crm.lead.list',
    params: { start: 0 },
  })
  expect(readBitrixCall({ name: 'bitrix', arguments: '{"action":"call","method":"https://evil.test"}' })).toEqual({
    error: 'Нужно имя метода Битрикса, например crm.lead.list.',
  })
  expect(formatBitrixRaw({ result: { DOWNLOAD_URL: 'https://portal.test/rest/10/secret/file', TITLE: 'Договор' } })).toContain('скрыто')
  expect(formatBitrixRaw({ result: { DOWNLOAD_URL: 'https://portal.test/rest/10/secret/file', TITLE: 'Договор' } })).not.toContain('secret')
})

test('a bitrix call keeps only a named action', () => {
  expect(readBitrixCall({ name: 'web_search', arguments: '{}' })).toBeNull()
  expect(readBitrixCall({ name: 'bitrix', arguments: '{"action":"drop"}' })).toEqual({
    error: 'Такого действия в Битриксе нет.',
  })
  expect(readBitrixCall({ name: 'bitrix', arguments: '{"action":"create_task"}' })).toEqual({
    error: 'Нужно название задачи.',
  })
  expect(readBitrixCall({ name: 'bitrix', arguments: '{"action":"comment_task","taskId":"15"}' })).toEqual({
    error: 'Нужны номер задачи и текст комментария.',
  })
  expect(readBitrixCall({
    name: 'bitrix',
    arguments: '{"action":"create_task","title":"Проверить отчёт","text":"до вечера","responsibleId":"10"}',
  })).toEqual({
    action: 'create_task',
    title: 'Проверить отчёт',
    text: 'до вечера',
    responsibleId: '10',
  })
})

test('task rows stay in their columns and a created task reports its number', () => {
  const listed = formatBitrixPayload(
    { action: 'tasks', query: '' },
    { result: { tasks: [{ id: '15', title: 'Проверить отчёт', status: '3', responsibleId: '10' }] } },
  )
  expect(listed).toContain('1. 15. Проверить отчёт. выполняется. ответственный 10')
  const created = formatBitrixPayload(
    { action: 'create_task', title: 'Проверить отчёт', text: '', responsibleId: '' },
    { result: { task: { id: '77' } } },
  )
  expect(created).toBe('Задача «Проверить отчёт» создана, номер 77.')
  const refused = formatBitrixPayload(
    { action: 'users', query: '' },
    { error: 'insufficient_scope', error_description: 'Denied https://portal.test/rest/10/secret/user.get' },
  )
  expect(refused).toContain('Битрикс отказал')
  expect(refused).not.toContain('secret')
  expect(bitrixMethod({ action: 'tasks', query: 'отчёт' }).method).toBe('tasks.task.list')
  expect(bitrixMethod({ action: 'deals', query: '2' }).body).toMatchObject({ filter: { CATEGORY_ID: '2' } })
  expect(formatFunnelList([{ id: '0', name: 'Общая', stages: ['Новая', 'Счёт'] }])).toContain('0. Общая. стадии: Новая, Счёт')
  const diskList = formatDiskList([{ id: '10', name: 'Договор.pdf', kind: 'file', storage: 'Общий диск' }])
  expect(diskList).toContain('№10 Договор.pdf — файл — Общий диск')
  expect(diskList).not.toMatch(/^\d+\. /m)
  expect(readBitrixCall({ name: 'bitrix', arguments: '{"action":"file"}' })).toEqual({
    error: 'Нужно имя или номер файла.',
  })
  expect(taskToDelete('удали Тестовая задача 5')).toEqual({ title: 'Тестовая задача 5', taskId: '' })
  expect(taskToDelete('удали задачу 296')).toEqual({ title: '', taskId: '296' })
  expect(bitrixPrefetch('удали Тестовая задача 5')).toEqual([{ action: 'delete_task', title: 'Тестовая задача 5', taskId: '' }])
  expect(bitrixPrefetch('покажи все задачи').some((call) => call.action === 'tasks' && call.all === true)).toBe(true)
  expect(bitrixPrefetch('Какие у меня задачи?').some((call) => call.action === 'tasks' && call.all)).toBe(false)
  expect(bitrixPrefetch('какие есть проекты?').find((call) => call.action === 'projects')).toMatchObject({ query: '' })
  expect(projectHint('что конкретно есть в проекте РШП 2024')).toBe('РШП 2024')
  expect(downloadAsk('дай этот файл для скачивания')).toBe(true)
  expect(downloadAsk('дай содержимое файла')).toBe(false)
  expect(placeAsk('где расположен этот документ?')).toBe(true)
  expect(placeAsk('Где найти эти встречи?')).toBe(false)
  expect(placeAsk('что есть в документах?')).toBe(false)
  expect(contentAsk('напиши содержимое этого файла')).toBe(true)
  expect(contentAsk('что внутри папки Мои документы')).toBe(false)
  expect(folderHint('напиши содержимое этого файла')).toBe('')
  expect(folderHint('Создай тестовый документ и цепочку согласования')).toBe('')
  expect(documentRequest('Создай тестовый документ и цепочку согласования нашими сотрудниками')).toEqual({ title: 'Тестовый документ', chain: true })
  expect(documentRequest('что есть в документах')).toBeNull()
  expect(clientAsk('дай список наших клиентов')).toBe(true)
  expect(clientAsk('Построй таблицу Функционал для клиентов..xlsx')).toBe(false)
  expect(spreadsheetAsk('Построй таблицу Функционал для клиентов..xlsx')).toBe('Функционал для клиентов..xlsx')
  expect(spreadsheetAsk('построй таблицу')).toBe('')
  expect(outcomeAsk('у нас есть успешные дозвоны или успешные заключенные договора?')).toBe(true)
  expect(meetingRequest('создай на завтра встречу с ООО Ромашка')).toEqual({
    title: 'ООО Ромашка',
    person: '',
    company: 'ООО Ромашка',
    when: 'tomorrow',
    date: '',
    hour: 10,
    minute: 0,
    withPerson: false,
    withCompany: true,
  })
  expect(meetingRequest('запланируй встречу для дмитрия резанова на завтра на 12 часов')).toEqual({
    title: 'дмитрия резанова',
    person: 'дмитрия резанова',
    company: '',
    when: 'tomorrow',
    date: '',
    hour: 12,
    minute: 0,
    withPerson: true,
    withCompany: false,
  })
  expect(meetingRequest('создай на завтра встречу для Резанова Дмитрия с ООО ромашка на 12 часов дня')).toEqual({
    title: 'Резанова Дмитрия',
    person: 'Резанова Дмитрия',
    company: 'ООО ромашка',
    when: 'tomorrow',
    date: '',
    hour: 12,
    minute: 0,
    withPerson: true,
    withCompany: true,
  })
  expect(meetingRequest('Создай встречу с ООО Hjvfirf на 5 ноября 2026 года для Резанова Дмитрия')).toEqual({
    title: 'Резанова Дмитрия',
    person: 'Резанова Дмитрия',
    company: 'ООО Hjvfirf',
    when: 'today',
    date: '05.11.2026',
    hour: 10,
    minute: 0,
    withPerson: true,
    withCompany: true,
  })
  expect(meetingRequest('Какие запланированные встречи есть?')).toBeNull()
  expect(meetingsAsk('удали эту встречу')).toBe(false)
  expect(meetingToDelete([
    { role: 'assistant', text: 'Встреча «Встреча с ООО Hjvfirf» создана на 03.11.2026, 05:00–06:00, номер 3750.' },
    { role: 'user', text: 'удали эту встречу' },
  ])).toEqual({ id: '3750', name: 'Встреча с ООО Hjvfirf' })
  expect(meetingsAsk('Какие запланированные встречи есть?')).toBe(true)
  expect(meetingsAsk('создай на завтра встречу с ООО Ромашка')).toBe(false)
  expect(meetingRequest('где ее найти?')).toBeNull()
  expect(personMatches('дмитрия резанова', 'Дмитрий Резанов')).toBe(true)
  expect(personMatches('Резанова Дмитрия', 'Дмитрий Резанов')).toBe(true)
  expect(personMatches('дмитрия резанова', 'Игорь Ивлев')).toBe(false)
  expect(meetingPlaceReply([
    { role: 'user', text: 'запланируй встречу для дмитрия резанова на завтра на 12 часов' },
    { role: 'assistant', text: 'Встреча «Встреча с Дмитрием Резановым» создана на 04.11.2026, 12:00–13:00, номер 3740. Участник: Дмитрий Резанов.' },
    { role: 'user', text: 'где ее найти?' },
  ])).toContain('Календарь → 04.11.2026')
  expect(documentRequest('создай на завтра встречу с ООО Ромашка')).toBeNull()
  expect(treeAsk('построй дерево диска')).toBe(true)
  expect(treeDeep('дай дерево диска')).toBe(false)
  expect(treeDeep('покажи дерево со всеми вложениями')).toBe(true)
  expect(treeDeep('подробнее о задаче')).toBe(false)
  expect(folderHint('что внутри папки Мои документы со всеми вложениями')).toBe('Мои документы')
  const tree = encodeDiskTree([
    { id: '1', name: 'Диск «Роман»', kind: 'folder', children: [
      { id: '284', name: 'РШП 2024', kind: 'folder', children: [
        { id: '294', name: 'Список.docx', kind: 'file' },
      ] },
    ] },
  ])
  expect(tree).toContain('```nora-disk')
  expect(tree).toContain('"id":"294"')
  expect(tree).toContain('"name":"Список.docx"')
  expect(tree).not.toContain('→')
  expect(fileTarget('Файл 294 — это «Список недостающих моделей.docx»')).toBe('Список недостающих моделей.docx')
  expect(fileTargetInThread([
    'Файл 294 — это «Список недостающих моделей.docx»',
    'дай этот файл для скачивания',
  ])).toBe('Список недостающих моделей.docx')
  expect(bitrixPrefetch('что конкретно есть в проекте РШП 2024').find((call) => call.action === 'projects')).toMatchObject({ query: 'РШП 2024' })
  expect(bitrixPrefetch('какие события уже прошли?').some((call) => call.action === 'events' && call.query === 'past')).toBe(true)
  expect(folderHint('что находится в 284. РШП 2024')).toBe('284. РШП 2024')
  expect(folderHint('что есть в 284. РШП 2024')).toBe('284. РШП 2024')
  expect(folderHint('что внутри папки Мои документы')).toBe('Мои документы')
  expect(bitrixPrefetch('что есть в документах?').find((call) => call.action === 'files')).toMatchObject({ query: 'документы' })
  expect(formatTaskList(
    [{ id: '15', title: 'Первая' }, { id: '16', title: 'Вторая' }],
    64,
  )).toContain('Показаны первые 2 из 64.')
})
