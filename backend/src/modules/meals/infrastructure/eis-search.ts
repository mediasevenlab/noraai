import { spawn } from 'node:child_process'

import { formatTenderNotices, parseTenderSearch, tenderSearchQuery } from '../domain/tenders'

const EIS_SEARCH = 'https://zakupki.gov.ru/epz/order/extendedsearch/results.html'

export function eisSearchUrl(query: string) {
  const url = new URL(EIS_SEARCH)
  url.searchParams.set('searchString', query)
  url.searchParams.set('morphology', 'on')
  url.searchParams.set('pageNumber', '1')
  url.searchParams.set('sortDirection', 'false')
  url.searchParams.set('recordsPerPage', '_10')
  url.searchParams.set('showLotsInfoHidden', 'false')
  url.searchParams.set('sortBy', 'UPDATE_DATE')
  url.searchParams.set('fz44', 'on')
  url.searchParams.set('fz223', 'on')
  url.searchParams.set('ppRf615', 'on')
  url.searchParams.set('af', 'on')
  url.searchParams.set('currencyIdGeneral', '-1')
  return url
}

const EIS_USER_AGENT = 'Mozilla/5.0 (compatible; Nora/1.0; +https://aimods.site)'

function certificateRejected(error: unknown) {
  const code = error && typeof error === 'object' && 'code' in error ? String(error.code) : ''
  return code === 'SELF_SIGNED_CERT_IN_CHAIN' || code === 'UNABLE_TO_VERIFY_LEAF_SIGNATURE'
}

/** Windows trust store accepts the public page when Bun's own certificate list does not. */
function readWithCurl(url: URL, signal?: AbortSignal) {
  return new Promise<string>((resolve, reject) => {
    const child = spawn(
      'curl',
      ['-sS', '-L', '--max-time', '25', '-A', EIS_USER_AGENT, '-w', '\n__NORA_HTTP_%{http_code}', url.toString()],
      { signal, windowsHide: true },
    )
    const out: Buffer[] = []
    const err: Buffer[] = []
    child.stdout.on('data', (chunk: Buffer) => out.push(chunk))
    child.stderr.on('data', (chunk: Buffer) => err.push(chunk))
    child.on('error', reject)
    child.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(Buffer.concat(err).toString('utf8').trim() || 'ЕИС сейчас не отвечает.'))
        return
      }
      const text = Buffer.concat(out).toString('utf8')
      const mark = text.lastIndexOf('\n__NORA_HTTP_')
      const status = mark === -1 ? 0 : Number(text.slice(mark + '\n__NORA_HTTP_'.length).trim())
      resolve(status >= 200 && status < 300 ? text.slice(0, mark) : '')
    })
  })
}

export async function searchEisNotices(
  question: string,
  signal?: AbortSignal,
  fetchImpl: typeof fetch = fetch,
) {
  const query = tenderSearchQuery(question)
  if (!query) return 'По этому запросу на zakupki.gov.ru нет поисковых слов.'
  const url = eisSearchUrl(query)
  let html = ''
  try {
    const response = await fetchImpl(url, {
      headers: { Accept: 'text/html', 'User-Agent': EIS_USER_AGENT },
      signal,
    })
    if (!response.ok) return 'ЕИС сейчас не отвечает.'
    html = await response.text()
  } catch (error) {
    if (signal?.aborted || (error instanceof Error && error.name === 'AbortError')) throw error
    if (!certificateRejected(error)) return 'ЕИС сейчас не отвечает.'
    try {
      html = await readWithCurl(url, signal)
    } catch (curlError) {
      if (signal?.aborted || (curlError instanceof Error && curlError.name === 'AbortError')) throw curlError
      return 'ЕИС сейчас не отвечает.'
    }
  }
  if (!html) return 'ЕИС сейчас не отвечает.'
  return formatTenderNotices(parseTenderSearch(html), query)
}
