import type { AppEnv } from '../../../env'
import type { ArchivePublication, NewsArchive } from '../application/ports'
import { syncArchiveEdition } from './telegram-archive'
import { NewsFailure } from '../domain/errors'
import type { ParsedTelegramMedia } from '../domain/telegram-page'

type ArchiveEnv = Pick<AppEnv, 'N8N_NEWS_ARCHIVE_WEBHOOK_URL' | 'TELEGRAM_NEWS_BOT_TOKEN' | 'TELEGRAM_API_BASE' | 'GEMINI_PROXY_TOKEN'>

export function createNewsArchive(env: ArchiveEnv, fetchImpl: typeof fetch = fetch): NewsArchive {
  return {
    async publish(channels) {
      const body = await callWebhook(fetchImpl, env.N8N_NEWS_ARCHIVE_WEBHOOK_URL, {
        action: 'publish',
        channels: channels.map((channel) => ({
          handle: channel.handle,
          posts: channel.posts.map((post) => ({
            telegramPostId: post.telegramPostId,
            text: post.text,
            media: post.media.map((item) => ({
              kind: item.kind,
              url: item.url,
              ...(item.role ? { role: item.role } : {}),
            })),
          })),
        })),
      }, 300_000)
      const rollback = readRollback(body)
      if (rollback) {
        try {
          const removed = await callWebhook(fetchImpl, env.N8N_NEWS_ARCHIVE_WEBHOOK_URL, {
            action: 'delete',
            chatId: rollback.chatId,
            messageIds: rollback.messageIds,
          }, 30_000)
          const removedOk = Boolean(removed && typeof removed === 'object' && (removed as { ok?: unknown }).ok === true)
          if (!removedOk) console.error('news archive rollback failed', 'delete was not confirmed')
        } catch (error) {
          const message = error instanceof Error ? error.message : 'rollback failed'
          console.error('news archive rollback failed', message.replace(/https?:\/\/\S+/g, '[url]'))
        }
      }
      try {
        return readPublishResult(body)
      } catch (error) {
        const failed = body && typeof body === 'object' ? readFailure((body as { failed?: unknown }).failed) : null
        if (failed) console.error('news archive publish failed', failed.handle, failed.message.replace(/https?:\/\/\S+/g, '[url]'))
        throw error
      }
    },
    async remove(chatId, messageIds) {
      const body = await callWebhook(fetchImpl, env.N8N_NEWS_ARCHIVE_WEBHOOK_URL, {
        action: 'delete',
        chatId,
        messageIds,
      }, 30_000)
      if (body.ok !== true) {
        throw new NewsFailure('upstream', 'Could not delete the archive post')
      }
    },
    revise(edit) {
      return syncArchiveEdition(env, edit, fetchImpl)
    },
    openFile(fileId, kind, range) {
      return openTelegramFile(fetchImpl, env, fileId, kind, range)
    },
  }
}

async function callWebhook(
  fetchImpl: typeof fetch,
  webhookUrl: string | undefined,
  payload: unknown,
  timeoutMs: number,
) {
  if (!webhookUrl) throw new NewsFailure('upstream', 'Archive channel is not configured')
  let response: Response
  try {
    response = await fetchImpl(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(timeoutMs),
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'network error'
    throw new NewsFailure('upstream', message.replace(/https?:\/\/\S+/g, '[url]'))
  }
  if (!response.ok) throw new NewsFailure('upstream', 'Archive channel is unavailable')
  return response.json() as Promise<unknown>
}

export function readPublishResult(body: unknown): { published: ArchivePublication[]; failed: { handle: string; message: string } | null } {
  if (!body || typeof body !== 'object') throw new NewsFailure('upstream', 'Archive channel returned an empty result')
  const record = body as { published?: unknown; failed?: unknown }
  const published = Array.isArray(record.published) ? record.published.flatMap(readPublication) : []
  const failed = readFailure(record.failed)
  if (published.length === 0 && failed) throw new NewsFailure('upstream', 'Could not publish to the archive channel')
  return { published, failed }
}

function readPublication(value: unknown): ArchivePublication[] {
  if (!value || typeof value !== 'object') return []
  const row = value as Partial<ArchivePublication> & { media?: unknown }
  const messageIds = Array.isArray(row.messageIds) ? row.messageIds.filter((item): item is number => Number.isInteger(item)) : []
  if (typeof row.handle !== 'string' || !Number.isInteger(row.telegramPostId) || typeof row.chatId !== 'string' || messageIds.length === 0) {
    return []
  }
  const media = Array.isArray(row.media) ? row.media.flatMap((item) => {
    if (!item || typeof item !== 'object') return []
    const mediaRow = item as { kind?: unknown; fileId?: unknown }
    if ((mediaRow.kind !== 'image' && mediaRow.kind !== 'video') || typeof mediaRow.fileId !== 'string' || !mediaRow.fileId) return []
    return [{ kind: mediaRow.kind, fileId: mediaRow.fileId }]
  }) : []
  return [{
    handle: row.handle,
    telegramPostId: row.telegramPostId as number,
    chatId: row.chatId,
    messageIds,
    media,
  }]
}

function readRollback(body: unknown) {
  if (!body || typeof body !== 'object') return null
  const value = (body as { rollback?: unknown }).rollback
  if (!value || typeof value !== 'object') return null
  const row = value as { chatId?: unknown; messageIds?: unknown }
  const messageIds = Array.isArray(row.messageIds) ? row.messageIds.filter((item): item is number => Number.isInteger(item)) : []
  if (typeof row.chatId !== 'string' || !row.chatId || messageIds.length === 0) return null
  return { chatId: row.chatId, messageIds }
}

function readFailure(value: unknown) {
  if (!value || typeof value !== 'object') return null
  const row = value as { handle?: unknown; message?: unknown }
  if (typeof row.handle !== 'string') return null
  const message = typeof row.message === 'string' ? row.message.replace(/bot\d+:[A-Za-z0-9_-]+/g, 'bot') : 'Could not publish to the archive channel'
  return { handle: row.handle, message }
}

async function openTelegramFile(
  fetchImpl: typeof fetch,
  env: ArchiveEnv,
  fileId: string,
  kind: ParsedTelegramMedia['kind'],
  range?: string,
) {
  const token = env.TELEGRAM_NEWS_BOT_TOKEN
  if (!token) throw new NewsFailure('not_found', 'Telegram media is unavailable')
  const base = (env.TELEGRAM_API_BASE ?? 'https://api.telegram.org').replace(/\/$/, '')
  const headers: Record<string, string> = { 'content-type': 'application/json' }
  if (env.GEMINI_PROXY_TOKEN && !base.includes('api.telegram.org')) headers['X-Gemini-Proxy-Token'] = env.GEMINI_PROXY_TOKEN
  let info: Response
  try {
    info = await fetchImpl(`${base}/bot${token}/getFile`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ file_id: fileId }),
      signal: AbortSignal.timeout(20_000),
    })
  } catch {
    throw new NewsFailure('not_found', 'Telegram media is unavailable')
  }
  const payload = await info.json() as { ok?: boolean; result?: { file_path?: string } }
  const filePath = payload.ok ? payload.result?.file_path : ''
  if (!filePath) throw new NewsFailure('not_found', 'Telegram media is unavailable')
  const fileHeaders: Record<string, string> = {}
  if (range) fileHeaders.Range = range
  if (headers['X-Gemini-Proxy-Token']) fileHeaders['X-Gemini-Proxy-Token'] = headers['X-Gemini-Proxy-Token']
  const file = await fetchImpl(`${base}/file/bot${token}/${filePath}`, {
    headers: fileHeaders,
    signal: AbortSignal.timeout(60_000),
  })
  if (file.status >= 400) throw new NewsFailure('not_found', 'Telegram media is unavailable')
  const upstreamType = file.headers.get('content-type') ?? ''
  if (upstreamType.includes('text/html')) throw new NewsFailure('upstream', 'Telegram media was not a file')
  const responseHeaders = new Headers()
  responseHeaders.set('Content-Type', upstreamType && !upstreamType.includes('octet-stream') ? upstreamType : kind === 'video' ? 'video/mp4' : 'image/jpeg')
  responseHeaders.set('Cache-Control', 'private, max-age=3600')
  responseHeaders.set('Accept-Ranges', file.headers.get('accept-ranges') ?? 'bytes')
  for (const name of ['content-length', 'content-range']) {
    const value = file.headers.get(name)
    if (value) responseHeaders.set(name, value)
  }
  return new Response(file.body, { status: file.status, headers: responseHeaders })
}
