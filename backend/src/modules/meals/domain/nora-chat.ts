import { MealsFailure } from './errors'

export type NoraChatImage = { base64: string; mime?: string }

export type NoraChatTurn = {
  role: 'user' | 'assistant'
  text: string
  images?: NoraChatImage[]
}

export type NoraChatModels = { text: string; vision: string; search?: boolean }

const MAX_CHAT_IMAGES = 4

export const NORA_WEB_SEARCH_TOOL = {
  type: 'function' as const,
  function: {
    name: 'web_search',
    description: 'Ищет свежие и проверяемые факты в интернете и возвращает заголовки, ссылки и короткие выдержки.',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Короткий поисковый запрос на языке пользователя' },
      },
      required: ['query'],
    },
  },
}

function chatSystem(search: boolean) {
  const lines = [
    'Тебя зовут Nora. Ты собеседник в настройках приложения.',
    'Отвечай обычным текстом на языке пользователя.',
    'Не возвращай JSON и не оформляй карточку приёма пищи, пока об этом прямо не попросили.',
  ]
  if (search) {
    lines.push(
      'Интернет для этого ответа включён. Ниже результаты поиска. Ответь по ним и назови ссылку из результатов.',
      'Не говори, что доступа к сети нет. Не выдумывай факты, которых в результатах нет.',
    )
  } else {
    lines.push(
      'В этом ответе интернета нет. Не ставь ссылки и не повторяй свежие факты из прошлых ответов.',
      'Если без страницы из сети ответить нельзя, так и скажи.',
    )
  }
  return lines.join(' ')
}

export type NoraWebSearchCall = { id: string; name: string; arguments: string }

export function readWebSearchCalls(toolCalls: unknown): NoraWebSearchCall[] {
  if (!Array.isArray(toolCalls)) return []
  const calls: NoraWebSearchCall[] = []
  for (const raw of toolCalls) {
    if (!raw || typeof raw !== 'object') continue
    const call = raw as { id?: unknown; function?: { name?: unknown; arguments?: unknown } }
    const name = typeof call.function?.name === 'string' ? call.function.name : ''
    if (!name) continue
    const id = typeof call.id === 'string' && call.id.trim() ? call.id : `call-${calls.length + 1}`
    let args = call.function?.arguments
    if (args && typeof args === 'object') args = JSON.stringify(args)
    const argumentsText = typeof args === 'string' ? args : '{}'
    calls.push({ id, name, arguments: argumentsText })
  }
  return calls.slice(0, 2)
}

export function webSearchQuery(call: NoraWebSearchCall) {
  if (call.name !== 'web_search') return ''
  try {
    const parsed = JSON.parse(call.arguments) as { query?: unknown }
    return typeof parsed.query === 'string' ? parsed.query.trim().slice(0, 300) : ''
  } catch {
    return ''
  }
}

export function formatWebSearchFindings(
  hits: ReadonlyArray<{ title: string; url: string; content: string }>,
) {
  if (hits.length === 0) return 'Ничего не нашлось.'
  return hits
    .slice(0, 5)
    .map((hit, index) => {
      const content = hit.content.replace(/\s+/g, ' ').trim().slice(0, 280)
      return `${index + 1}. ${hit.title.trim()}\n${hit.url.trim()}\n${content}`
    })
    .join('\n\n')
}

function imageMime(mime: string | undefined) {
  const normalized = (mime || '').split(';')[0]?.trim().toLowerCase()
  if (
    normalized === 'image/jpeg'
    || normalized === 'image/png'
    || normalized === 'image/webp'
    || normalized === 'image/gif'
  ) {
    return normalized
  }
  return 'image/jpeg'
}

function turnImages(turn: NoraChatTurn) {
  return (turn.images ?? []).filter((image) => image.base64.trim())
}

/** Latest photos stay; older ones drop so the vision model still fits the thread. */
function keptImageKeys(turns: readonly NoraChatTurn[]) {
  const kept = new Set<string>()
  let budget = MAX_CHAT_IMAGES
  for (let index = turns.length - 1; index >= 0 && budget > 0; index -= 1) {
    const images = turnImages(turns[index]!)
    for (let imageIndex = images.length - 1; imageIndex >= 0 && budget > 0; imageIndex -= 1) {
      kept.add(`${index}:${imageIndex}`)
      budget -= 1
    }
  }
  return kept
}

function userContent(text: string, images: NoraChatImage[]) {
  if (!images.length) return text
  return [
    { type: 'text', text: text || 'Посмотри на изображение.' },
    ...images.map((image) => ({
      type: 'image_url',
      image_url: { url: `data:${imageMime(image.mime)};base64,${image.base64}` },
    })),
  ]
}

const VISION_NOTE = 'Что видно на изображении:'

const APP_OFFER = /настро(ить|им|йки)|профил|возможност|раздел приложения|баз[аеуы] знан/i
const ASSISTANT_OFFER = /^(хочешь|давай|попробуем|могу |я помогу|расскажу)/i

/** The next things the person might ask, about the same subject. */
export function followUpLines(raw: string) {
  return raw
    .split('\n')
    .map((line) => line.replace(/^\s*(?:[-*•]|\d+[.)])\s*/, '').replace(/^["«]|["»]$/g, '').trim())
    .filter((line) => line.length > 1 && line.length <= 140)
    .filter((line) => !APP_OFFER.test(line) && !ASSISTANT_OFFER.test(line))
    .slice(0, 3)
}

/** Search the thing on the photo, not the sentence «что на фото». */
export function photoLookupQuery(userAsk: string, visionNote: string) {
  const note = visionNote.replace(/\s+/g, ' ').trim()
  const subject = (visionNote.split('\n').map((line) => line.trim()).find(Boolean) ?? note).slice(0, 160)
  const ask = userAsk.replace(/\s+/g, ' ').trim()
  if (!subject) return ask.slice(0, 300)
  const wantsRecipe = /рецепт|сайт|ссылк|где готов|как готов|блюд/i.test(ask)
  return (wantsRecipe ? `${subject} рецепт` : subject).slice(0, 300)
}

/** A photo together with a question, a file, or search is read first, then answered as text. */
export function answerNeedsVisionReading(
  turns: readonly NoraChatTurn[],
  models: NoraChatModels,
  knowledge?: string,
) {
  const last = turns.at(-1)
  if (!last || last.role !== 'user' || turnImages(last).length === 0) return false
  return Boolean(last.text.trim() || models.search || knowledge?.trim())
}

/** The vision model only describes the latest photo. The text model writes the reply. */
export function buildVisionGlance(turns: readonly NoraChatTurn[], models: NoraChatModels) {
  const last = turns.at(-1)
  if (!last || last.role !== 'user' || turnImages(last).length === 0) {
    throw new MealsFailure('bad_request', 'Напишите сообщение или прикрепите фото')
  }
  const images = turnImages(last).slice(-MAX_CHAT_IMAGES)
  return {
    model: models.vision,
    messages: [
      {
        role: 'system' as const,
        content:
          'Ты разбираешь изображение для другого ответа. Первой строкой напиши короткое название того, что на снимке. Если это еда — название блюда, а если точное имя неясно — ближайшее похожее блюдо. Дальше двумя-тремя предложениями опиши, что видно. Если спрашивают калорийность или КБЖУ, добавь оценку порции и числа. Не ищи в интернете.',
      },
      { role: 'user' as const, content: userContent(last.text.trim(), images) },
    ],
    tools: false,
  }
}

/** Drops the pixels and leaves the vision reading where the text model can use it. */
export function noteVisionForText(turns: readonly NoraChatTurn[], note: string): NoraChatTurn[] {
  const seen = note.trim() || 'Снимок разобрать не удалось.'
  return turns.map((turn, index) => {
    const hadImage = turnImages(turn).length > 0
    if (index !== turns.length - 1) {
      return {
        role: turn.role,
        text: turn.text.trim() || (hadImage ? 'На прошлом сообщении было изображение.' : turn.text),
      }
    }
    const body = turn.text.trim()
    const text = body ? `${body}\n\n${VISION_NOTE}\n${seen}` : `${VISION_NOTE}\n${seen}`
    return { role: 'user', text }
  })
}

export function buildNoraChatRequest(
  turns: readonly NoraChatTurn[],
  models: NoraChatModels,
  knowledge?: string,
) {
  const last = turns.at(-1)
  if (!last || last.role !== 'user' || (!last.text.trim() && turnImages(last).length === 0)) {
    throw new MealsFailure('bad_request', 'Напишите сообщение или прикрепите фото')
  }

  const kept = keptImageKeys(turns)
  const visionOnly = turnImages(last).length > 0
  const knowledgeText = knowledge?.trim() ?? ''
  const internet = Boolean(models.search)
  const tools = internet && !visionOnly
  const knowledgeRules = internet
    ? 'Сейчас включена база знаний. Если выдержки начинаются с «Прикреплённый файл», это файл из сообщения: отвечай по нему и не пиши «В выбранной базе этого нет». Если в диалоге несколько файлов, бери тот, который назван в выдержках, даже если прошлый ответ был про другой. Вопрос о файле или таблице, вывод и расчёт отвечай словами по выдержкам. Список листов давай только когда просят перечень таблиц или построить одну из них. Факты из выдержек бери только оттуда и назови файл. Число, которого нет в выдержках, можно назвать только прямым расчётом из чисел файла и рядом укажи это число. Полное название из выдержек ставь как расшифровку аббревиатуры, если его первые буквы с ней совпадают. Если фактов несколько, вынеси их списком Markdown. Таблица — это один набор столбцов. Другие названия столбцов начинают другую таблицу, а строки под одним заголовком не дели. Если просят таблицу, а таких наборов несколько и человек не назвал какой именно, не строй таблицу Markdown и не склеивай наборы в один. Перечисли наборы столбцов и спроси, какой вывести. Если назван один, выведи только его отдельной таблицей Markdown: те же названия и числа, пустую ячейку оставь пустой. «Первую», «вторую», «третью» и номер считай выбором: порядок сверху вниз по выдержкам и тот же, что в твоём прошлом списке. Построй выбранный набор и не пиши, что его нет. Если в выдержках уже лежит таблица Markdown, перепиши её в ответ теми же ячейками, перед ней можно одно короткое предложение. Все наборы сразу выводи только когда человек прямо просит все, и каждый отдельным блоком. Не пиши «В выбранной базе этого нет» и не обсуждай шрифт, сетку и размер ячеек. Если нужного факта в выдержках нет, ответь по результатам поиска ниже.'
    : 'Сейчас включена база знаний, и она единственный источник этого ответа. Если выдержки начинаются с «Прикреплённый файл», это файл из сообщения: отвечай по нему и не пиши «В выбранной базе этого нет». Если в диалоге несколько файлов, бери тот, который назван в выдержках, даже если прошлый ответ был про другой. Вопрос о файле или таблице, вывод и расчёт отвечай словами по выдержкам. Список листов давай только когда просят перечень таблиц или построить одну из них. Пиши только факты из выдержек. Число, которого нет в выдержках, можно назвать только прямым расчётом из чисел файла и рядом укажи это число. Полное название из выдержек ставь как расшифровку аббревиатуры, если его первые буквы с ней совпадают. Только если выдержки говорят, что подходящих фрагментов нет, ответь «В выбранной базе этого нет» и не добавляй догадку. Пока строки в выдержках есть, эту фразу не пиши. Не упрощай оговорку, в которой два варианта. Назови файл. Если фактов несколько, вынеси их списком Markdown. Таблица — это один набор столбцов. Другие названия столбцов начинают другую таблицу, а строки под одним заголовком не дели. Если просят таблицу, а таких наборов несколько и человек не назвал какой именно, не строй таблицу Markdown и не склеивай наборы в один. Перечисли наборы столбцов и спроси, какой вывести. Если назван один, выведи только его отдельной таблицей Markdown: те же названия и числа, пустую ячейку оставь пустой. «Первую», «вторую», «третью» и номер считай выбором: порядок сверху вниз по выдержкам и тот же, что в твоём прошлом списке. Построй выбранный набор и не пиши, что его нет. Если в выдержках уже лежит таблица Markdown, перепиши её в ответ теми же ячейками, перед ней можно одно короткое предложение. Все наборы сразу выводи только когда человек прямо просит все, и каждый отдельным блоком. Не пиши «В выбранной базе этого нет» и не обсуждай шрифт, сетку и размер ячеек.'
  const glance = last.text.includes(VISION_NOTE)
  const photoRules = visionOnly
    ? ' Если на фото еда и спрашивают калорийность или КБЖУ, оцени по снимку блюдо, примерную порцию и числа: калории, белки, жиры, углеводы. Напиши, что это оценка по фото. Не отказывайся из-за того, что порцию нельзя взвесить. Такая оценка не требует страницы из сети.'
    : glance
      ? internet
        ? ' В последнем сообщении блок «Что видно на изображении» — разбор снимка другой моделью. Сначала напиши, что на фото, по этому блоку. Потом дай рецепт или страницы из результатов поиска и назови ссылку. Если точное блюдо неясно, возьми похожее и так и скажи. Не представляйся. Не пиши, что не видишь изображение, и не предлагай другие сервисы распознавания.'
        : ' В последнем сообщении блок «Что видно на изображении» — разбор снимка. Ответь на вопрос по этому разбору. Не пиши, что не видишь изображение. Если на снимке еда и спрашивают калорийность или КБЖУ, оцени порцию и числа и напиши, что это оценка по фото.'
      : ''
  const meetingOnly = knowledgeText.startsWith('Расшифровки выбранных встреч.')
  const meetingRules = internet
    ? 'Сейчас включены расшифровки встреч. Ниже полный текст выбранной записи, реплики каждого спикера идут подряд. По ним отвечай на вопросы о встрече и скажи, о чём она. Если просят резюме по спикерам, собери все реплики каждого спикера в связный текст и назови спикера. Заголовок реплик — заданное имя. Если оно вида «Спикер 1», можно в скобках добавить, кого узнаёшь по речи: Спикер 1 (Михаил). Если имя уже не «Спикер», называй человека только им и не подменяй его на «Спикер». Не пиши, что полных высказываний нет, если его реплики в тексте есть. Деталь, которой в тексте нет, можно уточнить поиском.'
    : 'Сейчас включены расшифровки встреч, и они единственный источник этого ответа. Ниже полный текст выбранной записи, реплики каждого спикера идут подряд. По ним отвечай на вопросы о встрече и скажи, о чём она. Если просят резюме по спикерам, собери все реплики каждого спикера в связный текст и назови спикера. Заголовок реплик — заданное имя. Если оно вида «Спикер 1», можно в скобках добавить, кого узнаёшь по речи: Спикер 1 (Михаил). Если имя уже не «Спикер», называй человека только им и не подменяй его на «Спикер». Не пиши, что полных высказываний нет, если его реплики в тексте есть. Фразу «В выбранных встречах этого нет» пиши только если спрашивают факт, которого в этом тексте нет.'
  const contextRules = meetingOnly
    ? meetingRules
    : `${knowledgeRules}${knowledgeText.includes('Расшифровки выбранных встреч.') ? ' Текст встречи — выбранная запись целиком. По нему отвечай на вопросы и собирай резюме по спикерам из всех реплик. Заголовок реплик — заданное имя: «Спикер 1» можно подписать в скобках, уже заданное имя не подменяй на «Спикер». «В выбранных встречах этого нет» пиши только для факта, которого в этом тексте нет.' : ''}`
  const system = `${knowledgeText ? `${chatSystem(internet)} ${contextRules}\n\n${knowledgeText}` : chatSystem(internet)}${photoRules}`
  const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: unknown }> = [
    { role: 'system', content: system },
  ]

  turns.forEach((turn, index) => {
    if (turn.role === 'assistant') {
      const text = turn.text.trim()
      if (text) messages.push({ role: 'assistant', content: text })
      return
    }
    const images = visionOnly
      ? turnImages(turn).filter((_, imageIndex) => kept.has(`${index}:${imageIndex}`))
      : []
    const text = turn.text.trim() || (turnImages(turn).length > 0 ? 'На прошлом сообщении было изображение.' : '')
    if (!text && images.length === 0) return
    messages.push({ role: 'user', content: userContent(text, images) })
  })

  return {
    model: visionOnly ? models.vision : models.text,
    messages,
    tools,
  }
}
