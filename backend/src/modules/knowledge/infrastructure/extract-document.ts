import mammoth from 'mammoth'
import sharp from 'sharp'
import { extractImages, extractText, getDocumentProxy } from 'unpdf'

import { KnowledgeFailure } from '../domain/errors'
import { readXlsText } from './read-xls'
import { readXlsxText } from './read-xlsx'

const TEXT_EXTENSIONS = new Set(['txt', 'md', 'csv', 'json', 'html', 'htm', 'xml', 'rtf', 'log'])
const TEXT_LAYER_CHARS = 20
const SCAN_EDGE = 1680

export type ScanPage = { page: number; jpeg: Buffer }
export type ScanReader = (pages: readonly ScanPage[]) => Promise<string>

export function hasTextLayer(text: string) {
  return text.replace(/\s/g, '').length >= TEXT_LAYER_CHARS
}

/** A scan has pictures instead of letters. The reader turns those pictures into text. */
export async function resolveDocumentText(
  text: string,
  loadPages: () => Promise<readonly ScanPage[]>,
  readScan?: ScanReader,
) {
  if (hasTextLayer(text)) return text
  if (!readScan) {
    throw new KnowledgeFailure('bad_request', 'В файле нет текстового слоя. Распознавание сканов не настроено.')
  }
  const pages = await loadPages()
  if (pages.length === 0) throw new KnowledgeFailure('bad_request', 'В файле не нашлось текста')
  return readScan(pages)
}

function extension(name: string) {
  const match = name.toLowerCase().match(/\.([a-z0-9]+)$/)
  return match?.[1] ?? ''
}

function plainText(bytes: Buffer, ext: string) {
  const text = bytes.toString('utf8').replace(/^\uFEFF/, '')
  if (ext === 'html' || ext === 'htm' || ext === 'xml') {
    return text.replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ')
  }
  if (ext === 'rtf') {
    return text.replace(/\\[a-z]+-?\d* ?/gi, ' ').replace(/[{}]/g, ' ')
  }
  return text
}

type PageProjection = { row: number; col: number; top: number; bottom: number }

function variance(values: readonly number[]) {
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length
  return values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length
}

async function projection(image: Buffer): Promise<PageProjection> {
  const { data, info } = await sharp(image)
    .greyscale()
    .resize(160, 220, { fit: 'fill' })
    .raw()
    .toBuffer({ resolveWithObject: true })
  const rows = Array.from({ length: info.height }, () => 0)
  const cols = Array.from({ length: info.width }, () => 0)
  const cut = Math.floor(info.height * 0.18)
  let top = 0
  let bottom = 0
  for (let y = 0; y < info.height; y += 1) {
    for (let x = 0; x < info.width; x += 1) {
      if ((data[y * info.width + x] ?? 255) > 170) continue
      rows[y] += 1
      cols[x] += 1
      if (y < cut) top += 1
      if (y >= info.height - cut) bottom += 1
    }
  }
  return { row: variance(rows), col: variance(cols), top, bottom }
}

/** A phone scan often stores a landscape sheet on its side. Turn it so the heading is at the top. */
export async function chooseScanRotation(image: Buffer): Promise<0 | 90 | 180 | -90> {
  const upright = await projection(image)
  if (upright.row >= upright.col * 1.15) {
    if (upright.top === 0 && upright.bottom > 0) return 180
    return 0
  }
  const clockwise = await projection(await sharp(image).rotate(90).toBuffer())
  const counter = await projection(await sharp(image).rotate(-90).toBuffer())
  const clockwiseScore = clockwise.top - clockwise.bottom
  const counterScore = counter.top - counter.bottom
  if (clockwiseScore <= 0 && counterScore <= 0) return 0
  return counterScore >= clockwiseScore ? -90 : 90
}

async function scanPages(bytes: Buffer): Promise<ScanPage[]> {
  const pdf = await getDocumentProxy(new Uint8Array(bytes))
  const pages: ScanPage[] = []
  for (let page = 1; page <= pdf.numPages; page += 1) {
    const images = await extractImages(pdf, page)
    const image = images.reduce<(typeof images)[number] | undefined>((largest, item) => {
      if (!largest) return item
      return item.width * item.height > largest.width * largest.height ? item : largest
    }, undefined)
    if (!image) continue
    const source = Buffer.from(image.data)
    const raw = { width: image.width, height: image.height, channels: image.channels }
    const preview = await sharp(source, { raw }).jpeg({ quality: 50 }).toBuffer()
    const angle = await chooseScanRotation(preview)
    const jpeg = await sharp(source, { raw })
      .rotate(angle)
      .resize({ width: SCAN_EDGE, height: SCAN_EDGE, fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 72 })
      .toBuffer()
    pages.push({ page, jpeg })
  }
  return pages
}

export async function extractKnowledgeDocument(name: string, bytes: Buffer, readScan?: ScanReader) {
  const ext = extension(name)
  if (ext === 'doc') {
    throw new KnowledgeFailure('bad_request', 'Старый формат .doc не читается. Сохраните файл как .docx.')
  }
  if (ext === 'xls') return readXlsText(bytes)
  if (ext === 'xlsx' || ext === 'xlsm') return readXlsxText(bytes)
  if (ext === 'pdf') {
    const pdf = await getDocumentProxy(new Uint8Array(bytes))
    const extracted = await extractText(pdf, { mergePages: true })
    const text = Array.isArray(extracted.text) ? extracted.text.join('\n') : extracted.text
    return resolveDocumentText(text, () => scanPages(bytes), readScan)
  }
  if (ext === 'docx') {
    const extracted = await mammoth.extractRawText({ buffer: bytes })
    return extracted.value
  }
  if (TEXT_EXTENSIONS.has(ext)) return plainText(bytes, ext)
  throw new KnowledgeFailure('bad_request', 'Подходят PDF, Word (.docx), Excel (.xlsx) и текстовые файлы.')
}
