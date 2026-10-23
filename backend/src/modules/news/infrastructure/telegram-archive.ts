import type { AppEnv } from '../../../env'
import { NewsFailure } from '../domain/errors'
import { isAllowedTelegramMediaUrl, type NewsMediaKind } from '../domain/media-url'

type SendEnv = Pick<AppEnv, 'TELEGRAM_NEWS_BOT_TOKEN' | 'TELEGRAM_API_BASE' | 'GEMINI_PROXY_TOKEN'>

export type ArchiveSendInput = {
  chatId?: string
  text?: string
  handle?: string
  telegramPostId?: number
  media?: { kind?: string; url?: string; role?: string }[]
}

export type ArchiveSendResult = {
  chatId: string
  messageIds: number[]
  media: { kind: NewsMediaKind; fileId: string }[]
}

type TelegramMessage = {
  message_id?: number
  chat?: { id?: number | string }
  photo?: { file_id?: string }[]
  video?: { file_id?: string }
}

const DOWNLOAD_TIMEOUT_MS = 120_000
const SEND_TIMEOUT_MS = 60_000

export async function sendArchivePost(
  env: SendEnv,
  input: ArchiveSendInput,
  fetchImpl: typeof fetch = fetch,
): Promise<ArchiveSendResult> {
  const token = env.TELEGRAM_NEWS_BOT_TOKEN
  const chatId = String(input.chatId || '').trim()
  if (!token || !chatId) throw new NewsFailure('upstream', 'Archive channel is not configured')
  const base = (env.TELEGRAM_API_BASE ?? 'https://api.telegram.org').replace(/\/$/, '')
  const headers = proxyHeaders(env, base)
  const text = String(input.text || '').trim()
  const sourceLink = input.handle && Number.isInteger(input.telegramPostId)
    ? `https://t.me/${input.handle}/${input.telegramPostId}`
    : ''
  const caption = (text || sourceLink).slice(0, 1024)
  const files = []
  for (const item of input.media ?? []) {
    if (!item || item.role === 'poster' || (item.kind !== 'image' && item.kind !== 'video') || !item.url) continue
    if (!isAllowedTelegramMediaUrl(item.url)) throw new NewsFailure('upstream', 'Archive media address is not allowed')
    if (files.length >= 10) break
    files.push({ kind: item.kind, url: item.url })
  }

  const downloaded = []
  for (const file of files) {
    downloaded.push({ ...file, ...(await downloadMedia(fetchImpl, file.url, file.kind)) })
  }

  const payload = downloaded.length === 0
    ? await callTelegram(fetchImpl, base, token, 'sendMessage', headers, {
      chat_id: chatId,
      text: text.slice(0, 4096) || sourceLink || ' ',
      disable_web_page_preview: true,
    })
    : downloaded.length === 1
      ? await sendSingle(fetchImpl, base, token, headers, chatId, caption, downloaded[0]!)
      : await sendAlbum(fetchImpl, base, token, headers, chatId, caption, downloaded)

  const messages = readMessages(payload)
  const messageIds = messages.map((message) => message.message_id).filter((id): id is number => Number.isInteger(id))
  if (messageIds.length === 0) throw new NewsFailure('upstream', 'Telegram did not return a message id')
  const media = downloaded.flatMap((file, index) => {
    const fileId = fileIdOf(messages[index] ?? messages[0], file.kind)
    return fileId ? [{ kind: file.kind, fileId }] : []
  })
  return {
    chatId: String(messages[0]?.chat?.id ?? chatId),
    messageIds,
    media,
  }
}

async function sendSingle(
  fetchImpl: typeof fetch,
  base: string,
  token: string,
  headers: Record<string, string>,
  chatId: string,
  caption: string,
  file: { kind: NewsMediaKind; bytes: Uint8Array; mime: string },
) {
  const video = file.kind === 'video'
  const form = new FormData()
  form.set('chat_id', chatId)
  if (caption) form.set('caption', caption)
  form.set(video ? 'video' : 'photo', new Blob([file.bytes], { type: file.mime }), video ? 'clip.mp4' : 'photo.jpg')
  return callTelegram(fetchImpl, base, token, video ? 'sendVideo' : 'sendPhoto', headers, form)
}

async function sendAlbum(
  fetchImpl: typeof fetch,
  base: string,
  token: string,
  headers: Record<string, string>,
  chatId: string,
  caption: string,
  files: { kind: NewsMediaKind; bytes: Uint8Array; mime: string }[],
) {
  const form = new FormData()
  form.set('chat_id', chatId)
  form.set('media', JSON.stringify(files.map((file, index) => {
    const entry: { type: string; media: string; caption?: string } = {
      type: file.kind === 'video' ? 'video' : 'photo',
      media: `attach://file${index}`,
    }
    if (index === 0 && caption) entry.caption = caption
    return entry
  })))
  files.forEach((file, index) => {
    const video = file.kind === 'video'
    form.set(`file${index}`, new Blob([file.bytes], { type: file.mime }), video ? `clip-${index}.mp4` : `photo-${index}.jpg`)
  })
  return callTelegram(fetchImpl, base, token, 'sendMediaGroup', headers, form)
}

async function downloadMedia(fetchImpl: typeof fetch, url: string, kind: NewsMediaKind) {
  let lastError = new NewsFailure('upstream', 'Could not download the post media')
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const response = await fetchImpl(url, { signal: AbortSignal.timeout(DOWNLOAD_TIMEOUT_MS) })
      if (!response.ok) throw new NewsFailure('upstream', 'Could not download the post media')
      const mime = response.headers.get('content-type') ?? ''
      if (mime.includes('text/html')) throw new NewsFailure('upstream', 'Could not download the post media')
      const bytes = new Uint8Array(await response.arrayBuffer())
      if (bytes.byteLength === 0) throw new NewsFailure('upstream', 'Could not download the post media')
      return {
        bytes,
        mime: mime && !mime.includes('octet-stream') ? mime : kind === 'video' ? 'video/mp4' : 'image/jpeg',
      }
    } catch (error) {
      lastError = error instanceof NewsFailure ? error : new NewsFailure('upstream', 'Could not download the post media')
      if (attempt < 2) await delay(1000)
    }
  }
  throw lastError
}

async function callTelegram(
  fetchImpl: typeof fetch,
  base: string,
  token: string,
  method: string,
  headers: Record<string, string>,
  body: FormData | Record<string, unknown>,
  attempt = 0,
) {
  const json = !(body instanceof FormData)
  let response: Response
  try {
    response = await fetchImpl(`${base}/bot${token}/${method}`, {
      method: 'POST',
      headers: json ? { ...headers, 'content-type': 'application/json' } : headers,
      body: json ? JSON.stringify(body) : body,
      signal: AbortSignal.timeout(SEND_TIMEOUT_MS),
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'network error'
    throw new NewsFailure('upstream', clean(message))
  }
  const payload = await response.json().catch(() => null) as { ok?: boolean; description?: string; parameters?: { retry_after?: number }; result?: unknown } | null
  if (payload?.ok === true) return payload
  if (payload?.parameters?.retry_after && response.status === 429 && attempt < 1) {
    await delay(Math.min(payload.parameters.retry_after, 20) * 1000)
    return callTelegram(fetchImpl, base, token, method, headers, body, attempt + 1)
  }
  throw new NewsFailure('upstream', clean(payload?.description || 'Telegram request failed'))
}

function readMessages(payload: { result?: unknown }) {
  const result = payload.result
  const messages = Array.isArray(result) ? result : result ? [result] : []
  return messages.filter((item): item is TelegramMessage => Boolean(item) && typeof item === 'object')
}

function fileIdOf(message: TelegramMessage | undefined, kind: NewsMediaKind) {
  if (!message) return ''
  if (kind === 'video') return message.video?.file_id ?? ''
  const photos = message.photo ?? []
  return photos.length ? photos[photos.length - 1]?.file_id ?? '' : ''
}

function proxyHeaders(env: SendEnv, base: string) {
  if (env.GEMINI_PROXY_TOKEN && !base.includes('api.telegram.org')) return { 'X-Gemini-Proxy-Token': env.GEMINI_PROXY_TOKEN }
  return {}
}

function clean(value: string) {
  return value.replace(/bot\d+:[A-Za-z0-9_-]+/g, 'bot').replace(/https?:\/\/\S+/g, '[url]').slice(0, 300)
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export type ArchiveSyncFile =
  | { kind: NewsMediaKind; fileId: string }
  | { kind: NewsMediaKind; url: string }
  | { kind: NewsMediaKind; bytes: Uint8Array; mime: string }

type ReadyArchiveFile = {
  kind: NewsMediaKind
  fileId?: string
  bytes?: Uint8Array
  mime?: string
}

export async function syncArchiveEdition(
  env: SendEnv,
  input: {
    chatId?: string | null
    messageIds: number[]
    text: string
    previous: { kind: NewsMediaKind; fileId: string }[]
    next: ArchiveSyncFile[]
  },
  fetchImpl: typeof fetch = fetch,
): Promise<ArchiveSendResult> {
  const chatId = String(input.chatId || '').trim()
  const token = env.TELEGRAM_NEWS_BOT_TOKEN
  if (!token || !chatId) throw new NewsFailure('upstream', 'Archive channel is not configured')
  const base = (env.TELEGRAM_API_BASE ?? 'https://api.telegram.org').replace(/\/$/, '')
  const headers = proxyHeaders(env, base)
  const text = String(input.text || '').trim()
  const same = input.messageIds.length > 0
    && input.previous.length === input.next.length
    && input.next.every((file, index) => 'fileId' in file && file.fileId === input.previous[index]?.fileId && file.kind === input.previous[index]?.kind)
  if (same) {
    const messageId = input.messageIds[0]
    try {
      if (input.next.length === 0) {
        await callTelegram(fetchImpl, base, token, 'editMessageText', headers, {
          chat_id: chatId,
          message_id: messageId,
          text: text.slice(0, 4096) || ' ',
          disable_web_page_preview: true,
        })
      } else {
        await callTelegram(fetchImpl, base, token, 'editMessageCaption', headers, {
          chat_id: chatId,
          message_id: messageId,
          caption: text.slice(0, 1024),
        })
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : ''
      if (!/message is not modified/i.test(message)) throw error
    }
    return {
      chatId,
      messageIds: input.messageIds,
      media: input.next.flatMap((file) => 'fileId' in file && file.fileId ? [{ kind: file.kind, fileId: file.fileId }] : []),
    }
  }

  const ready = []
  for (const file of input.next) ready.push(await readyFile(fetchImpl, file))
  const sent = await sendReady(fetchImpl, base, token, headers, chatId, text, ready)
  const messages = readMessages(sent)
  const messageIds = messages.map((message) => message.message_id).filter((id): id is number => Number.isInteger(id))
  if (messageIds.length === 0) throw new NewsFailure('upstream', 'Telegram did not return a message id')
  try {
    await deleteArchiveMessages(fetchImpl, base, token, headers, chatId, input.messageIds)
  } catch (error) {
    await deleteArchiveMessages(fetchImpl, base, token, headers, chatId, messageIds).catch(() => undefined)
    throw error
  }
  const media = ready.flatMap((file, index) => {
    const fileId = file.fileId || fileIdOf(messages[index] ?? messages[0], file.kind)
    return fileId ? [{ kind: file.kind, fileId }] : []
  })
  return { chatId: String(messages[0]?.chat?.id ?? chatId), messageIds, media }
}

async function readyFile(fetchImpl: typeof fetch, file: ArchiveSyncFile): Promise<ReadyArchiveFile> {
  if ('bytes' in file) return { kind: file.kind, bytes: file.bytes, mime: file.mime }
  if ('fileId' in file && file.fileId) return { kind: file.kind, fileId: file.fileId }
  if ('url' in file && file.url) {
    const downloaded = await downloadMedia(fetchImpl, file.url, file.kind)
    return { kind: file.kind, bytes: downloaded.bytes, mime: downloaded.mime }
  }
  throw new NewsFailure('upstream', 'Archive media is missing')
}

async function sendReady(
  fetchImpl: typeof fetch,
  base: string,
  token: string,
  headers: Record<string, string>,
  chatId: string,
  text: string,
  files: ReadyArchiveFile[],
) {
  const caption = text.slice(0, 1024)
  if (files.length === 0) {
    return callTelegram(fetchImpl, base, token, 'sendMessage', headers, {
      chat_id: chatId,
      text: text.slice(0, 4096) || ' ',
      disable_web_page_preview: true,
    })
  }
  if (files.length === 1 && files[0]?.fileId && !files[0].bytes) {
    const file = files[0]
    const video = file.kind === 'video'
    return callTelegram(fetchImpl, base, token, video ? 'sendVideo' : 'sendPhoto', headers, {
      chat_id: chatId,
      [video ? 'video' : 'photo']: file.fileId,
      ...(caption ? { caption } : {}),
    })
  }
  if (files.length === 1 && files[0]?.bytes) {
    return sendSingle(fetchImpl, base, token, headers, chatId, caption, {
      kind: files[0].kind,
      bytes: files[0].bytes,
      mime: files[0].mime || (files[0].kind === 'video' ? 'video/mp4' : 'image/jpeg'),
    })
  }
  const form = new FormData()
  form.set('chat_id', chatId)
  form.set('media', JSON.stringify(files.map((file, index) => {
    const entry: { type: string; media: string; caption?: string } = {
      type: file.kind === 'video' ? 'video' : 'photo',
      media: file.fileId && !file.bytes ? file.fileId : `attach://file${index}`,
    }
    if (index === 0 && caption) entry.caption = caption
    return entry
  })))
  files.forEach((file, index) => {
    if (!file.bytes) return
    const video = file.kind === 'video'
    form.set(`file${index}`, new Blob([file.bytes], { type: file.mime }), video ? `clip-${index}.mp4` : `photo-${index}.jpg`)
  })
  return callTelegram(fetchImpl, base, token, 'sendMediaGroup', headers, form)
}

async function deleteArchiveMessages(
  fetchImpl: typeof fetch,
  base: string,
  token: string,
  headers: Record<string, string>,
  chatId: string,
  messageIds: number[],
) {
  for (const messageId of messageIds) {
    try {
      await callTelegram(fetchImpl, base, token, 'deleteMessage', headers, { chat_id: chatId, message_id: messageId })
    } catch (error) {
      const message = error instanceof Error ? error.message : ''
      if (/message to delete not found|message_id_invalid/i.test(message)) continue
      throw error
    }
  }
}
