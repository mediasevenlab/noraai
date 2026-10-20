import { createHmac, timingSafeEqual } from 'node:crypto'

const MEDIA_TTL_SECONDS = 6 * 60 * 60

const ALLOWED_HOSTS = new Set(['t.me', 'telegram.me', 'telegram.org'])

export type NewsMediaKind = 'image' | 'video'

export function isAllowedTelegramMediaUrl(value: string) {
  let url: URL
  try {
    url = new URL(value)
  } catch {
    return false
  }
  if (url.protocol !== 'https:' || url.username || url.password) return false
  const host = url.hostname.toLowerCase()
  if (ALLOWED_HOSTS.has(host)) return true
  return (
    host.endsWith('.telesco.pe')
    || host.endsWith('.telegram.org')
    || host.endsWith('.cdn-telegram.org')
    || host.endsWith('.telegram-cdn.org')
  )
}

export function createNewsMediaUrlBuilder(
  secret: string,
  ttlSeconds = MEDIA_TTL_SECONDS,
  now: () => number = Date.now,
) {
  return {
    build(postId: string, index: number) {
      const exp = expiry(now, ttlSeconds)
      const sig = sign(payload(postId, index, exp), secret)
      return `/api/news/posts/${postId}/media/${index}?exp=${exp}&sig=${encodeURIComponent(sig)}`
    },
    verify(postId: string, index: number, expRaw: string | undefined, sig: string | undefined) {
      if (!Number.isInteger(index) || index < 0 || !expRaw || !sig) return false
      const exp = Number(expRaw)
      if (!Number.isFinite(exp) || exp < Math.floor(now() / 1000)) return false
      const expected = sign(payload(postId, index, exp), secret)
      const left = Buffer.from(expected)
      const right = Buffer.from(sig)
      if (left.length !== right.length) return false
      return timingSafeEqual(left, right)
    },
  }
}

function expiry(now: () => number, ttlSeconds: number) {
  const nowSec = Math.floor(now() / 1000)
  return (Math.floor(nowSec / ttlSeconds) + 1) * ttlSeconds
}

function payload(postId: string, index: number, exp: number) {
  return `${postId}.${index}.${exp}`
}

function sign(value: string, secret: string) {
  return createHmac('sha256', secret).update(value).digest('base64url')
}
