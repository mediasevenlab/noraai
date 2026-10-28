import { expect, test } from 'bun:test'

import {
  attachedFileContext,
  buildKnowledgeContext,
  chooseAttachedFile,
  combineKnowledgeContext,
  directKnowledgeReply,
  chunkKnowledgeText,
  formatKnowledgeContext,
  schemeAnswer,
  selectKnowledgePassages,
  spreadSchemeMarkers,
  tableOrdinal,
} from './retrieve'

test('splits a long document into overlapping pieces', () => {
  const text = Array.from({ length: 40 }, (_, index) => `Абзац ${index} про рационы, меню и публикацию материалов на неделю вперёд.`).join('\n')
  const chunks = chunkKnowledgeText(text)
  expect(chunks.length).toBeGreaterThan(1)
  expect(chunks[0]?.length).toBeLessThanOrEqual(1400)
  expect(chunks[1]?.includes(chunks[0]?.slice(-40) ?? 'missing')).toBe(true)
})

test('finds the passage that actually contains the question', () => {
  const passages = [
    { baseName: 'Инструкция', fileName: 'a.pdf', position: 0, text: 'Общие слова о питании и воде.' },
    {
      baseName: 'Инструкция',
      fileName: 'a.pdf',
      position: 1,
      text: 'Срок публикации контент-плана на 2027 год равен четырём неделям.',
    },
  ]
  const selected = selectKnowledgePassages('Какой срок публикации контент-плана на 2027?', passages)
  expect(selected.some((passage) => passage.position === 1)).toBe(true)
  expect(formatKnowledgeContext(selected)).toContain('a.pdf')
  expect(formatKnowledgeContext([])).toContain('подходящих фрагментов нет')
})

test('spells an abbreviation from the file instead of the url that merely contains it', () => {
  const passages = [
    {
      baseName: 'Инструкция',
      fileName: 'a.pdf',
      position: 0,
      text: 'Заявки принимаются на сайте https://контент.пфки.рф после регистрации.',
    },
    {
      baseName: 'Инструкция',
      fileName: 'a.pdf',
      position: 1,
      text: 'Доверенность должна содержать полномочия по представлению в Президентский фонд культурных инициатив заявки на участие в отборе.',
    },
  ]
  const selected = selectKnowledgePassages('как расшифровывается ПФКИ', passages)
  expect(selected.some((passage) => passage.text.includes('Президентский фонд культурных инициатив'))).toBe(true)
})

test('a different word form still finds the rate in the file', () => {
  const passages = [
    {
      baseName: 'Инструкция',
      fileName: 'a.pdf',
      position: 0,
      text: 'Просмотров и прослушиваний на площадках очень много. '.repeat(20),
    },
    {
      baseName: 'Инструкция',
      fileName: 'a.pdf',
      position: 1,
      text: 'Рекомендуемая средняя стоимость просмотра не должна превышать 6,15 рублей. Она рассчитывается как соотношение запрашиваемой суммы и количества просмотров.',
    },
  ]
  const selected = selectKnowledgePassages(
    'Если я попрошу 1 млн руб, какое количество просмотров я должен обеспечить?',
    passages,
  )
  expect(selected.map((passage) => passage.text).join('\n')).toContain('6,15')
})

test('a request to copy the table returns the file even when the question shares no words with it', () => {
  const passages = [
    {
      baseName: 'БКО',
      fileName: 'list.pdf',
      position: 0,
      text: 'Перечень БКО\nПолуконтейнер Атлас SU 1\nПечь удлиненная_48 SU 1',
    },
    {
      baseName: 'БКО',
      fileName: 'list.pdf',
      position: 1,
      text: 'Вилка десертная GB,S7 1',
    },
  ]
  const selected = selectKnowledgePassages('Построй таблицу точно такую же как в базе знаний', passages)
  expect(selected.map((passage) => passage.position)).toEqual([0, 1])
  const context = buildKnowledgeContext('Построй таблицу точно такую же как в базе знаний', passages)
  expect(context).toContain('Полуконтейнер')
  expect(context).toContain('одна таблица')
  expect(context).not.toContain('| Сибирь |')
})

test('a vague table request does not turn several headings into one ready table', () => {
  const passages = [
    {
      baseName: 'БКО',
      fileName: 'list.pdf',
      position: 0,
      text: 'Перечень БКО\nАвиакомпания № документа Дата/время вылета Тип / № борта № рейса\nСибирь 15.10.2026 07:30 B-737-800(winglet) S7 5119\nНаименование\nПолуконтейнер\nАтлас SU 1',
    },
  ]
  const context = buildKnowledgeContext('Построй таблицу точно такую же как в базе знаний', passages)
  expect(context).toContain('Авиакомпания')
  expect(context).toContain('Наименование')
  expect(context).toContain('такие таблицы')
  expect(context).not.toContain('Полуконтейнер')
  expect(context).toContain('Напишите номер')
  expect(context).not.toContain('Назови номера')
  expect(context).not.toContain('| --- |')
  const reply = directKnowledgeReply(context)
  expect(reply).toContain('1. Авиакомпания')
  expect(reply).toContain('2. Наименование')
  expect(reply).not.toContain('NORA_TABLE_MENU')
})

test('an ordinal picks the already listed table instead of denying it', () => {
  const passages = [
    {
      baseName: 'БКО',
      fileName: 'list.pdf',
      position: 0,
      text: 'Перечень БКО\nАвиакомпания № документа Дата/время вылета Тип / № борта № рейса\nСибирь 15.10.2026 07:30 B-737-800(winglet) S7 5119\nНаименование\nЗагружено\nна ВС\nПолуконтейнер\nАтлас SU 1\nПечь\nудлиненная_48\nСдал экспедитор_________________________',
    },
  ]
  const context = buildKnowledgeContext('построй вторую таблицу', passages)
  expect(context).toContain('Вот вторая таблица.')
  expect(context).toContain('| Наименование | Загружено на ВС |')
  expect(context).toContain('| Полуконтейнер Атлас SU | 1 |')
  const reply = directKnowledgeReply(context)
  expect(reply?.startsWith('Вот вторая таблица.')).toBe(true)
  expect(reply).toContain('| Полуконтейнер Атлас SU | 1 |')
  expect(reply).not.toContain('NORA_TABLE_SHEET')
  expect(context).not.toContain('Сибирь')
  expect(context).not.toContain('Сдал экспедитор')
})

test('«первую» without the word table still returns the first sheet', () => {
  const passages = [
    {
      baseName: 'БКО',
      fileName: 'list.pdf',
      position: 0,
      text: 'Перечень БКО\nАвиакомпания № документа Дата/время вылета Тип / № борта № рейса\nСибирь 15.10.2026 07:30 B-737-800(winglet) S7 5119\nНаименование\nЗагружено\nна ВС\nПолуконтейнер\nАтлас SU 1',
    },
  ]
  const first = directKnowledgeReply(buildKnowledgeContext('построй первую?', passages))
  expect(first?.startsWith('Вот первая таблица.')).toBe(true)
  expect(first).toContain('| Сибирь |')
  expect(first).not.toContain('Полуконтейнер')
  const second = directKnowledgeReply(buildKnowledgeContext('построй вторую?', passages))
  expect(second?.startsWith('Вот вторая таблица.')).toBe(true)
  expect(second).toContain('| Полуконтейнер Атлас SU | 1 |')
  expect(second).not.toContain('Сибирь')
})

test('a scan already written as markdown keeps each grid and returns the one that was named', () => {
  const passages = [
    {
      baseName: 'ТГО',
      fileName: 'scan.pdf',
      position: 0,
      text: [
        'Страница 2',
        'Технологический график',
        '| Операция | Начало | Конец |',
        '| --- | --- | --- |',
        '| Подача | 10:00 | 10:20 |',
        '',
        '| Служба | Норма |',
        '| --- | --- |',
        '| ТЗК | 15 |',
      ].join('\n'),
    },
  ]
  const menu = directKnowledgeReply(buildKnowledgeContext('какие там есть таблицы?', passages))
  expect(menu).toContain('1. Операция, Начало, Конец')
  expect(menu).toContain('2. Служба, Норма')
  expect(menu).not.toContain('Подача')
  const sheet = directKnowledgeReply(buildKnowledgeContext('построй вторую?', passages))
  expect(sheet?.startsWith('Вот вторая таблица.')).toBe(true)
  expect(sheet).toContain('| Служба | Норма |')
  expect(sheet).toContain('| ТЗК | 15 |')
  expect(sheet).not.toContain('Подача')
})

test('a caption above one grid is the same table and is printed once', () => {
  const text = [
    'Test Table',
    'Simple sample table with random data.',
    'ID Name Category Price Qty',
    '1 Apple Fruit 1.20 150',
    '2 Milk Dairy 0.90 80',
    '3 Bread Bakery 1.50 200',
    '4 Cheese Dairy 4.80 40',
    '5 Tomato Vegetable 2.10 90',
  ].join('\n')
  const reply = directKnowledgeReply(attachedFileContext('Извлеки таблицу из документа', 'test_table.pdf', text))
  expect(reply).toContain('Вот таблица.')
  expect(reply).toContain('Simple sample table with random data.')
  expect(reply).toContain('| ID | Name | Category | Price | Qty |')
  expect(reply).toContain('| 1 | Apple | Fruit | 1.20 | 150 |')
  expect(reply).toContain('| 5 | Tomato | Vegetable | 2.10 | 90 |')
  expect(reply).not.toContain('2. ID')
  const again = directKnowledgeReply(attachedFileContext('извлеки все', 'test_table.pdf', text))
  expect(again?.match(/\| Apple \|/g)).toHaveLength(1)
})

test('two plain header rows stay separate tables', () => {
  const passages = [
    {
      baseName: 'Отчёт',
      fileName: 'report.pdf',
      position: 0,
      text: 'План Факт Отклонение Комментарий\n10 12 2 норма\nИмя Отдел Ставка\nАнна Цех 1',
    },
  ]
  const context = buildKnowledgeContext('построй вторую таблицу', passages)
  expect(context).toContain('Анна')
  expect(context).not.toContain('10 12 2')
})

test('a markdown table past the first excerpts is still listed', () => {
  const passages = Array.from({ length: 9 }, (_, position) => ({
    baseName: 'ТГО',
    fileName: 'scan.pdf',
    position,
    text:
      position === 8
        ? [
            '| Операция | Норма |',
            '| --- | --- |',
            '| Заправка | 15 |',
            '',
            '| Служба | Смена |',
            '| --- | --- |',
            '| ТЗК | 2 |',
          ].join('\n')
        : `Страница ${position}\n${'абзац приказа и сборника. '.repeat(40)}`,
  }))
  const menu = directKnowledgeReply(buildKnowledgeContext('какие там есть таблицы?', passages))
  expect(menu).toContain('1. Операция, Норма')
  expect(menu).toContain('2. Служба, Смена')
  const sheet = directKnowledgeReply(buildKnowledgeContext('построй первую?', passages))
  expect(sheet).toContain('| Заправка | 15 |')
})

test('an attached file is the subject even when the question shares no words with it', () => {
  const text = [
    'Технологический график',
    '| Операция | Норма |',
    '| --- | --- |',
    '| Заправка | 15 |',
    '',
    '| Служба | Смена |',
    '| --- | --- |',
    '| ТЗК | 2 |',
  ].join('\n')
  const menu = directKnowledgeReply(attachedFileContext('какие там есть таблицы?', 'график.pdf', text))
  expect(menu).toContain('график.pdf')
  expect(menu).toContain('1. Операция, Норма')
  expect(menu).toContain('2. Служба, Смена')
  expect(menu).not.toContain('Заправка')
  const sheet = directKnowledgeReply(attachedFileContext('построй вторую?', 'график.pdf', text))
  expect(sheet).toContain('| ТЗК | 2 |')
  expect(sheet).not.toContain('Заправка')
  const greeting = attachedFileContext('привет', 'график.pdf', 'Встреча воздушного судна на стоянке.')
  expect(greeting).toContain('Прикреплённый файл «график.pdf».')
  expect(greeting).toContain('Встреча воздушного судна')
  expect(greeting).not.toContain('подходящих фрагментов нет')
})

test('an attached file stays ahead of a ready table from the selected base', () => {
  const attached = attachedFileContext('привет', 'график.pdf', 'Встреча воздушного судна на стоянке.')
  const baseMenu = 'NORA_TABLE_MENU\nВ файле «база.pdf» такие таблицы:\n1. План\n\nНапишите номер — построю её.'
  expect(combineKnowledgeContext(attached, baseMenu)).toBe(attached)
  expect(combineKnowledgeContext('', baseMenu)).toBe(baseMenu)
  expect(combineKnowledgeContext(attached, 'Выдержки из включённых баз знаний.\nСрок четыре недели.')).toContain('график.pdf')
  expect(combineKnowledgeContext(attached, 'Выдержки из включённых баз знаний.\nСрок четыре недели.')).toContain('четыре недели')
})

test('a later question can name the first file instead of the latest one', () => {
  const names = ['test_table.pdf', 'aiDYoRJhiO.pdf']
  expect(chooseAttachedFile('Повтори еще раз таблицу из первого файла', names)).toBe(0)
  expect(chooseAttachedFile('нет, который я тебе скидывал первым', names)).toBe(0)
  expect(chooseAttachedFile('извлеки все таблицы из этого файла', names)).toBe(1)
  expect(chooseAttachedFile('построй вторую', names)).toBe(1)
  expect(chooseAttachedFile('построй вторую таблицу из первого файла', names)).toBe(0)
  expect(chooseAttachedFile('что во втором файле aiDYoRJhiO', names)).toBe(1)
  const first = ['ID Name Qty', '1 Apple 2'].join('\n')
  const reply = directKnowledgeReply(
    attachedFileContext('Повтори еще раз таблицу из первого файла', names[0] ?? '', first, names),
  )
  expect(reply).toContain('первый в диалоге')
  expect(reply).toContain('| Apple | 2 |')
  expect(reply).not.toContain('aiDYoRJhiO')
})

test('a later sheet number is still a choice', () => {
  expect(tableOrdinal('построй шестую?')).toBe(6)
  expect(tableOrdinal('построй пятую таблицу')).toBe(5)
  expect(tableOrdinal('построй таблицу 12')).toBe(12)
  expect(tableOrdinal('12')).toBe(12)
  expect(tableOrdinal('5 сайтов')).toBeNull()
  expect(tableOrdinal('давай Форма 12')).toBeNull()
})

test('every excel sheet is listed, and naming one returns its rows', () => {
  const text = [
    'Лист «РС»',
    '| N | Номенклатура |',
    '| --- | --- |',
    '| 1 | Кронштейн |',
    '',
    'Лист «Форма 12»',
    '| Форма № 12 | Форма № 12 |',
    '| --- | --- |',
    '| Смета и расчет |  |',
    '| 3.1 | 100.50 |',
    '',
    'Лист «2 план кальк»',
    '| План |  |',
    '| --- | --- |',
    '| Статья | 10 |',
  ].join('\n')
  const menu = directKnowledgeReply(attachedFileContext('какие там есть таблицы?', 'смета.xls', text))
  expect(menu).toContain('1. РС')
  expect(menu).toContain('2. Форма 12')
  expect(menu).toContain('3. 2 план кальк')
  expect(menu).not.toContain('Форма № 12, Форма № 12')
  const sheet = directKnowledgeReply(attachedFileContext('давай Форма 12', 'смета.xls', text))
  expect(sheet).toContain('Вот лист «Форма 12».')
  expect(sheet).toContain('| 3.1 | 100.50 |')
  expect(sheet).not.toContain('Кронштейн')
  const inflected = directKnowledgeReply(attachedFileContext('построй форму 12', 'смета.xls', text))
  expect(inflected).toContain('| 3.1 | 100.50 |')
  const numbered = directKnowledgeReply(attachedFileContext('12', 'смета.xls', text))
  expect(numbered).toContain('Напишите номер')
  expect(numbered).not.toContain('100.50')
  const other = directKnowledgeReply(attachedFileContext('форма 1', 'смета.xls', text))
  expect(other).toBeNull()
  const course = directKnowledgeReply(attachedFileContext('курс', 'смета.xls', text))
  expect(course).toBeNull()
  const question = attachedFileContext('сколько в форме 12', 'смета.xls', text)
  expect(directKnowledgeReply(question)).toBeNull()
  expect(question).toContain('| 3.1 | 100.50 |')
  expect(question).not.toContain('Кронштейн')
  const about = attachedFileContext('о чем эта таблица?', 'смета.xls', text)
  expect(directKnowledgeReply(about)).toBeNull()
  expect(about).toContain('Лист «РС»')
  expect(about).toContain('Лист «Форма 12»')
  expect(about).toContain('100.50')
  expect(about).not.toContain('Напишите номер')
  const what = attachedFileContext('что это за таблица', 'смета.xls', text)
  expect(directKnowledgeReply(what)).toBeNull()
  expect(what).toContain('100.50')
  expect(what).not.toContain('Напишите номер')
  const more = attachedFileContext('расскажи подробнее о чем она', 'смета.xls', text)
  expect(directKnowledgeReply(more)).toBeNull()
  expect(more).toContain('Кронштейн')
  expect(more).not.toContain('Напишите номер')
  const fileQuestion = attachedFileContext('что в файле?', 'смета.xls', text)
  expect(directKnowledgeReply(fileQuestion)).toBeNull()
  expect(fileQuestion).not.toContain('Напишите номер')
})

test('a clause number finds the passage that states those points', () => {
  const decoy = 'Технические требования. СНиП 3.02.01-87 упоминается среди нормативных документов на земляные работы.'
  const real = 'Технические требования\nСНиП 3.02.01-87 пп. 1.11, 3.1 - 3.6, 3.29\nРазмеры выемок по дну в натуре должны быть не менее установленных проектом.'
  const passages = [
    { baseName: 'Схемы', fileName: 'a.html', position: 0, text: decoy },
    ...Array.from({ length: 9 }, (_, index) => ({
      baseName: 'Схемы',
      fileName: 'a.html',
      position: index + 1,
      text: `${decoy} Повтор ${index}.`,
    })),
    { baseName: 'Схемы', fileName: 'a.html', position: 20, text: real },
  ]
  const selected = selectKnowledgePassages(
    'Дай Технические требования СНиП 3.02.01-87 пп. 1.11, 3.1 - 3.6, 3.29',
    passages,
  )
  expect(selected.some((passage) => passage.text.includes('Размеры выемок'))).toBe(true)
})

test('a citation keeps that sheet and drops the neighbouring drawings', () => {
  const passages = [
    { baseName: 'Схемы', fileName: 'a.html', position: 0, text: '[[схема:x220.jpg]] Схемы операционного контроля' },
    {
      baseName: 'Схемы',
      fileName: 'a.html',
      position: 42,
      text: 'Технические требования\nСНиП 3.02.01-87 пп. 1.11, 3.1 - 3.6, 3.29\n[[схема:x003.gif]]\nРазмеры выемок по дну',
    },
    {
      baseName: 'Схемы',
      fileName: 'a.html',
      position: 43,
      text: 'при окончательной разработке не должны превышать ± 5 см',
    },
    {
      baseName: 'Схемы',
      fileName: 'a.html',
      position: 50,
      text: 'Технические требования\nСНиП 3.02.01-87 пп. 1.11, 3.29\n[[схема:x006.gif]]\nДопускаемые отклонения отметок дна траншей ± 5 см',
    },
    {
      baseName: 'Схемы',
      fileName: 'a.html',
      position: 51,
      text: 'Указания по производству работ\nСНиП 3.02.01-87 пп. 3.1, 3.3, 3.6\n[[схема:x008.gif]]\nМинимальная ширина траншей',
    },
  ]
  const trench = selectKnowledgePassages('Технические требования СНиП 3.02.01-87 пп. 1.11, 3.29', passages)
  expect(trench.map((passage) => passage.position)).toEqual([0, 50])
  expect(schemeAnswer(formatKnowledgeContext(trench))).toBe('![Схема](/api/users/me/knowledge-schemes/x006.gif)')
  const excavation = selectKnowledgePassages(
    'Технические требования СНиП 3.02.01-87 пп. 1.11, 3.1 - 3.6, 3.29',
    passages,
  )
  expect(excavation.map((passage) => passage.position)).toEqual([0, 42, 43])
  expect(schemeAnswer(formatKnowledgeContext(excavation))).toBe('![Схема](/api/users/me/knowledge-schemes/x003.gif)')
})

test('a question the file does not cover returns no passages', () => {
  const passages = [
    {
      baseName: 'Инструкция',
      fileName: 'a.pdf',
      position: 0,
      text: 'Фонд принимает заявки на финансирование творческих проектов.',
    },
  ]
  expect(selectKnowledgePassages('дай ссылки на пять сайтов с рецептами', passages)).toEqual([])
})

test('a scheme mark stays with the neighbouring text and becomes a drawing in the answer', () => {
  const chunks = spreadSchemeMarkers([
    'Таблица операций',
    'Технические требования\n[[схема:x003.gif]]',
    'Отклонения отметок дна не должны превышать 5 см.',
  ])
  expect(chunks[0]).toContain('[[схема:x003.gif]]')
  expect(chunks[2]).toContain('[[схема:x003.gif]]')
  const answer = schemeAnswer(`${chunks[2]}\n[[схема:../secret.gif]]\n[[схема:x220.jpg]]`)
  expect(answer).toContain('/api/users/me/knowledge-schemes/x003.gif')
  expect(answer).toContain('/api/users/me/knowledge-schemes/x220.jpg')
  expect(answer).not.toContain('secret')
  const knowledge = [
    '[1] База «Схемы», файл «a.html»',
    '[[схема:x220.jpg]]',
    'СХЕМЫ ОПЕРАЦИОННОГО КОНТРОЛЯ',
    '',
    '[2] База «Схемы», файл «a.html»',
    'Отклонения отметок дна',
    '[[схема:x003.gif]]',
  ].join('\n')
  expect(schemeAnswer(knowledge)).toBe('![Схема](/api/users/me/knowledge-schemes/x003.gif)')
})
