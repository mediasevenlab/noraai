import { MealsFailure } from './errors'

export type NoraChatImage = { base64: string; mime?: string }

export type NoraChatTurn = {
  role: 'user' | 'assistant'
  text: string
  images?: NoraChatImage[]
}

export type NoraChatModels = { text: string; vision: string }

const MAX_CHAT_IMAGES = 4

const CHAT_SYSTEM = [
  'Ты тестовый собеседник в настройках приложения.',
  'Отвечай обычным текстом на языке пользователя.',
  'Не возвращай JSON и не оформляй карточку приёма пищи, пока об этом прямо не попросили.',
].join(' ')

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
  const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: unknown }> = [
    { role: 'system', content: CHAT_SYSTEM },
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
  }
}
