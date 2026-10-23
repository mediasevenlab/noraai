import { expect, test } from 'bun:test'

import { readBiffText } from './read-xls'

function record(code: number, data: Buffer) {
  const head = Buffer.alloc(4)
  head.writeUInt16LE(code, 0)
  head.writeUInt16LE(data.length, 2)
  return Buffer.concat([head, data])
}

function unicode(text: string, wide: boolean) {
  const bytes = wide ? Buffer.from(text, 'utf16le') : Buffer.from(text, 'latin1')
  const head = Buffer.alloc(3)
  head.writeUInt16LE(text.length, 0)
  head[2] = wide ? 1 : 0
  return Buffer.concat([head, bytes])
}

test('an old excel workbook keeps russian labels and numbers', () => {
  const bof = Buffer.alloc(16)
  bof.writeUInt16LE(0x0600, 0)
  bof.writeUInt16LE(0x0005, 2)
  const sheetBof = Buffer.from(bof)
  sheetBof.writeUInt16LE(0x0010, 2)
  const bound = Buffer.alloc(6)
  bound[5] = 0
  const name = Buffer.concat([Buffer.from([5, 1]), Buffer.from('Смета', 'utf16le')])
  const sst = Buffer.concat([
    Buffer.from([2, 0, 0, 0, 2, 0, 0, 0]),
    unicode('Наименование', true),
    unicode('Кронштейн', true),
  ])
  const header = Buffer.alloc(10)
  header.writeUInt16LE(0, 0)
  header.writeUInt16LE(0, 2)
  header.writeUInt32LE(0, 6)
  const label = Buffer.alloc(10)
  label.writeUInt16LE(1, 0)
  label.writeUInt16LE(0, 2)
  label.writeUInt32LE(1, 6)
  const qtyHead = Buffer.alloc(10)
  qtyHead.writeUInt16LE(0, 0)
  qtyHead.writeUInt16LE(1, 2)
  const qty = Buffer.alloc(14)
  qty.writeUInt16LE(1, 0)
  qty.writeUInt16LE(1, 2)
  qty.writeDoubleLE(4, 6)
  const book = Buffer.concat([
    record(0x0809, bof),
    record(0x0042, Buffer.from([0xe3, 0x04])),
    record(0x0085, Buffer.concat([bound, name])),
    record(0x00fc, sst),
    record(0x0809, sheetBof),
    record(0x00fd, header),
    record(0x0204, Buffer.concat([qtyHead.subarray(0, 6), unicode('Количество', true)])),
    record(0x00fd, label),
    record(0x0203, qty),
  ])
  const text = readBiffText(book)
  expect(text).toContain('Лист «Смета»')
  expect(text).toContain('Кронштейн')
  expect(text).toContain('| 4 |')
})
