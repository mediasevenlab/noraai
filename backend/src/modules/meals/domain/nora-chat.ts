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
    'Ты тестовый собеседник в настройках приложения.',
    'Отвечай обычным текстом на языке пользователя.',
    'Не возвращай JSON и не оформляй карточку приёма пищи, пока об этом прямо не попросили.',
  ]
  if (search) {
    lines.push(
      'Если нужен свежий или проверяемый факт из интернета, вызови web_search и ответь по его результатам.',
      'Не выдумывай, что нашлось в поиске.',
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

export function buildNoraChatRequest(turns: readonly NoraChatTurn[], models: NoraChatModels) {
  const last = turns.at(-1)
  if (!last || last.role !== 'user' || (!last.text.trim() && turnImages(last).length === 0)) {
    throw new MealsFailure('bad_request', 'Напишите сообщение или прикрепите фото')
  }

  const kept = keptImageKeys(turns)
  const seesImage = kept.size > 0
  const tools = Boolean(models.search) && !seesImage
  const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: unknown }> = [
    { role: 'system', content: chatSystem(tools) },
  ]

  turns.forEach((turn, index) => {
    if (turn.role === 'assistant') {
      const text = turn.text.trim()
      if (text) messages.push({ role: 'assistant', content: text })
      return
    }
    const images = turnImages(turn).filter((_, imageIndex) => kept.has(`${index}:${imageIndex}`))
    const text = turn.text.trim()
    if (!text && images.length === 0) return
    messages.push({ role: 'user', content: userContent(text, images) })
  })

  return {
    model: seesImage ? models.vision : models.text,
    messages,
    tools,
  }
}
