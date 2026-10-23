import { inflateRawSync } from 'node:zlib'

import { KnowledgeFailure } from '../domain/errors'

const SHEET_ROWS = 300
const SHEET_COLS = 40

function decodeXml(value: string) {
  return value
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCodePoint(Number(code)))
    .replace(/&amp;/g, '&')
}

function unzip(bytes: Buffer) {
  let eocd = -1
  const min = Math.max(0, bytes.length - 66_000)
  for (let index = bytes.length - 22; index >= min; index -= 1) {
    if (bytes.readUInt32LE(index) === 0x06054b50) {
      eocd = index
      break
    }
  }
  if (eocd < 0) throw new KnowledgeFailure('bad_request', 'Не удалось прочитать таблицу Excel.')
  const count = bytes.readUInt16LE(eocd + 10)
  let offset = bytes.readUInt32LE(eocd + 16)
  const files = new Map<string, string>()
  for (let index = 0; index < count; index += 1) {
    if (offset + 46 > bytes.length || bytes.readUInt32LE(offset) !== 0x02014b50) break
    const method = bytes.readUInt16LE(offset + 10)
    const compressed = bytes.readUInt32LE(offset + 20)
    const nameLength = bytes.readUInt16LE(offset + 28)
    const extraLength = bytes.readUInt16LE(offset + 30)
    const commentLength = bytes.readUInt16LE(offset + 32)
    const local = bytes.readUInt32LE(offset + 42)
    const name = bytes.toString('utf8', offset + 46, offset + 46 + nameLength).replace(/\\/g, '/')
    offset += 46 + nameLength + extraLength + commentLength
    if (name.endsWith('/')) continue
    const localName = bytes.readUInt16LE(local + 26)
    const localExtra = bytes.readUInt16LE(local + 28)
    const start = local + 30 + localName + localExtra
    const raw = bytes.subarray(start, start + compressed)
    const body = method === 0 ? raw : method === 8 ? inflateRawSync(raw) : null
    if (body) files.set(name, body.toString('utf8'))
  }
  return files
}

function sharedStrings(xml: string) {
  const items: string[] = []
  for (const part of xml.split(/<si\b[^>]*>/).slice(1)) {
    const body = part.split('</si>')[0] ?? ''
    const texts = [...body.matchAll(/<t\b[^>]*>([\s\S]*?)<\/t>/g)].map((match) => decodeXml(match[1] ?? ''))
    items.push(texts.join(''))
  }
  return items
}

function columnIndex(ref: string) {
  const letters = /^[A-Z]+/i.exec(ref)?.[0] ?? ''
  if (!letters) return -1
  let index = 0
  for (const char of letters.toUpperCase()) index = index * 26 + (char.charCodeAt(0) - 64)
  return index - 1
}

function cellValue(type: string, inner: string, strings: readonly string[]) {
  if (type === 'inlineStr') {
    return [...inner.matchAll(/<t\b[^>]*>([\s\S]*?)<\/t>/g)].map((match) => decodeXml(match[1] ?? '')).join('')
  }
  const value = decodeXml(/<v>([\s\S]*?)<\/v>/.exec(inner)?.[1] ?? '')
  if (type === 's') return strings[Number(value)] ?? ''
  if (type === 'b') return value === '1' ? 'да' : 'нет'
  return value
}

function sheetRows(xml: string, strings: readonly string[]) {
  const rows: string[][] = []
  for (const match of xml.matchAll(/<row\b[^>]*>([\s\S]*?)<\/row>/g)) {
    const cells: string[] = []
    for (const cell of (match[1] ?? '').matchAll(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
      const attrs = cell[1] ?? ''
      const column = columnIndex(/r="([^"]+)"/.exec(attrs)?.[1] ?? '')
      const at = column >= 0 ? column : cells.length
      if (at >= SHEET_COLS) continue
      while (cells.length < at) cells.push('')
      const type = /t="([^"]+)"/.exec(attrs)?.[1] ?? ''
      cells[at] = cellValue(type, cell[2] ?? '', strings).replace(/\|/g, '/').replace(/\s+/g, ' ').trim()
    }
    if (cells.some((cell) => cell.length > 0)) rows.push(cells)
    if (rows.length >= SHEET_ROWS) break
  }
  return rows
}

function markdownRow(cells: readonly string[]) {
  return `| ${cells.join(' | ')} |`
}

function sheetText(name: string, rows: string[][]) {
  if (rows.length === 0) return ''
  let grid = rows
  let caption = ''
  const filled = (row: readonly string[]) => row.filter((cell) => cell.trim()).length
  if (grid.length > 1 && filled(grid[0] ?? []) === 1 && filled(grid[1] ?? []) > 1) {
    caption = (grid[0] ?? []).find((cell) => cell.trim()) ?? ''
    grid = grid.slice(1)
  }
  const width = Math.max(...grid.map((row) => row.length))
  const padded = grid.map((row) => Array.from({ length: width }, (_, index) => row[index] ?? ''))
  const header = padded[0] ?? []
  const lines = [`Лист «${name}»`]
  if (caption) lines.push(caption)
  if (header.length < 1) {
    lines.push(padded.map((row) => row.filter(Boolean).join(' ')).join('\n'))
    return lines.filter(Boolean).join('\n')
  }
  lines.push(markdownRow(header))
  lines.push(markdownRow(header.map(() => '---')))
  for (const row of padded.slice(1)) lines.push(markdownRow(row))
  return lines.join('\n')
}

function workbookSheets(files: Map<string, string>) {
  const book = files.get('xl/workbook.xml') ?? ''
  const rels = files.get('xl/_rels/workbook.xml.rels') ?? ''
  const targets = new Map<string, string>()
  for (const match of rels.matchAll(/<Relationship\b[^>]*>/g)) {
    const tag = match[0]
    const id = /Id="([^"]+)"/.exec(tag)?.[1] ?? ''
    const target = /Target="([^"]+)"/.exec(tag)?.[1] ?? ''
    if (!id || !target) continue
    const path = target.startsWith('/') ? target.slice(1) : `xl/${target.replace(/^\.\//, '')}`
    targets.set(id, path)
  }
  const sheets: { name: string; path: string }[] = []
  for (const match of book.matchAll(/<sheet\b[^>]*>/g)) {
    const tag = match[0]
    const name = decodeXml(/name="([^"]*)"/.exec(tag)?.[1] ?? 'Лист')
    const id = /r:id="([^"]+)"/.exec(tag)?.[1] ?? ''
    const path = targets.get(id)
    if (path && files.has(path)) sheets.push({ name, path })
  }
  if (sheets.length > 0) return sheets
  return [...files.keys()]
    .filter((path) => /^xl\/worksheets\/sheet\d+\.xml$/.test(path))
    .sort()
    .map((path, index) => ({ name: `Лист ${index + 1}`, path }))
}

export function formatSheets(sheets: readonly { name: string; rows: string[][] }[]) {
  const texts = sheets
    .map((sheet) => sheetText(sheet.name, sheet.rows))
    .filter((text) => text.split('\n').some((line) => line.trim() && !line.startsWith('Лист «')))
  if (texts.length === 0) throw new KnowledgeFailure('bad_request', 'В таблице Excel не нашлось данных.')
  return texts.join('\n\n')
}

/** Each worksheet becomes text, and a grid becomes a Markdown table. */
export function readXlsxText(bytes: Buffer) {
  const files = unzip(bytes)
  const strings = sharedStrings(files.get('xl/sharedStrings.xml') ?? '')
  return formatSheets(
    workbookSheets(files).map((sheet) => ({
      name: sheet.name,
      rows: sheetRows(files.get(sheet.path) ?? '', strings),
    })),
  )
}
