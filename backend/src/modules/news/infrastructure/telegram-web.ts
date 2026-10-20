import type { AppEnv } from '../../../env'
import type { TelegramChannelSource } from '../application/ports'
import { NewsFailure } from '../domain/errors'
import { isAllowedTelegramMediaUrl } from '../domain/media-url'
import { parseTelegramChannelPage } from '../domain/telegram-page'

const BROWSER_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36'
const MAX_PAGES = 6

export type TelegramWebEnv = Pick<AppEnv, 'GEMINI_API_HOST' | 'GEMINI_API_PORT' | 'GEMINI_PROXY_TOKEN'>

export function usesTelegramWebProxy(env: TelegramWebEnv) {
  const host = env.GEMINI_API_HOST
  return Boolean(env.GEMINI_PROXY_TOKEN)
    && host.length > 0
    && host !== 'generativelanguage.googleapis.com'
    && !host.endsWith('.googleapis.com')
}

export function channelPageRequest(env: TelegramWebEnv, handle: string, before?: number) {
  const search = before ? `?before=${before}` : ''
  const path = `/s/${encodeURIComponent(handle)}${search}`
  const headers: Record<string, string> = {
    Accept: 'text/html,application/xhtml+xml',
    'User-Agent': BROWSER_UA,
  }
  if (usesTelegramWebProxy(env) && env.GEMINI_PROXY_TOKEN) {
    headers.Authorization = `Bearer ${env.GEMINI_PROXY_TOKEN}`
    headers['X-Gemini-Proxy-Token'] = env.GEMINI_PROXY_TOKEN
    return {
      url: `https://${env.GEMINI_API_HOST}:${env.GEMINI_API_PORT}/tme${path}`,
      headers,
    }
  }
  return { url: `https://t.me${path}`, headers }
}

export function mediaRequest(env: TelegramWebEnv, upstream: string, range?: string) {
  if (!isAllowedTelegramMediaUrl(upstream)) {
    throw new NewsFailure('bad_request', 'Media host is not allowed')
  }
  const headers: Record<string, string> = {
    Accept: '*/*',
    'User-Agent': BROWSER_UA,
  }
  if (range) headers.Range = range
  if (usesTelegramWebProxy(env) && env.GEMINI_PROXY_TOKEN) {
    headers.Authorization = `Bearer ${env.GEMINI_PROXY_TOKEN}`
    headers['X-Gemini-Proxy-Token'] = env.GEMINI_PROXY_TOKEN
    headers['X-Upstream-Url'] = upstream
    return {
      url: `https://${env.GEMINI_API_HOST}:${env.GEMINI_API_PORT}/cdn`,
      headers,
    }
  }
  return { url: upstream, headers }
}

export function createTelegramChannelSource(env: TelegramWebEnv): TelegramChannelSource {
  return {
    async loadRecent(handle, since) {
      const found = new Map<number, ReturnType<typeof parseTelegramChannelPage>[number]>()
      let before: number | undefined
      for (let page = 0; page < MAX_PAGES; page += 1) {
        const html = await fetchChannelHtml(env, handle, before)
        const parsed = parseTelegramChannelPage(html).filter((post) => post.channelHandle === handle)
        if (parsed.length === 0) break
        const oldest = parsed.reduce((left, right) => (left.postedAt < right.postedAt ? left : right))
        for (const post of parsed) {
          if (post.postedAt >= since) found.set(post.telegramPostId, post)
        }
        if (oldest.postedAt < since || before === oldest.telegramPostId) break
        before = oldest.telegramPostId
      }
      return [...found.values()].sort((left, right) => right.postedAt.getTime() - left.postedAt.getTime())
    },
    openMedia(url, range) {
      return fetchTelegramMedia(env, url, range)
    },
  }
}

async function fetchChannelHtml(env: TelegramWebEnv, handle: string, before?: number) {
  const request = channelPageRequest(env, handle, before)
  let response: Response
  try {
    response = await fetch(request.url, {
      headers: request.headers,
      redirect: 'follow',
      signal: AbortSignal.timeout(25_000),
    })
  } catch (error) {
    throw new NewsFailure('upstream', safeError(error))
  }
  if (!response.ok) throw new NewsFailure('upstream', `Telegram page returned ${response.status}`)
  return response.text()
}

async function fetchTelegramMedia(env: TelegramWebEnv, upstream: string, range?: string) {
  const request = mediaRequest(env, upstream, range)
  let response: Response
  try {
    response = usesTelegramWebProxy(env)
      ? await fetch(request.url, {
        headers: request.headers,
        redirect: 'follow',
        signal: AbortSignal.timeout(60_000),
      })
      : await fetchDirectMedia(request.url, request.headers)
  } catch (error) {
    throw new NewsFailure('upstream', safeError(error))
  }
  if (response.status >= 400) throw new NewsFailure('not_found', 'Telegram media is unavailable')
  const type = response.headers.get('content-type') ?? 'application/octet-stream'
  if (type.includes('text/html')) throw new NewsFailure('upstream', 'Telegram media was not a file')

  const headers = new Headers()
  headers.set('Content-Type', type)
  headers.set('Cache-Control', 'private, max-age=3600')
  headers.set('Accept-Ranges', response.headers.get('accept-ranges') ?? 'bytes')
  for (const name of ['content-length', 'content-range']) {
    const value = response.headers.get(name)
    if (value) headers.set(name, value)
  }
  return new Response(response.body, { status: response.status, headers })
}

async function fetchDirectMedia(url: string, headers: Record<string, string>) {
  let current = url
  for (let hop = 0; hop < 4; hop += 1) {
    const response = await fetch(current, {
      headers,
      redirect: 'manual',
      signal: AbortSignal.timeout(60_000),
    })
    if (response.status < 300 || response.status >= 400) return response
    const location = response.headers.get('location')
    if (!location) throw new NewsFailure('upstream', 'Telegram redirect was empty')
    const next = new URL(location, current).toString()
    if (!isAllowedTelegramMediaUrl(next)) throw new NewsFailure('upstream', 'Telegram redirect left the allowlist')
    current = next
  }
  throw new NewsFailure('upstream', 'Telegram redirect loop')
}

function safeError(error: unknown) {
  const message = error instanceof Error ? error.message : 'network error'
  return message.replace(/https?:\/\/\S+/g, '[url]')
}
