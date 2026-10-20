export type NewsChannel = {
  id: string
  handle: string
  href: string
}

const STORAGE_KEY = 'ai-news.news-channels'
const HANDLE = /^[A-Za-z][A-Za-z0-9_]{4,31}$/

export function parseTelegramChannelLink(raw: string): Pick<NewsChannel, 'handle' | 'href'> | null {
  const text = raw.trim()
  if (!text) return null

  let handle = ''
  if (text.startsWith('@')) {
    handle = text.slice(1)
  } else {
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
    handle = parts[0] ?? ''
    if (!handle || handle.startsWith('+') || handle === 'joinchat') return null
  }

  if (!HANDLE.test(handle)) return null
  return { handle, href: `https://t.me/${handle}` }
}

export function readNewsChannels(): NewsChannel[] {
  if (typeof localStorage === 'undefined') return []
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]') as unknown
    if (!Array.isArray(parsed)) return []
    return parsed.flatMap((item) => {
      if (!item || typeof item !== 'object') return []
      const row = item as Partial<NewsChannel>
      const parsedLink = typeof row.href === 'string' ? parseTelegramChannelLink(row.href) : null
      if (!parsedLink || typeof row.id !== 'string' || !row.id) return []
      return [{ id: row.id, ...parsedLink }]
    })
  } catch {
    return []
  }
}

export function writeNewsChannels(channels: readonly NewsChannel[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(channels))
}
