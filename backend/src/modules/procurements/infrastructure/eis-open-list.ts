import { spawn } from 'node:child_process'

import { EisFailure } from '../domain/errors'
import { russianRootArgs } from './eis-ca'

const OPEN_NOTICES =
  'https://zakupki.gov.ru/epz/order/extendedsearch/results.html?morphology=on&pageNumber=1&sortDirection=false&recordsPerPage=_10&showLotsInfoHidden=false&sortBy=UPDATE_DATE&fz44=on&fz223=on&ppRf615=on&af=on&currencyIdGeneral=-1'

const USER_AGENT = 'Mozilla/5.0 (compatible; Nora/1.0; +https://aimods.site)'

function certificateRejected(error: unknown) {
  const code = error && typeof error === 'object' && 'code' in error ? String(error.code) : ''
  return code === 'SELF_SIGNED_CERT_IN_CHAIN' || code === 'UNABLE_TO_VERIFY_LEAF_SIGNATURE'
}

function readWithCurl(url: string, signal?: AbortSignal) {
  return new Promise<string>((resolve, reject) => {
    const child = spawn(
      'curl',
      ['-sS', '-L', '--max-time', '25', ...russianRootArgs(), '-A', USER_AGENT, '-w', '\n__NORA_HTTP_%{http_code}', url],
      { signal, windowsHide: true },
    )
    const out: Buffer[] = []
    const err: Buffer[] = []
    child.stdout.on('data', (chunk: Buffer) => out.push(chunk))
    child.stderr.on('data', (chunk: Buffer) => err.push(chunk))
    child.on('error', reject)
    child.on('close', (code) => {
      if (code !== 0) {
        reject(new EisFailure('ЕИС сейчас не отвечает.'))
        return
      }
      const text = Buffer.concat(out).toString('utf8')
      const mark = text.lastIndexOf('\n__NORA_HTTP_')
      const status = mark === -1 ? 0 : Number(text.slice(mark + '\n__NORA_HTTP_'.length).trim())
      if (status < 200 || status >= 300) reject(new EisFailure('ЕИС сейчас не отвечает.'))
      else resolve(text.slice(0, mark))
    })
  })
}

/** One public results page. No archive, no token. */
export function downloadOpenNotices(signal?: AbortSignal, fetchImpl: typeof fetch = fetch) {
  return readPublicPage(OPEN_NOTICES, signal, fetchImpl)
}

export function readPublicPage(url: string, signal?: AbortSignal, fetchImpl: typeof fetch = fetch) {
  return readPage(url, signal, fetchImpl)
}

async function readPage(url: string, signal: AbortSignal | undefined, fetchImpl: typeof fetch) {
  try {
    const response = await fetchImpl(url, {
      headers: { Accept: 'text/html', 'User-Agent': USER_AGENT },
      signal,
    })
    if (!response.ok) throw new EisFailure('ЕИС сейчас не отвечает.')
    const html = await response.text()
    if (!html) throw new EisFailure('ЕИС сейчас не отвечает.')
    return html
  } catch (error) {
    if (signal?.aborted || (error instanceof Error && error.name === 'AbortError')) throw error
    if (error instanceof EisFailure || !certificateRejected(error)) {
      if (error instanceof EisFailure) throw error
      throw new EisFailure('ЕИС сейчас не отвечает.')
    }
    try {
      return await readWithCurl(url, signal)
    } catch (curlError) {
      if (signal?.aborted || (curlError instanceof Error && curlError.name === 'AbortError')) throw curlError
      if (curlError instanceof EisFailure) throw curlError
      throw new EisFailure('ЕИС сейчас не отвечает.')
    }
  }
}
