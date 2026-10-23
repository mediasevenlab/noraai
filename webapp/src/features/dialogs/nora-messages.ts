import type { NoraModelChatMessage } from '@web-app-demo/contracts'

const MAX_TURNS = 30
const MAX_TEXT = 8000
const MAX_IMAGES = 8

type DialogPart = {
  type: string
  text?: string
  image?: string
  data?: string
  filename?: string
  mimeType?: string
}

type DialogTurn = {
  role: string
  content: readonly DialogPart[]
  attachments?: readonly { content?: readonly DialogPart[] }[]
}

function turnParts(message: DialogTurn) {
  const attached = (message.attachments ?? []).flatMap((attachment) => attachment.content ?? [])
  const seen = new Set<string>()
  const parts: DialogPart[] = []
  for (const part of [...message.content, ...attached]) {
    if (part.type === 'image' && part.image) {
      if (seen.has(part.image)) continue
      seen.add(part.image)
    }
    parts.push(part)
  }
  return parts
}

function imagePayload(image: string): { base64: string; mime: string } | null {
  const match = /^data:([^;,]+);base64,([\s\S]+)$/.exec(image)
  const mime = match?.[1]?.trim()
  const base64 = match?.[2]?.replace(/\s/g, '')
  if (!mime || !base64) return null
  return { base64, mime }
}

function toTurn(message: DialogTurn): NoraModelChatMessage | null {
  const texts: string[] = []
  const images: Array<{ base64: string; mime: string }> = []
  const files: Array<{ name: string; base64: string }> = []
  for (const part of turnParts(message)) {
    if (part.type === 'text' && part.text?.trim()) texts.push(part.text.trim())
    if (part.type === 'image' && part.image) {
      const image = imagePayload(part.image)
      if (image) images.push(image)
    }
    if (part.type === 'file' && part.data?.trim() && files.length === 0) {
      const name = part.filename?.trim() || 'файл'
      files.push({ name, base64: part.data.replace(/\s/g, '') })
    }
  }

  if (message.role === 'assistant') {
    const text = texts.join('\n').slice(0, MAX_TEXT)
    return text ? { role: 'assistant', text } : null
  }
  if (message.role !== 'user') return null

  const text = texts.join('\n').slice(0, MAX_TEXT)
  const kept = images.slice(0, MAX_IMAGES)
  const file = files[0]
  if (!text && kept.length === 0 && !file) return null
  return {
    role: 'user' as const,
    text,
    ...(kept.length > 0 ? { images: kept } : {}),
    ...(file ? { files: [file] } : {}),
  }
}

/** History the Nora model-chat endpoint accepts: last turn is the person, at most 30. */
export function toNoraMessages(messages: readonly DialogTurn[]): NoraModelChatMessage[] {
  const turns: NoraModelChatMessage[] = []
  for (const message of messages) {
    const turn = toTurn(message)
    if (turn) turns.push(turn)
  }
  while (turns.length > 0 && turns.at(-1)?.role !== 'user') turns.pop()
  return turns.slice(-MAX_TURNS)
}
