import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { spawn } from 'node:child_process'

import { EisFailure } from '../domain/errors'
import { readZipXml } from '../domain/zip-xml'

const EIS_DOCS = 'https://int.zakupki.gov.ru/eis-integration/services/getDocsIP'
const SAMPLE_SUBSYSTEM = 'PRIZ'
const SAMPLE_REGISTRY = '0156100010726000075'

export async function downloadNoticeArchive(token: string, subsystem: string, registryNumber: string, signal?: AbortSignal) {
  const page = await postSoap(envelope(token, subsystem, registryNumber), token, signal)
  const archiveUrl = page.match(/https:\/\/int\.zakupki\.gov\.ru\/dstore\/common\/download\/compound\?[^\]<\s]+/)?.[0]
  if (!archiveUrl) throw new EisFailure(faultText(page) || 'ЕИС не отдала архив.')
  return getArchive(archiveUrl, token, signal)
}

export async function downloadSampleNotice(token: string, signal?: AbortSignal) {
  const zip = await downloadNoticeArchive(token, SAMPLE_SUBSYSTEM, SAMPLE_REGISTRY, signal)
  const file = readZipXml(zip)
  return {
    subsystem: SAMPLE_SUBSYSTEM,
    registryNumber: SAMPLE_REGISTRY,
    fileName: file.name,
    xml: file.xml,
  }
}

function envelope(token: string, subsystem: string, registryNumber: string) {
  if (!/^[A-Z0-9]+$/.test(subsystem) || !/^\d+$/.test(registryNumber)) {
    throw new EisFailure('ЕИС не отдала архив.')
  }
  const id = crypto.randomUUID()
  const stamp = new Date().toISOString().slice(0, 19)
  return `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ws="http://zakupki.gov.ru/fz44/get-docs-ip/ws">
  <soapenv:Header><individualPerson_token>${token}</individualPerson_token></soapenv:Header>
  <soapenv:Body>
    <ws:getDocsByReestrNumberRequest>
      <index><id>${id}</id><createDateTime>${stamp}</createDateTime><mode>PROD</mode></index>
      <selectionParams><subsystemType>${subsystem}</subsystemType><reestrNumber>${registryNumber}</reestrNumber></selectionParams>
    </ws:getDocsByReestrNumberRequest>
  </soapenv:Body>
</soapenv:Envelope>`
}

function faultText(page: string) {
  const fault = page.match(/<(?:[\w]+:)?faultstring>([^<]+)/)?.[1]?.trim()
  return fault ? `ЕИС: ${fault}` : ''
}

async function postSoap(body: string, token: string, signal?: AbortSignal) {
  try {
    const response = await fetch(EIS_DOCS, {
      method: 'POST',
      headers: { 'Content-Type': 'text/xml; charset=utf-8' },
      body,
      signal,
    })
    if (!response.ok) throw new EisFailure('ЕИС не отдала архив.')
    return await response.text()
  } catch (error) {
    if (signal?.aborted || error instanceof EisFailure) throw error
    if (!certificateRejected(error)) throw new EisFailure('ЕИС не отдала архив.')
    return curlText(['-sS', '--max-time', '45', '-H', 'Content-Type: text/xml; charset=utf-8', '--data-binary', '@FILE', '-w', '\n__NORA_HTTP_%{http_code}', EIS_DOCS], body, token, signal)
  }
}

async function getArchive(url: string, token: string, signal?: AbortSignal) {
  try {
    const response = await fetch(url, { headers: { individualPerson_token: token }, signal })
    if (!response.ok) throw new EisFailure('ЕИС не отдала архив.')
    return Buffer.from(await response.arrayBuffer())
  } catch (error) {
    if (signal?.aborted || error instanceof EisFailure) throw error
    if (!certificateRejected(error)) throw new EisFailure('ЕИС не отдала архив.')
    return curlFile(['-sS', '--max-time', '60', '-H', `individualPerson_token: ${token}`, '-o', 'FILE', '-w', '%{http_code}', url], token, signal)
  }
}

function certificateRejected(error: unknown) {
  const chain = [error, error instanceof Error ? error.cause : undefined]
  return chain.some((item) => {
    const code = item && typeof item === 'object' && 'code' in item ? String(item.code) : ''
    const message = item instanceof Error ? item.message : ''
    return code === 'SELF_SIGNED_CERT_IN_CHAIN'
      || code === 'UNABLE_TO_VERIFY_LEAF_SIGNATURE'
      || message.includes('self signed certificate')
      || message.includes('certificate chain')
  })
}

async function curlText(args: string[], body: string, token: string, signal?: AbortSignal) {
  const dir = await mkdtemp(join(tmpdir(), 'nora-eis-'))
  const file = join(dir, 'request.xml')
  try {
    await writeFile(file, body)
    const result = await runCurl(args.map((arg) => (arg === '@FILE' ? `@${file}` : arg)), signal)
    const mark = result.lastIndexOf('\n__NORA_HTTP_')
    const status = mark === -1 ? 0 : Number(result.slice(mark + '\n__NORA_HTTP_'.length).trim())
    if (status < 200 || status >= 300) throw new EisFailure('ЕИС не отдала архив.')
    return result.slice(0, mark).replaceAll(token, '')
  } catch (error) {
    throw redact(error, token)
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
}

async function curlFile(args: string[], token: string, signal?: AbortSignal) {
  const dir = await mkdtemp(join(tmpdir(), 'nora-eis-'))
  const file = join(dir, 'archive.bin')
  try {
    const statusText = await runCurl(args.map((arg) => (arg === 'FILE' ? file : arg)), signal)
    const status = Number(statusText.trim())
    if (status < 200 || status >= 300) throw new EisFailure('ЕИС не отдала архив.')
    return await readFile(file)
  } catch (error) {
    throw redact(error, token)
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
}

function runCurl(args: string[], signal?: AbortSignal) {
  return new Promise<string>((resolve, reject) => {
    const child = spawn('curl', args, { signal, windowsHide: true })
    const out: Buffer[] = []
    const err: Buffer[] = []
    child.stdout.on('data', (chunk: Buffer) => out.push(chunk))
    child.stderr.on('data', (chunk: Buffer) => err.push(chunk))
    child.on('error', reject)
    child.on('close', (code) => {
      if (code !== 0) {
        reject(new EisFailure('ЕИС не отдала архив.'))
        return
      }
      resolve(Buffer.concat(out).toString('utf8'))
    })
  })
}

function redact(error: unknown, token: string) {
  if (error instanceof EisFailure) return error
  const message = error instanceof Error ? error.message.replaceAll(token, '') : 'ЕИС не отдала архив.'
  return new EisFailure(message || 'ЕИС не отдала архив.')
}
