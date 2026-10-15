import type { AppEnv } from '../../../env'
import { MealsFailure } from '../domain/errors'
import { formatWebSearchFindings } from '../domain/nora-chat'

const SPEECH_TIMEOUT_MS = 60_000
const SEARCH_TIMEOUT_MS = 20_000

function officeHeaders(url: string, apiKey: string | undefined, extra?: Record<string, string>) {
  const headers: Record<string, string> = { ...extra }
  if (apiKey && url.startsWith('https://')) headers.Authorization = `Bearer ${apiKey}`
  return headers
}

function speechMime(mime: string | undefined) {
  const base = (mime || '').split(';')[0]?.trim().toLowerCase()
  if (base === 'audio/x-wav') return 'audio/wav'
  if (
    base === 'audio/wav'
    || base === 'audio/webm'
    || base === 'audio/ogg'
    || base === 'audio/mpeg'
    || base === 'audio/mp4'
  ) {
    return base
  }
  return 'application/octet-stream'
}

export async function transcribeOfficeSpeech(
  env: Pick<AppEnv, 'LLM_STT_URL' | 'LLM_API_KEY'>,
  input: { audioBase64: string; audioMime?: string },
) {
  const baseUrl = env.LLM_STT_URL?.replace(/\/$/, '')
  if (!baseUrl) {
    throw new MealsFailure('misconfigured', 'Распознавание речи пока не настроено.')
  }
  const audio = Buffer.from(input.audioBase64, 'base64')
  if (audio.length === 0) {
    throw new MealsFailure('bad_request', 'Запись пустая. Скажите ещё раз.')
  }
  const endpoint = `${baseUrl}/v1/audio/transcriptions`
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: officeHeaders(endpoint, env.LLM_API_KEY, { 'Content-Type': speechMime(input.audioMime) }),
    body: audio,
    signal: AbortSignal.timeout(SPEECH_TIMEOUT_MS),
  })
  const raw = await response.text()
  if (!response.ok) {
    throw new MealsFailure('upstream', `Речь ${response.status}: ${raw.slice(0, 180)}`)
  }
  let payload: { text?: unknown; model?: unknown }
  try {
    payload = JSON.parse(raw) as typeof payload
  } catch {
    throw new MealsFailure('upstream', 'Речевая модель вернула не ответ, а обрывок')
  }
  return {
    ok: true as const,
    text: typeof payload.text === 'string' ? payload.text.trim() : '',
    model: typeof payload.model === 'string' && payload.model.trim() ? payload.model : 'gigaam-v3-e2e-rnnt',
  }
}

export async function searchOfficeWeb(baseUrl: string, query: string, apiKey?: string) {
  const url = new URL('/search', baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`)
  url.searchParams.set('q', query)
  url.searchParams.set('format', 'json')
  url.searchParams.set('language', 'ru')
  const response = await fetch(url, {
    headers: officeHeaders(url.toString(), apiKey),
    signal: AbortSignal.timeout(SEARCH_TIMEOUT_MS),
  })
  if (!response.ok) return 'Поиск сейчас недоступен.'
  let payload: { results?: Array<{ title?: unknown; url?: unknown; content?: unknown }> }
  try {
    payload = (await response.json()) as typeof payload
  } catch {
    return 'Поиск сейчас недоступен.'
  }
  const hits = (payload.results ?? [])
    .map((item) => ({
      title: typeof item.title === 'string' ? item.title : '',
      url: typeof item.url === 'string' ? item.url : '',
      content: typeof item.content === 'string' ? item.content : '',
    }))
    .filter((item) => item.title && item.url)
  return formatWebSearchFindings(hits)
}
