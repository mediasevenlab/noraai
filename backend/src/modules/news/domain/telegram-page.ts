import { isAllowedTelegramMediaUrl, type NewsMediaKind } from './media-url'

const HANDLE = /^[A-Za-z][A-Za-z0-9_]{4,31}$/
const MAX_TEXT = 8000
const MAX_MEDIA = 8

export type ParsedTelegramMedia = {
  kind: NewsMediaKind
  url: string
}

export type ParsedTelegramPost = {
  channelHandle: string
  telegramPostId: number
  text: string
  postedAt: Date
  media: ParsedTelegramMedia[]
}

/** Public t.me/s widget. One page is a chat transcript, oldest message first. */
export function parseTelegramChannelPage(html: string): ParsedTelegramPost[] {
  const posts: ParsedTelegramPost[] = []
  for (const part of html.split('data-post="').slice(1)) {
    const idMatch = part.match(/^([A-Za-z][A-Za-z0-9_]{4,31})\/(\d+)"/)
    if (!idMatch?.[1] || !idMatch[2]) continue
    const postedAtRaw = part.match(/datetime="([^"]+)"/)?.[1]
    const postedAt = postedAtRaw ? new Date(postedAtRaw) : null
    if (!postedAt || Number.isNaN(postedAt.getTime())) continue

    const text = messageText(part)
    const media = messageMedia(part)
    if (!text && media.length === 0) continue
    posts.push({
      channelHandle: idMatch[1].toLowerCase(),
      telegramPostId: Number(idMatch[2]),
      text,
      postedAt,
      media,
    })
  }
  return posts
}

export function newsChannelHandle(input: string) {
  const text = input.trim()
  if (!text) return null
  if (text.startsWith('@')) return HANDLE.test(text.slice(1)) ? text.slice(1).toLowerCase() : null
  if (HANDLE.test(text)) return text.toLowerCase()

  let url: URL
  try {
    url = new URL(/^https?:\/\//i.test(text) ? text : `https://${text}`)
  } catch {
    return null
  }
  const host = url.hostname.replace(/^www\./, '').toLowerCase()
  if (host !== 't.me' && host !== 'telegram.me') return null
  const parts = url.pathname.split('/').filter(Boolean)
  if (parts[0] === 's') parts.shift()
  const handle = parts[0] ?? ''
  if (!handle || handle.startsWith('+') || handle === 'joinchat' || !HANDLE.test(handle)) return null
  return handle.toLowerCase()
}

function messageText(slice: string) {
  const raw = slice.match(/js-message_text\b[^>]*>([\s\S]*?)<\/div>/i)?.[1] ?? ''
  const text = decodeHtml(raw.replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, ''))
    .replace(/\u00a0/g, ' ')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
  return text.slice(0, MAX_TEXT)
}

function messageMedia(slice: string) {
  const images: string[] = []
  const videos: string[] = []
  for (const match of slice.matchAll(/tgme_widget_message_photo_wrap\b[^>]*style="([^"]*)"/gi)) {
    pushUrl(images, cssUrl(match[1] ?? ''))
  }
  for (const match of slice.matchAll(/tgme_widget_message_video_thumb\b[^>]*style="([^"]*)"/gi)) {
    pushUrl(images, cssUrl(match[1] ?? ''))
  }
  for (const tag of slice.matchAll(/<video\b[^>]*>/gi)) {
    pushUrl(videos, attr(tag[0], 'src'))
  }
  for (const tag of slice.matchAll(/<source\b[^>]*>/gi)) {
    pushUrl(videos, attr(tag[0], 'src'))
  }

  const media: ParsedTelegramMedia[] = [
    ...images.map((url) => ({ kind: 'image' as const, url })),
    ...videos.map((url) => ({ kind: 'video' as const, url })),
  ]
  return media.slice(0, MAX_MEDIA)
}

function pushUrl(target: string[], value: string) {
  const url = absoluteMediaUrl(value)
  if (!url || target.includes(url) || !isAllowedTelegramMediaUrl(url)) return
  target.push(url)
}

function absoluteMediaUrl(value: string) {
  const decoded = decodeHtml(value).trim()
  if (!decoded) return ''
  if (decoded.startsWith('//')) return `https:${decoded}`
  return decoded
}

function cssUrl(style: string) {
  return style.match(/url\(\s*(['"]?)(https?:\/\/[^'")]+|\/\/[^'")]+)\1\s*\)/i)?.[2] ?? ''
}

function attr(tag: string, name: string) {
  const match = tag.match(new RegExp(`\\b${name}\\s*=\\s*("([^"]*)"|'([^']*)')`, 'i'))
  return match?.[2] ?? match?.[3] ?? ''
}

function decodeHtml(value: string) {
  return value
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code: string) => String.fromCodePoint(Number.parseInt(code, 16)))
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&mdash;/g, '—')
    .replace(/&ndash;/g, '–')
    .replace(/&laquo;/g, '«')
    .replace(/&raquo;/g, '»')
    .replace(/&hellip;/g, '…')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
}
