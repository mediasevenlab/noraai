import { expect, test } from 'bun:test'

import { askBitrix, createBitrixDocument, createBitrixMeeting, locateBitrixMeeting, placeBitrixFile, readBitrixClients, readBitrixOutcomes, readBitrixTree, takeBitrixFile } from './bitrix-client'

const webhook = 'https://portal.test/rest/10/secret/'

test('a funnel question returns names and stages without the webhook code', async () => {
  const original = globalThis.fetch
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input)
    if (url.endsWith('/crm.category.list.json')) {
      return json({ result: { categories: [{ id: 0, name: 'Общая' }, { id: 2, name: 'Поставки' }] } })
    }
    if (url.endsWith('/crm.status.list.json')) {
      const body = JSON.parse(String(init?.body ?? '{}')) as {
        filter?: { ENTITY_ID?: string }
      }
      const name = body.filter?.ENTITY_ID === 'DEAL_STAGE_2' ? 'Отгрузка' : 'Новая'
      return json({ result: [{ NAME: name, SORT: '10' }] })
    }
    return json({ error: 'unexpected' })
  }) as typeof fetch
  try {
    const text = await askBitrix(webhook, { action: 'funnels', query: '' })
    expect(text).toContain('0. Общая. стадии: Новая')
    expect(text).toContain('2. Поставки. стадии: Отгрузка')
    expect(text).not.toContain('secret')
  } finally {
    globalThis.fetch = original
  }
})

test('a missing disk right is said in plain words', async () => {
  const original = globalThis.fetch
  globalThis.fetch = (async () =>
    json({ error: 'insufficient_scope', error_description: 'Need disk https://portal.test/rest/10/secret/disk' })) as typeof fetch
  try {
    const text = await askBitrix(webhook, { action: 'files', query: '' })
    expect(text).toContain('право «Диск»')
    expect(text).not.toContain('secret')
  } finally {
    globalThis.fetch = original
  }
})

test('a named file is read and the download address stays out of the answer', async () => {
  const original = globalThis.fetch
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    const url = String(input)
    if (url.endsWith('/disk.storage.getlist.json')) {
      return json({ result: [{ ID: '1', NAME: 'Общий диск', ROOT_OBJECT_ID: '3' }] })
    }
    if (url.endsWith('/disk.folder.getchildren.json')) {
      return json({ result: [{ ID: '10', NAME: 'Договор.txt', TYPE: 'file' }] })
    }
    if (url.endsWith('/disk.file.get.json')) {
      return json({ result: { ID: '10', NAME: 'Договор.txt', DOWNLOAD_URL: 'https://files.test/10/secret/download' } })
    }
    if (url.startsWith('https://files.test/')) {
      return new Response('Срок поставки четыре недели.', { status: 200 })
    }
    return json({ error: 'unexpected' })
  }) as typeof fetch
  try {
    const text = await askBitrix(webhook, { action: 'file', query: 'Договор.txt' })
    expect(text).toContain('Срок поставки четыре недели.')
    expect(text).not.toContain('secret')
    expect(text).not.toContain('files.test')
  } finally {
    globalThis.fetch = original
  }
})

test('stopping the request cancels the portal call', async () => {
  const original = globalThis.fetch
  const controller = new AbortController()
  globalThis.fetch = (async (_input: RequestInfo | URL, init?: RequestInit) => {
    return await new Promise((_resolve, reject) => {
      const fail = () => {
        const error = new Error('The operation was aborted.')
        error.name = 'AbortError'
        reject(error)
      }
      if (init?.signal?.aborted) fail()
      else init?.signal?.addEventListener('abort', fail, { once: true })
      controller.abort()
    })
  }) as typeof fetch
  try {
    await expect(askBitrix(webhook, { action: 'users', query: '' }, controller.signal)).rejects.toThrow()
  } finally {
    globalThis.fetch = original
  }
})

test('a named file can be taken for download without the webhook address', async () => {
  const original = globalThis.fetch
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    const url = String(input)
    if (url.endsWith('/disk.storage.getlist.json')) {
      return json({ result: [{ ID: '1', NAME: 'Общий диск', ROOT_OBJECT_ID: '3' }] })
    }
    if (url.endsWith('/disk.folder.getchildren.json')) {
      return json({ result: [{ ID: '10', NAME: 'Договор.txt', TYPE: 'file' }] })
    }
    if (url.endsWith('/disk.file.get.json')) {
      return json({ result: { ID: '10', NAME: 'Договор.txt', DOWNLOAD_URL: 'https://files.test/10/secret/download' } })
    }
    if (url.startsWith('https://files.test/')) return new Response('текст договора', { status: 200 })
    return json({ error: 'unexpected' })
  }) as typeof fetch
  try {
    const taken = await takeBitrixFile(webhook, 'Договор.txt')
    expect('bytes' in taken).toBe(true)
    if ('bytes' in taken) {
      expect(taken.name).toBe('Договор.txt')
      expect(taken.bytes.toString()).toBe('текст договора')
      expect(taken.mime).toBe('text/plain')
    }
    expect(JSON.stringify(taken)).not.toContain('secret')
  } finally {
    globalThis.fetch = original
  }
})

test('a file location is the disk and the folders above it', async () => {
  const original = globalThis.fetch
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input)
    const body = JSON.parse(String(init?.body ?? '{}')) as { id?: number | string; ID?: number | string }
    if (url.endsWith('/disk.storage.getlist.json')) {
      return json({ result: [{ ID: '4', NAME: 'lulikina93@gmail.com', ROOT_OBJECT_ID: '90', ENTITY_TYPE: 'user', ENTITY_ID: '7' }] })
    }
    if (url.endsWith('/disk.folder.getchildren.json')) {
      return json({ result: [{ ID: '180', NAME: 'Список на допуск.xlsx', TYPE: 'file' }] })
    }
    if (url.endsWith('/disk.file.get.json')) {
      return json({ result: { ID: '180', NAME: 'Список на допуск.xlsx', STORAGE_ID: '4', PARENT_ID: '96' } })
    }
    if (url.endsWith('/disk.storage.get.json')) {
      return json({ result: { ID: '4', NAME: 'lulikina93@gmail.com', ROOT_OBJECT_ID: '90', ENTITY_TYPE: 'user', ENTITY_ID: '7' } })
    }
    if (url.endsWith('/user.get.json')) {
      return json({ result: [{ ID: '7', NAME: 'Анна', LAST_NAME: 'Люликина' }] })
    }
    if (url.endsWith('/disk.folder.get.json') && String(body.id) === '96') {
      return json({ result: { ID: '96', NAME: 'Мои документы', PARENT_ID: '90' } })
    }
    return json({ error: 'unexpected' })
  }) as typeof fetch
  try {
    const text = await placeBitrixFile(webhook, 'Список на допуск.xlsx')
    expect(text).toContain('номер 180')
    expect(text).toContain('Путь в Битриксе: Диск «Анна Люликина» / Мои документы / Список на допуск.xlsx')
    expect(text).not.toContain('gmail.com')
    expect(text).not.toContain('secret')
  } finally {
    globalThis.fetch = original
  }
})

test('a file inside a folder can be read by its name', async () => {
  const original = globalThis.fetch
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input)
    const body = JSON.parse(String(init?.body ?? '{}')) as { id?: number | string }
    if (url.endsWith('/disk.storage.getlist.json')) {
      return json({ result: [{ ID: '1', NAME: 'Роман', ROOT_OBJECT_ID: '1' }] })
    }
    if (url.endsWith('/disk.folder.getchildren.json') && String(body.id) === '1') {
      return json({ result: [{ ID: '284', NAME: 'РШП 2024', TYPE: 'folder' }] })
    }
    if (url.endsWith('/disk.folder.getchildren.json') && String(body.id) === '284') {
      return json({ result: [{ ID: '294', NAME: 'Список недостающих моделей.docx', TYPE: 'file' }] })
    }
    if (url.endsWith('/disk.file.get.json')) {
      return json({ result: { ID: '294', NAME: 'Список недостающих моделей.txt', DOWNLOAD_URL: 'https://files.test/294/secret/download' } })
    }
    if (url.startsWith('https://files.test/')) return new Response('кабина машиниста', { status: 200 })
    return json({ error: 'unexpected' })
  }) as typeof fetch
  try {
    const text = await askBitrix(webhook, { action: 'file', query: 'Список недостающих моделей.docx' })
    expect(text).toContain('кабина машиниста')
    expect(text).not.toContain('не нашёлся')
    expect(text).not.toContain('secret')
  } finally {
    globalThis.fetch = original
  }
})

test('a numbered file name opens that file without a disk search', async () => {
  const original = globalThis.fetch
  const calls: string[] = []
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    const url = String(input)
    calls.push(url)
    if (url.endsWith('/disk.file.get.json')) {
      return json({ result: { ID: '294', NAME: 'Список недостающих моделей.txt', TYPE: 'file', DOWNLOAD_URL: 'https://files.test/294/secret/download' } })
    }
    if (url.startsWith('https://files.test/')) return new Response('кабина машиниста', { status: 200 })
    return json({ error: 'unexpected' })
  }) as typeof fetch
  try {
    const text = await askBitrix(webhook, { action: 'file', query: '294. Список недостающих моделей.docx' })
    expect(text).toContain('кабина машиниста')
    expect(calls.some((url) => url.includes('disk.storage.getlist'))).toBe(false)
    expect(text).not.toContain('secret')
  } finally {
    globalThis.fetch = original
  }
})

test('a disk tree includes files inside folders', async () => {
  const original = globalThis.fetch
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input)
    const body = JSON.parse(String(init?.body ?? '{}')) as { id?: number | string }
    if (url.endsWith('/disk.storage.getlist.json')) {
      return json({ result: [{ ID: '1', NAME: 'Роман', ROOT_OBJECT_ID: '1' }] })
    }
    if (String(body.id) === '1') {
      return json({ result: [{ ID: '284', NAME: 'РШП 2024', TYPE: 'folder' }, { ID: '96', NAME: 'Мои документы', TYPE: 'folder' }] })
    }
    if (String(body.id) === '284') {
      return json({ result: [{ ID: '294', NAME: 'Список.docx', TYPE: 'file' }, { ID: '382', NAME: 'Загруженные файлы', TYPE: 'folder' }] })
    }
    if (String(body.id) === '382') return json({ result: [{ ID: '400', NAME: 'Frame.png', TYPE: 'file' }] })
    if (String(body.id) === '96') return json({ result: [{ ID: '272', NAME: 'Бюджет.xlsx', TYPE: 'file' }] })
    return json({ error: 'unexpected' })
  }) as typeof fetch
  try {
    const overview = await readBitrixTree(webhook)
    expect(overview).toContain('```nora-disk')
    expect(overview).toContain('Диск «Роман»')
    expect(overview).toContain('РШП 2024')
    expect(overview).toContain('общее дерево')
    expect(overview).not.toContain('Frame.png')
    expect(overview).not.toContain('secret')
    const text = await readBitrixTree(webhook, undefined, true)
    expect(text).toContain('Диск «Роман»')
    expect(text).toContain('РШП 2024')
    expect(text).toContain('Список.docx')
    expect(text).toContain('Frame.png')
    expect(text).toContain('Бюджет.xlsx')
    expect(text.indexOf('РШП 2024')).toBeLessThan(text.indexOf('Frame.png'))
    expect(text).not.toContain('общее дерево')
    expect(text).not.toContain('secret')
  } finally {
    globalThis.fetch = original
  }
})

test('a named folder is opened and its files are listed', async () => {
  const original = globalThis.fetch
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input)
    const body = JSON.parse(String(init?.body ?? '{}')) as { id?: number | string }
    if (url.endsWith('/disk.storage.getlist.json')) {
      return json({ result: [{ ID: '1', NAME: 'Роман', ROOT_OBJECT_ID: '1' }] })
    }
    if (url.endsWith('/disk.folder.getchildren.json') && String(body.id) === '1') {
      return json({ result: [{ ID: '284', NAME: 'РШП 2024', TYPE: 'folder' }] })
    }
    if (url.endsWith('/disk.folder.getchildren.json') && String(body.id) === '284') {
      return json({ result: [{ ID: '294', NAME: 'Список.docx', TYPE: 'file' }] })
    }
    return json({ error: 'unexpected' })
  }) as typeof fetch
  try {
    const text = await askBitrix(webhook, { action: 'files', query: '284. РШП 2024' })
    expect(text).toContain('В папке «РШП 2024», номер 284')
    expect(text).toContain('Список.docx')
    expect(text).not.toContain('secret')
  } finally {
    globalThis.fetch = original
  }
})

test('a folder inside another folder still opens', async () => {
  const original = globalThis.fetch
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input)
    const body = JSON.parse(String(init?.body ?? '{}')) as { id?: number | string }
    if (url.endsWith('/disk.storage.getlist.json')) {
      return json({ result: [{ ID: '1', NAME: 'Роман', ROOT_OBJECT_ID: '1' }] })
    }
    if (String(body.id) === '1') return json({ result: [{ ID: '284', NAME: 'РШП 2024', TYPE: 'folder' }] })
    if (String(body.id) === '284') return json({ result: [{ ID: '382', NAME: 'Загруженные файлы', TYPE: 'folder' }] })
    if (String(body.id) === '382') return json({ result: [{ ID: '400', NAME: 'Frame.png', TYPE: 'file' }] })
    return json({ error: 'unexpected' })
  }) as typeof fetch
  try {
    const text = await askBitrix(webhook, { action: 'files', query: '382 Загруженные файлы' })
    expect(text).toContain('В папке «Загруженные файлы», номер 382')
    expect(text).toContain('Frame.png')
  } finally {
    globalThis.fetch = original
  }
})

test('a folder with a decorated name still opens', async () => {
  const original = globalThis.fetch
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input)
    const body = JSON.parse(String(init?.body ?? '{}')) as { id?: number | string }
    if (url.endsWith('/disk.storage.getlist.json')) {
      return json({ result: [{ ID: '3', NAME: 'Общий диск', ROOT_OBJECT_ID: '3' }] })
    }
    if (String(body.id) === '3') return json({ result: [{ ID: '252', NAME: 'ООО _Смарт Контрол_', TYPE: 'folder' }] })
    if (String(body.id) === '252') return json({ result: [{ ID: '9', NAME: 'Заявление.docx', TYPE: 'file' }] })
    return json({ error: 'unexpected' })
  }) as typeof fetch
  try {
    const text = await askBitrix(webhook, { action: 'files', query: 'ООО Смарт Контрол' })
    expect(text).toContain('Заявление.docx')
  } finally {
    globalThis.fetch = original
  }
})

test('documents are the office files, including a folder named documents', async () => {
  const original = globalThis.fetch
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input)
    const body = JSON.parse(String(init?.body ?? '{}')) as { id?: number | string }
    if (url.endsWith('/disk.storage.getlist.json')) {
      return json({ result: [{ ID: '36', NAME: 'РШП', ROOT_OBJECT_ID: '282' }, { ID: '1', NAME: 'Роман', ROOT_OBJECT_ID: '1' }] })
    }
    if (String(body.id) === '282') return json({ result: [{ ID: '294', NAME: 'Список.docx', TYPE: 'file' }] })
    if (String(body.id) === '1') return json({ result: [{ ID: '96', NAME: 'Мои документы', TYPE: 'folder' }] })
    if (String(body.id) === '96') return json({ result: [{ ID: '8', NAME: 'Бюджет.xlsx', TYPE: 'file' }] })
    return json({ error: 'unexpected' })
  }) as typeof fetch
  try {
    const text = await askBitrix(webhook, { action: 'files', query: 'документы' })
    expect(text).toContain('Документы:')
    expect(text).toContain('Список.docx')
    expect(text).toContain('Бюджет.xlsx')
  } finally {
    globalThis.fetch = original
  }
})

test('all tasks walk the next page and a delete removes the named task', async () => {
  const original = globalThis.fetch
  const deleted: string[] = []
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input)
    if (url.endsWith('/tasks.task.list.json')) {
      const body = JSON.parse(String(init?.body ?? '{}')) as { start?: number; filter?: { '%TITLE'?: string } }
      if (body.filter?.['%TITLE']) {
        return json({ result: { tasks: [{ id: '296', title: 'Тестовая задача 5' }] } })
      }
      if (body.start === 50) return json({ result: { tasks: [{ id: '16', title: 'Вторая' }] }, total: 2 })
      return json({ result: { tasks: [{ id: '15', title: 'Первая' }] }, total: 2, next: 50 })
    }
    if (url.endsWith('/tasks.task.delete.json')) {
      deleted.push(String(init?.body ?? ''))
      return json({ result: true })
    }
    return json({ error: 'unexpected' })
  }) as typeof fetch
  try {
    const listed = await askBitrix(webhook, { action: 'tasks', query: '', all: true })
    expect(listed).toContain('15. Первая')
    expect(listed).toContain('16. Вторая')
    expect(listed).not.toContain('Показаны первые')
    const removed = await askBitrix(webhook, { action: 'delete_task', title: 'Тестовая задача 5', taskId: '' })
    expect(removed).toBe('Задача «Тестовая задача 5» удалена, номер 296.')
    expect(deleted.join('')).toContain('296')
    expect(removed).not.toContain('secret')
  } finally {
    globalThis.fetch = original
  }
})

test('a named project opens its members, tasks and files', async () => {
  const original = globalThis.fetch
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input)
    const body = JSON.parse(String(init?.body ?? '{}')) as { filter?: { GROUP_ID?: string }; FILTER?: { ID?: string[] }; id?: string }
    if (url.endsWith('/sonet_group.get.json')) {
      return json({ result: [{ ID: '12', NAME: 'РШП 2024' }, { ID: '18', NAME: 'РШП (ИИ)' }] })
    }
    if (url.endsWith('/sonet_group.user.get.json')) {
      return json({ result: [{ USER_ID: '1', ROLE: 'A' }] })
    }
    if (url.endsWith('/user.get.json')) {
      expect(body.FILTER?.ID).toEqual(['1'])
      return json({ result: [{ ID: '1', NAME: 'Роман', LAST_NAME: 'Гамалей' }] })
    }
    if (url.endsWith('/tasks.task.list.json')) {
      expect(body.filter?.GROUP_ID).toBe('12')
      return json({ result: { tasks: [{ id: '286', title: 'Сценарий ТЭС и ДГ', status: '2' }] }, total: 1 })
    }
    if (url.endsWith('/disk.storage.getlist.json')) {
      return json({ result: [{ ID: '36', NAME: 'РШП 2024', ROOT_OBJECT_ID: '282' }] })
    }
    if (url.endsWith('/disk.folder.getchildren.json')) {
      expect(String(body.id)).toBe('282')
      return json({ result: [{ ID: '294', NAME: 'Список.docx', TYPE: 'file' }] })
    }
    return json({ error: 'unexpected' })
  }) as typeof fetch
  try {
    const several = await askBitrix(webhook, { action: 'projects', query: 'РШП' })
    expect(several).toContain('РШП (ИИ)')
    expect(several).toContain('РШП 2024')
    expect(several).not.toContain('Участники:')
    const text = await askBitrix(webhook, { action: 'projects', query: 'РШП 2024' })
    expect(text).toContain('Проект «РШП 2024», номер 12.')
    expect(text).toContain('Роман Гамалей, владелец')
    expect(text).toContain('286. Сценарий ТЭС и ДГ')
    expect(text).toContain('Список.docx')
    expect(text).not.toContain('secret')
  } finally {
    globalThis.fetch = original
  }
})

test('projects and past events come from the portal calendar', async () => {
  const original = globalThis.fetch
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input)
    const body = JSON.parse(String(init?.body ?? '{}')) as { type?: string; from?: string; ownerId?: number }
    if (url.endsWith('/sonet_group.get.json')) {
      return json({ result: [{ ID: '12', NAME: 'РШП 2024', CLOSED: 'N' }] })
    }
    if (url.endsWith('/calendar.event.get.json') && body.type === 'user') {
      expect(body.ownerId).toBe(10)
      expect(body.from).toMatch(/^\d{2}\.\d{2}\.\d{4}$/)
      return json({ result: [{ ID: '1', NAME: 'Планерка', DATE_FROM: '14.12.2023 16:00:00' }] })
    }
    if (url.endsWith('/calendar.event.get.json')) return json({ result: [] })
    return json({ error: 'unexpected' })
  }) as typeof fetch
  try {
    const projects = await askBitrix(webhook, { action: 'projects', query: '' })
    expect(projects).toContain('12. РШП 2024')
    const events = await askBitrix(webhook, { action: 'events', query: 'past' })
    expect(events).toContain('Планерка')
    expect(events).toContain('14.12.2023')
    expect(events).not.toContain('secret')
  } finally {
    globalThis.fetch = original
  }
})

test('a new document is saved on the common disk and the staff approve it in order', async () => {
  const original = globalThis.fetch
  const tasks: Array<{ title?: string; depends?: string[]; responsible?: number }> = []
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input)
    const body = JSON.parse(String(init?.body ?? '{}')) as {
      id?: number
      data?: { NAME?: string }
      fields?: { TITLE?: string; DEPENDS_ON?: string[]; RESPONSIBLE_ID?: number }
    }
    if (url.endsWith('/disk.storage.getlist.json')) {
      return json({ result: [{ ID: '2', NAME: 'Общий диск', ENTITY_TYPE: 'common', ROOT_OBJECT_ID: '3' }] })
    }
    if (url.endsWith('/disk.folder.uploadfile.json')) {
      expect(body.id).toBe(3)
      expect(body.data?.NAME).toBe('Тестовый документ.txt')
      return json({ result: { ID: '394', NAME: 'Тестовый документ.txt' } })
    }
    if (url.endsWith('/user.get.json')) {
      return json({ result: [{ ID: '1', NAME: 'Роман', LAST_NAME: 'Гамалей' }, { ID: '10', NAME: 'Игорь', LAST_NAME: 'Ивлев' }] })
    }
    if (url.endsWith('/tasks.task.add.json')) {
      tasks.push({ title: body.fields?.TITLE, depends: body.fields?.DEPENDS_ON, responsible: body.fields?.RESPONSIBLE_ID })
      return json({ result: { task: { id: '410' } } })
    }
    return json({ error: 'unexpected' })
  }) as typeof fetch
  try {
    const text = await createBitrixDocument(webhook, { title: 'Тестовый документ', chain: true })
    expect(text).toContain('Документ «Тестовый документ.txt» создан на общем диске, номер 394.')
    expect(text).toContain('Роман Гамалей — задача №410')
    expect(text).not.toContain('Игорь')
    expect(tasks).toEqual([{ title: 'Согласовать: Тестовый документ', depends: undefined, responsible: 1 }])
    expect(text).not.toContain('secret')
  } finally {
    globalThis.fetch = original
  }
})

test('clients, successful deals and a meeting are answered without raw records', async () => {
  const original = globalThis.fetch
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input)
    const body = JSON.parse(String(init?.body ?? '{}')) as { name?: string; from?: string }
    if (url.endsWith('/crm.company.list.json')) return json({ result: [{ ID: '4', TITLE: 'Сибирь Девелопмент' }], total: 1 })
    if (url.endsWith('/crm.contact.list.json')) return json({ result: [{ ID: '9', NAME: 'Анна', LAST_NAME: 'Люликина' }], total: 1 })
    if (url.endsWith('/crm.deal.list.json')) return json({ result: [{ ID: '1836', TITLE: 'продление Монолит', OPPORTUNITY: '1000', CURRENCY_ID: 'RUB' }], total: 1 })
    if (url.endsWith('/voximplant.statistic.get.json')) return json({ result: [{ ID: '1', CALL_DURATION: '12' }], total: 3 })
    if (url.endsWith('/calendar.section.get.json')) return json({ result: [{ ID: '12', NAME: 'Igor Ivlev' }] })
    if (url.endsWith('/calendar.event.add.json')) {
      expect(body.name).toBe('Встреча с ООО Ромашка')
      expect(body.from).toMatch(/^\d{2}\.\d{2}\.\d{4} 10:00:00$/)
      return json({ result: 77 })
    }
    return json({ error: 'unexpected' })
  }) as typeof fetch
  try {
    const clients = await readBitrixClients(webhook)
    expect(clients).toContain('№4 Сибирь Девелопмент')
    expect(clients).toContain('№9 Анна Люликина')
    expect(clients).not.toContain('HAS_PHONE')
    const outcomes = await readBitrixOutcomes(webhook)
    expect(outcomes).toContain('Успешные дозвоны: 3')
    expect(outcomes).toContain('№1836 продление Монолит')
    const meeting = await createBitrixMeeting(webhook, { title: 'ООО Ромашка', when: 'tomorrow' })
    expect(meeting).toContain('номер 77')
    expect(meeting).toContain('в CRM нет')
    expect(meeting).not.toContain('Откройте Битрикс24')
    expect(meeting).not.toContain('secret')
  } finally {
    globalThis.fetch = original
  }
})

test('a meeting for a named person uses that hour and invites the employee', async () => {
  const original = globalThis.fetch
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input)
    const body = JSON.parse(String(init?.body ?? '{}')) as { name?: string; from?: string; attendees?: number[] }
    if (url.endsWith('/user.search.json')) {
      return json({ result: [{ ID: '21', NAME: 'Дмитрий', LAST_NAME: 'Резанов' }, { ID: '22', NAME: 'Игорь', LAST_NAME: 'Ивлев' }] })
    }
    if (url.endsWith('/calendar.event.getbyid.json')) {
      return json({ result: { ID: '3740', NAME: 'Встреча: Дмитрий Резанов', DATE_FROM: '04.11.2026 12:00:00' } })
    }
    if (url.endsWith('/calendar.section.get.json')) return json({ result: [{ ID: '12', NAME: 'Календарь' }] })
    if (url.endsWith('/calendar.event.add.json')) {
      expect(body.name).toBe('Встреча: Дмитрий Резанов')
      expect(body.from).toMatch(/^\d{2}\.\d{2}\.\d{4} 12:00:00$/)
      expect(body.attendees).toEqual([10, 21])
      return json({ result: 3740 })
    }
    return json({ error: 'unexpected' })
  }) as typeof fetch
  try {
    const meeting = await createBitrixMeeting(webhook, {
      title: 'дмитрия резанова',
      when: 'tomorrow',
      hour: 12,
      minute: 0,
      withPerson: true,
      withCompany: false,
    })
    expect(meeting).toContain('номер 3740')
    expect(meeting).toContain('12:00–13:00')
    expect(meeting).toContain('Участник: Дмитрий Резанов')
    expect(meeting).not.toContain('Откройте Битрикс24')
    expect(meeting).not.toContain('в CRM нет')
    expect(meeting).not.toContain('secret')
    const place = await locateBitrixMeeting(webhook, '3740')
    expect(place).toContain('Встреча: Дмитрий Резанов')
    expect(place).toContain('04.11.2026 12:00')
    expect(place).toContain('Календарь → 04.11.2026')
  } finally {
    globalThis.fetch = original
  }
})

test('a meeting names the employee and the company separately', async () => {
  const original = globalThis.fetch
  const finds: string[] = []
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input)
    const body = JSON.parse(String(init?.body ?? '{}')) as { FIND?: string; filter?: { '%TITLE'?: string }; name?: string; attendees?: number[] }
    if (url.endsWith('/user.search.json')) {
      finds.push(body.FIND ?? '')
      return json({ result: [{ ID: '21', NAME: 'Дмитрий', LAST_NAME: 'Резанов' }] })
    }
    if (url.endsWith('/crm.company.list.json')) {
      expect(body.filter?.['%TITLE']).toBe('ромашка')
      return json({ result: [{ ID: '4', TITLE: 'ООО Ромашка' }] })
    }
    if (url.endsWith('/calendar.section.get.json')) return json({ result: [{ ID: '12', NAME: 'Календарь' }] })
    if (url.endsWith('/calendar.event.add.json')) {
      expect(body.name).toBe('Встреча: Дмитрий Резанов, ООО Ромашка')
      expect(body.attendees).toEqual([10, 21])
      return json({ result: 3746 })
    }
    return json({ error: 'unexpected' })
  }) as typeof fetch
  try {
    const meeting = await createBitrixMeeting(webhook, {
      title: 'Резанова Дмитрия',
      person: 'Резанова Дмитрия',
      company: 'ООО ромашка',
      when: 'tomorrow',
      hour: 12,
      minute: 0,
      withPerson: true,
      withCompany: true,
    })
    expect(finds[0]).toBe('резанов')
    expect(meeting).toContain('номер 3746')
    expect(meeting).toContain('Участник: Дмитрий Резанов')
    expect(meeting).toContain('Компания «ООО Ромашка» есть в CRM, номер 4')
    expect(meeting).not.toContain('не нашёлся')
    expect(meeting).not.toContain('Откройте Битрикс24')
  } finally {
    globalThis.fetch = original
  }
})

function json(body: unknown) {
  return new Response(JSON.stringify(body), { status: 200, headers: { 'Content-Type': 'application/json' } })
}
