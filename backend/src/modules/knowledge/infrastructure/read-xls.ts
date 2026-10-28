import { KnowledgeFailure } from '../domain/errors'
import { formatSheets } from './read-xlsx'

const END_OF_CHAIN = 0xfffffffe
const CP1251 = [
  0x0402, 0x0403, 0x201a, 0x0453, 0x201e, 0x2026, 0x2020, 0x2021, 0x20ac, 0x2030, 0x0409, 0x2039, 0x040a, 0x040c, 0x040b, 0x040f,
  0x0452, 0x2018, 0x2019, 0x201c, 0x201d, 0x2022, 0x2013, 0x2014, 0x0098, 0x2122, 0x0459, 0x203a, 0x045a, 0x045c, 0x045b, 0x045f,
  0x00a0, 0x040e, 0x045e, 0x0408, 0x00a4, 0x0490, 0x00a6, 0x00a7, 0x0401, 0x00a9, 0x0404, 0x00ab, 0x00ac, 0x00ad, 0x00ae, 0x0407,
  0x00b0, 0x00b1, 0x0406, 0x0456, 0x0491, 0x00b5, 0x00b6, 0x00b7, 0x0451, 0x2116, 0x0454, 0x00bb, 0x0458, 0x0405, 0x0455, 0x0457,
]

const DATE_FORMATS = new Set([14, 15, 16, 17, 18, 19, 20, 21, 22, 45, 46, 47])

type RecordChunk = { code: number; data: Buffer }

function decodeBytes(bytes: Buffer, codePage: number) {
  if (codePage !== 1251) return bytes.toString('latin1')
  let text = ''
  for (const byte of bytes) {
    if (byte < 0x80) text += String.fromCharCode(byte)
    else if (byte >= 0xc0) text += String.fromCharCode(0x0410 + (byte - 0xc0))
    else text += String.fromCharCode(CP1251[byte - 0x80] ?? byte)
  }
  return text
}

function clean(value: string) {
  return value.replace(/\u0000/g, '').replace(/\|/g, '/').replace(/\s+/g, ' ').trim()
}

function formatNumber(value: number) {
  if (!Number.isFinite(value)) return ''
  const rounded = Math.round(value * 1e8) / 1e8
  return String(rounded)
}

function excelDate(serial: number) {
  const whole = Math.floor(serial)
  const date = new Date(Date.UTC(1899, 11, 30) + whole * 86_400_000)
  const day = String(date.getUTCDate()).padStart(2, '0')
  const month = String(date.getUTCMonth() + 1).padStart(2, '0')
  const fraction = serial - whole
  if (fraction > 0.00001) {
    const minutes = Math.round(fraction * 24 * 60)
    const hour = String(Math.floor(minutes / 60)).padStart(2, '0')
    const minute = String(minutes % 60).padStart(2, '0')
    return `${day}.${month}.${date.getUTCFullYear()} ${hour}:${minute}`
  }
  return `${day}.${month}.${date.getUTCFullYear()}`
}

function isDateFormat(text: string) {
  const plain = text.replace(/"[^"]*"/g, '')
  return /[dy]/i.test(plain) || /h/i.test(plain) || /m{2,}/i.test(plain)
}

function decodeRk(value: number) {
  const signed = value > 0x7fffffff ? value - 0x100000000 : value
  let number = (value & 2) !== 0
    ? signed >> 2
    : Buffer.from([0, 0, 0, 0, value & 0xfc, (value >> 8) & 0xff, (value >> 16) & 0xff, (value >> 24) & 0xff]).readDoubleLE(0)
  if ((value & 1) !== 0) number /= 100
  return number
}

class RecordReader {
  private index = 0
  private offset = 0

  constructor(private readonly chunks: Buffer[]) {}

  private advance() {
    this.index += 1
    this.offset = 0
    if (this.index >= this.chunks.length) throw new KnowledgeFailure('bad_request', 'Не удалось прочитать таблицу Excel.')
  }

  read(size: number) {
    const out = Buffer.alloc(size)
    let filled = 0
    while (filled < size) {
      const chunk = this.chunks[this.index]
      if (!chunk || this.offset >= chunk.length) {
        this.advance()
        continue
      }
      const take = Math.min(size - filled, chunk.length - this.offset)
      chunk.copy(out, filled, this.offset, this.offset + take)
      this.offset += take
      filled += take
    }
    return out
  }

  private readChars(count: number, wide: boolean, codePage: number) {
    let text = ''
    let left = count
    let high = wide
    while (left > 0) {
      const chunk = this.chunks[this.index]
      if (!chunk || this.offset >= chunk.length) {
        this.advance()
        high = (this.chunks[this.index]?.[this.offset] ?? 0) & 1
        this.offset += 1
        continue
      }
      const width = high ? 2 : 1
      const room = Math.floor((chunk.length - this.offset) / width)
      const take = Math.min(left, room)
      if (take === 0) {
        this.advance()
        high = (this.chunks[this.index]?.[this.offset] ?? 0) & 1
        this.offset += 1
        continue
      }
      const slice = chunk.subarray(this.offset, this.offset + take * width)
      text += high ? slice.toString('utf16le') : decodeBytes(slice, codePage)
      this.offset += take * width
      left -= take
    }
    return text
  }

  readUnicode(codePage: number, bytesForCount: 1 | 2) {
    const count = bytesForCount === 1 ? this.read(1)[0] ?? 0 : this.read(2).readUInt16LE(0)
    const flags = this.read(1)[0] ?? 0
    const rich = (flags & 8) !== 0 ? this.read(2).readUInt16LE(0) : 0
    const phonetic = (flags & 4) !== 0 ? this.read(4).readUInt32LE(0) : 0
    const text = this.readChars(count, (flags & 1) !== 0, codePage)
    if (rich) this.read(rich * 4)
    if (phonetic) this.read(phonetic)
    return clean(text)
  }
}

function recordsOf(bytes: Buffer): RecordChunk[] {
  const records: RecordChunk[] = []
  let offset = 0
  while (offset + 4 <= bytes.length) {
    const code = bytes.readUInt16LE(offset)
    const length = bytes.readUInt16LE(offset + 2)
    offset += 4
    if (offset + length > bytes.length) break
    records.push({ code, data: bytes.subarray(offset, offset + length) })
    offset += length
  }
  return records
}

function sharedStrings(records: readonly RecordChunk[], start: number, codePage: number) {
  const chunks: Buffer[] = []
  for (let index = start; index < records.length; index += 1) {
    const record = records[index]
    if (!record) break
    if (index > start && record.code !== 0x003c) break
    chunks.push(record.data)
  }
  const reader = new RecordReader(chunks)
  reader.read(8)
  const strings: string[] = []
  const unique = chunks[0]?.readUInt32LE(4) ?? 0
  for (let index = 0; index < unique; index += 1) strings.push(reader.readUnicode(codePage, 2))
  return strings
}

function sheetName(data: Buffer, codePage: number) {
  const reader = new RecordReader([data.subarray(6)])
  return reader.readUnicode(codePage, 1) || 'Лист'
}

function cellGrid(cells: Map<number, Map<number, string>>) {
  const rows = [...cells.keys()].sort((left, right) => left - right).slice(0, 300)
  let min = Number.POSITIVE_INFINITY
  let max = -1
  for (const row of rows) {
    for (const column of cells.get(row)?.keys() ?? []) {
      if (column < min) min = column
      if (column > max) max = column
    }
  }
  if (max < min) return []
  // Keep the empty columns between the first and last used cell, so a value
  // stays in the same place as in the workbook.
  const end = Math.min(max, min + 39)
  const columns: number[] = []
  for (let column = min; column <= end; column += 1) columns.push(column)
  return rows
    .map((row) => {
      const line = cells.get(row)
      return columns.map((column) => line?.get(column) ?? '')
    })
    .filter((row) => row.some((cell) => cell.length > 0))
}

function put(
  cells: Map<number, Map<number, string>>,
  row: number,
  column: number,
  value: string,
) {
  if (!value) return
  const line = cells.get(row) ?? new Map<number, string>()
  line.set(column, value)
  cells.set(row, line)
}

function shown(value: number, xf: number, dates: ReadonlySet<number>) {
  if (dates.has(xf) && value > 200 && value < 80_000) return excelDate(value)
  return formatNumber(value)
}

/** BIFF records of one Workbook stream. A .xls file stores its sheets here. */
export function readBiffSheets(bytes: Buffer) {
  const records = recordsOf(bytes)
  let codePage = 1251
  const names: string[] = []
  const formats = new Map<number, string>()
  const xfFormat = new Map<number, number>()
  let strings: string[] = []
  const sheets: { name: string; rows: string[][] }[] = []
  let sheet = -1
  let cells = new Map<number, Map<number, string>>()
  let stringFormula: { row: number; column: number } | null = null

  let inSheet = false
  const finish = () => {
    if (!inSheet) return
    sheets.push({ name: names[sheet] || `Лист ${sheet + 1}`, rows: cellGrid(cells) })
    cells = new Map()
    inSheet = false
  }

  for (let index = 0; index < records.length; index += 1) {
    const record = records[index]
    if (!record) continue
    const data = record.data
    if (record.code === 0x0042 && data.length >= 2) codePage = data.readUInt16LE(0)
    if (record.code === 0x0085 && data[5] === 0) names.push(sheetName(data, codePage))
    if (record.code === 0x041e && data.length >= 3) {
      const reader = new RecordReader([data])
      const id = reader.read(2).readUInt16LE(0)
      formats.set(id, reader.readUnicode(codePage, data.length > 4 && data.readUInt16LE(2) < 200 ? 2 : 1))
    }
    if (record.code === 0x00e0 && data.length >= 4) xfFormat.set(xfFormat.size, data.readUInt16LE(2))
    if (record.code === 0x00fc) strings = sharedStrings(records, index, codePage)
    if (record.code === 0x0809 && data.length >= 4) {
      const kind = data.readUInt16LE(2)
      finish()
      if (kind === 0x0010) {
        sheet += 1
        inSheet = true
      }
    }
    if (!inSheet) continue
    if (record.code === 0x00fd && data.length >= 10) {
      put(cells, data.readUInt16LE(0), data.readUInt16LE(2), strings[data.readUInt32LE(6)] ?? '')
    }
    if (record.code === 0x0204 && data.length >= 8) {
      const reader = new RecordReader([data.subarray(6)])
      put(cells, data.readUInt16LE(0), data.readUInt16LE(2), reader.readUnicode(codePage, 2))
    }
    if (record.code === 0x0203 && data.length >= 14) {
      put(cells, data.readUInt16LE(0), data.readUInt16LE(2), shown(data.readDoubleLE(6), data.readUInt16LE(4), dateSet(xfFormat, formats)))
    }
    if (record.code === 0x027e && data.length >= 10) {
      put(cells, data.readUInt16LE(0), data.readUInt16LE(2), shown(decodeRk(data.readUInt32LE(6)), data.readUInt16LE(4), dateSet(xfFormat, formats)))
    }
    if (record.code === 0x00bd && data.length >= 6) {
      const row = data.readUInt16LE(0)
      let column = data.readUInt16LE(2)
      const dates = dateSet(xfFormat, formats)
      for (let cursor = 4; cursor + 6 <= data.length; cursor += 6) {
        put(cells, row, column, shown(decodeRk(data.readUInt32LE(cursor + 2)), data.readUInt16LE(cursor), dates))
        column += 1
      }
    }
    if (record.code === 0x0006 && data.length >= 14) {
      const row = data.readUInt16LE(0)
      const column = data.readUInt16LE(2)
      if (data[12] === 0xff && data[13] === 0xff && data[6] === 0) stringFormula = { row, column }
      else if (!(data[12] === 0xff && data[13] === 0xff)) {
        put(cells, row, column, shown(data.readDoubleLE(6), data.readUInt16LE(4), dateSet(xfFormat, formats)))
      }
    }
    if (record.code === 0x0207 && stringFormula) {
      const reader = new RecordReader([data])
      put(cells, stringFormula.row, stringFormula.column, reader.readUnicode(codePage, 2))
      stringFormula = null
    }
  }
  finish()
  return sheets.filter((item) => item.rows.length > 0)
}

/** Worksheets with their cell grids. Empty sheets are left out. */
export function readXlsSheets(bytes: Buffer) {
  return readBiffSheets(compoundStream(bytes))
}

export function readBiffText(bytes: Buffer) {
  return formatSheets(readBiffSheets(bytes))
}

function dateSet(xfFormat: ReadonlyMap<number, number>, formats: ReadonlyMap<number, string>) {
  const dates = new Set<number>()
  for (const [index, format] of xfFormat) {
    const custom = formats.get(format)
    if (DATE_FORMATS.has(format) || (custom !== undefined && isDateFormat(custom))) dates.add(index)
  }
  return dates
}

function sectorChain(start: number, table: readonly number[], bytes: Buffer, sectorSize: number, exact?: number) {
  const parts: Buffer[] = []
  let sector = start
  const seen = new Set<number>()
  while (sector < END_OF_CHAIN && !seen.has(sector)) {
    seen.add(sector)
    const offset = (sector + 1) * sectorSize
    parts.push(bytes.subarray(offset, offset + sectorSize))
    sector = table[sector] ?? END_OF_CHAIN
  }
  const joined = Buffer.concat(parts)
  return exact === undefined ? joined : joined.subarray(0, exact)
}

function compoundStream(bytes: Buffer) {
  if (bytes.length < 512 || bytes.readUInt32LE(0) !== 0xe011cfd0) {
    throw new KnowledgeFailure('bad_request', 'Не удалось прочитать таблицу Excel.')
  }
  const sectorSize = 1 << bytes.readUInt16LE(0x1e)
  const miniSize = 1 << bytes.readUInt16LE(0x20)
  const fatSectors: number[] = []
  for (let index = 0; index < 109; index += 1) {
    const sector = bytes.readUInt32LE(0x4c + index * 4)
    if (sector < END_OF_CHAIN) fatSectors.push(sector)
  }
  let difat = bytes.readUInt32LE(0x44)
  let difatLeft = bytes.readUInt32LE(0x48)
  while (difatLeft > 0 && difat < END_OF_CHAIN) {
    const offset = (difat + 1) * sectorSize
    for (let index = 0; index < sectorSize / 4 - 1; index += 1) {
      const sector = bytes.readUInt32LE(offset + index * 4)
      if (sector < END_OF_CHAIN) fatSectors.push(sector)
    }
    difat = bytes.readUInt32LE(offset + sectorSize - 4)
    difatLeft -= 1
  }
  const fat: number[] = []
  for (const sector of fatSectors) {
    const offset = (sector + 1) * sectorSize
    for (let index = 0; index < sectorSize / 4; index += 1) fat.push(bytes.readUInt32LE(offset + index * 4))
  }
  const directory = sectorChain(bytes.readUInt32LE(0x30), fat, bytes, sectorSize)
  const entries: { name: string; type: number; start: number; size: number }[] = []
  for (let offset = 0; offset + 128 <= directory.length; offset += 128) {
    const length = Math.min(directory.readUInt16LE(offset + 64), 64)
    entries.push({
      name: directory.toString('utf16le', offset, offset + Math.max(0, length - 2)),
      type: directory[offset + 66] ?? 0,
      start: directory.readUInt32LE(offset + 116),
      size: directory.readUInt32LE(offset + 120),
    })
  }
  const root = entries.find((entry) => entry.type === 5)
  const book = entries.find((entry) => entry.type === 2 && (entry.name === 'Workbook' || entry.name === 'Book'))
  if (!root || !book) throw new KnowledgeFailure('bad_request', 'В таблице Excel не нашлось данных.')
  const cutoff = bytes.readUInt32LE(0x38)
  if (book.size >= cutoff) return sectorChain(book.start, fat, bytes, sectorSize, book.size)
  const miniStream = sectorChain(root.start, fat, bytes, sectorSize)
  const miniFatBytes = sectorChain(bytes.readUInt32LE(0x3c), fat, bytes, sectorSize)
  const miniFat: number[] = []
  for (let offset = 0; offset + 4 <= miniFatBytes.length; offset += 4) miniFat.push(miniFatBytes.readUInt32LE(offset))
  const parts: Buffer[] = []
  let sector = book.start
  let left = book.size
  const seen = new Set<number>()
  while (left > 0 && sector < END_OF_CHAIN && !seen.has(sector)) {
    seen.add(sector)
    const take = Math.min(miniSize, left)
    parts.push(miniStream.subarray(sector * miniSize, sector * miniSize + take))
    left -= take
    sector = miniFat[sector] ?? END_OF_CHAIN
  }
  return Buffer.concat(parts)
}

/** An Excel 97–2003 workbook: compound storage around BIFF sheets. */
export function readXlsText(bytes: Buffer) {
  return formatSheets(readXlsSheets(bytes))
}
