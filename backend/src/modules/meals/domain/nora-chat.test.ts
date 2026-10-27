import { describe, expect, test } from 'bun:test'

import { MealsFailure } from './errors'
import {
  answerNeedsVisionReading,
  buildNoraChatRequest,
  followUpLines,
  followUpSubject,
  formatWebSearchFindings,
  noteVisionForText,
  photoLookupQuery,
  readWebSearchCalls,
  webSearchQuery,
  type NoraChatTurn,
} from './nora-chat'

const models = { text: 'qwen2.5:7b', vision: 'qwen2.5vl:3b' }

function user(text: string, images?: NoraChatTurn['images']): NoraChatTurn {
  return { role: 'user', text, images }
}

describe('Nora settings chat', () => {
  test('a text thread stays on the text model and keeps the earlier turns', () => {
    const request = buildNoraChatRequest(
      [
        user('Что такое белок?'),
        { role: 'assistant', text: 'Строительный материал.' },
        user('А жир?'),
      ],
      models,
    )

    expect(request.model).toBe('qwen2.5:7b')
    expect(request.messages.map((message) => message.role)).toEqual([
      'system',
      'user',
      'assistant',
      'user',
    ])
    expect(request.messages[1]?.content).toBe('Что такое белок?')
    expect(request.messages[3]?.content).toBe('А жир?')
    expect(String(request.messages[0]?.content)).toContain('Nora')
    expect(String(request.messages[0]?.content)).not.toContain('базы знаний')
    expect(String(request.messages[0]?.content)).not.toContain('Только JSON')
  })

  test('a photo switches the thread to the vision model', () => {
    const request = buildNoraChatRequest(
      [user('Что на фото?', [{ base64: 'abc', mime: 'image/png' }])],
      models,
    )

    expect(request.model).toBe('qwen2.5vl:3b')
    const parts = request.messages[1]?.content as Array<{
      type: string
      text?: string
      image_url?: { url: string }
    }>
    expect(parts[0]).toEqual({ type: 'text', text: 'Что на фото?' })
    expect(parts[1]?.image_url?.url).toBe('data:image/png;base64,abc')
    const system = String(request.messages[0]?.content)
    expect(system).toContain('КБЖУ')
    expect(system).toContain('оценка по фото')
  })

  test('a text question does not ask for a photo calorie estimate', () => {
    const request = buildNoraChatRequest([user('Как дела?')], models)
    expect(String(request.messages[0]?.content)).not.toContain('КБЖУ')
  })

  test('only the latest four photos stay in the request', () => {
    const photos = ['a', 'b', 'c', 'd', 'e'].map((base64) => ({ base64 }))
    const request = buildNoraChatRequest([user('Смотри', photos)], models)
    const parts = request.messages[1]?.content as Array<{
      type: string
      image_url?: { url: string }
    }>
    expect(parts.filter((part) => part.type === 'image_url')).toHaveLength(4)
    const urls = parts
      .filter((part) => part.type === 'image_url')
      .map((part) => part.image_url?.url)
    expect(urls).toEqual([
      'data:image/jpeg;base64,b',
      'data:image/jpeg;base64,c',
      'data:image/jpeg;base64,d',
      'data:image/jpeg;base64,e',
    ])
  })

  test('an empty turn is rejected', () => {
    expect(() => buildNoraChatRequest([user('   ')], models)).toThrow(MealsFailure)
  })

  test('text with search may call the web, a photo is read and then answered with search', () => {
    const text = buildNoraChatRequest([user('Какая столица Австралии?')], { ...models, search: true })
    expect(text.tools).toBe(true)
    expect(String(text.messages[0]?.content)).toContain('Интернет для этого ответа включён')

    const turns = [user('Что на фото?', [{ base64: 'abc' }])]
    expect(answerNeedsVisionReading(turns, { ...models, search: true })).toBe(true)
    const photo = buildNoraChatRequest(noteVisionForText(turns, 'На снимке кружка.'), { ...models, search: true })
    expect(photo.model).toBe('qwen2.5:7b')
    expect(photo.tools).toBe(true)
    expect(String(photo.messages.at(-1)?.content)).toContain('кружка')
    expect(String(photo.messages[0]?.content)).toContain('Интернет для этого ответа включён')
    expect(String(photo.messages[0]?.content)).toContain('Что видно на изображении')
    expect(String(photo.messages[0]?.content)).not.toContain('интернета нет')
  })

  test('a photo alone stays on the vision model', () => {
    const turns = [user('', [{ base64: 'abc' }])]
    expect(answerNeedsVisionReading(turns, models)).toBe(false)
    const photo = buildNoraChatRequest(turns, models)
    expect(photo.model).toBe('qwen2.5vl:3b')
    expect(photo.tools).toBe(false)
  })

  test('a later question after a photo uses the text model, and search can be turned off', () => {
    const thread = [
      user('Смотри', [{ base64: 'abc' }]),
      { role: 'assistant' as const, text: 'Это кружка.' },
      user('Найди такую'),
    ]
    const searching = buildNoraChatRequest(thread, { ...models, search: true })
    expect(searching.model).toBe('qwen2.5:7b')
    expect(searching.tools).toBe(true)
    expect(typeof searching.messages.at(-1)?.content).toBe('string')

    const quiet = buildNoraChatRequest(thread, { ...models, search: false })
    expect(quiet.model).toBe('qwen2.5:7b')
    expect(quiet.tools).toBe(false)
    expect(String(quiet.messages[0]?.content)).toContain('интернета нет')
  })

  test('offline does not offer the web and says the internet is off', () => {
    const request = buildNoraChatRequest([user('Что на официальном сайте?')], { ...models, search: false })
    expect(request.tools).toBe(false)
    const system = String(request.messages[0]?.content)
    expect(system).not.toContain('web_search')
    expect(system).toContain('интернета нет')
  })

  test('a selected transcript is the source when no knowledge base is on', () => {
    const request = buildNoraChatRequest(
      [user('Кто говорил про Луну?')],
      { ...models, search: false },
      'Расшифровки выбранных встреч.\n[1] «Сурдин», 00:00:04, Спикер 1\nНикто не высаживался на Луну.',
    )
    const system = String(request.messages[0]?.content)
    expect(system).toContain('единственный источник')
    expect(system).toContain('о чём она')
    expect(system).toContain('В выбранных встречах этого нет')
    expect(system).toContain('Спикер 1 (Михаил)')
    expect(system).toContain('не подменяй его на «Спикер»')
    expect(system).toContain('Никто не высаживался на Луну.')
    expect(system).not.toContain('В выбранной базе этого нет')
  })

  test('a selected knowledge base outranks general knowledge in the prompt', () => {
    const request = buildNoraChatRequest(
      [user('Какой срок?')],
      { ...models, search: false },
      'Выдержки из включённых баз знаний.\n[1] База «Инструкция», файл «plan.pdf»\nСрок равен четырём неделям.',
    )
    const system = String(request.messages[0]?.content)
    expect(system).toContain('единственный источник')
    expect(system).toContain('В выбранной базе этого нет')
    expect(system).toContain('на языке пользователя')
    expect(system).toContain('обычным текстом')
    expect(system).toContain('списком Markdown')
    expect(system).toContain('таблицу Markdown')
    expect(system).toContain('не обсуждай шрифт')
    expect(system).toContain('не назвал какой именно')
    expect(system).toContain('«вторую»')
    expect(system).not.toContain('Ход мыслей')
    expect(request.tools).toBe(false)
    expect(system).toContain('plan.pdf')
    expect(system).toContain('четырём неделям')
    expect(system).not.toContain('web_search')
  })

  test('internet on keeps the knowledge excerpts and may search', () => {
    const request = buildNoraChatRequest(
      [user('Какая сейчас погода?')],
      { ...models, search: true },
      'Выдержки из включённых баз знаний.\n[1] База «Инструкция», файл «plan.pdf»\nСрок равен четырём неделям.',
    )
    const system = String(request.messages[0]?.content)
    expect(request.tools).toBe(true)
    expect(system).toContain('результатам поиска')
    expect(system).toContain('plan.pdf')
    expect(system).toContain('четырём неделям')
    expect(system).not.toContain('единственный источник')
  })

  test('a photo search looks up the dish from the picture, and follow-ups stay on that subject', () => {
    expect(photoLookupQuery(
      'Что за блюдо на фото? найди мне сайт с таким рецептом',
      'Картофельное пюре с мясным соусом\nНа тарелке пюре и соус.',
    )).toBe('Картофельное пюре с мясным соусом рецепт')
    expect(followUpLines([
      'Попробуем настроить профиль?',
      'Хочешь узнать мои возможности?',
      'Какая погода будет завтра в Новосибирске',
      'Прогноз на неделю',
    ].join('\n'), 'Завтра в Новосибирске пасмурно.')).toEqual([
      'Какая погода будет завтра в Новосибирске',
      'Прогноз на неделю',
    ])
    const thread = [
      { role: 'user' as const, text: 'Какая погода завтра в Новосибирске?' },
      { role: 'assistant' as const, text: 'Завтра пасмурно, около +4.' },
      { role: 'user' as const, text: 'Что за блюдо на фото? Дай состав и ссылку на рецепт.' },
      { role: 'assistant' as const, text: 'На фото блинчики с бананом и вареньем.' },
    ]
    expect(followUpSubject(thread).map((turn) => turn.text)).toEqual([
      'Что за блюдо на фото? Дай состав и ссылку на рецепт.',
      'На фото блинчики с бананом и вареньем.',
    ])
    expect(followUpLines([
      'Какая температура сейчас в Новосибирске?',
      'Какой состав у этих блинчиков?',
      'Покажи похожий рецепт',
    ].join('\n'), thread[3]?.text)).toEqual([
      'Какой состав у этих блинчиков?',
      'Покажи похожий рецепт',
    ])
    expect(followUpLines([
      'Как тебя зовут?',
      'Что ты хочешь обсудить сегодня?',
      'Можно ли мне рассказать о себе подробнее?',
      'Расскажи о себе',
    ].join('\n'), 'Привет! Я Нора. Чем могу помочь?')).toEqual(['Расскажи о себе'])
  })

  test('a search call keeps its query and findings stay short', () => {
    const calls = readWebSearchCalls([
      { id: 'call_1', function: { name: 'web_search', arguments: '{"query":"столица Австралии"}' } },
    ])
    expect(webSearchQuery(calls[0]!)).toBe('столица Австралии')
    expect(formatWebSearchFindings([])).toBe('Ничего не нашлось.')
    expect(formatWebSearchFindings([{ title: 'Канберра', url: 'https://example.test', content: 'Столица.' }])).toContain(
      'https://example.test',
    )
  })
})
