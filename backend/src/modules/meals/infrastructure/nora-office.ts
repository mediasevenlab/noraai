import { formatWebSearchFindings } from '../domain/nora-chat'

const SEARCH_TIMEOUT_MS = 20_000

export const SEARCH_UNAVAILABLE = 'Поиск сейчас недоступен.'

function officeHeaders(url: string, apiKey: string | undefined, extra?: Record<string, string>) {
  const headers: Record<string, string> = { ...extra }
  if (apiKey && url.startsWith('https://')) headers.Authorization = `Bearer ${apiKey}`
  return headers
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
  if (!response.ok) return SEARCH_UNAVAILABLE
  let payload: { results?: Array<{ title?: unknown; url?: unknown; content?: unknown }> }
  try {
    payload = (await response.json()) as typeof payload
  } catch {
    return SEARCH_UNAVAILABLE
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
