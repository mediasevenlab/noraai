import { deflateRawSync } from 'node:zlib'
import { expect, test } from 'bun:test'

import { attachedFileContext, directKnowledgeReply } from '../domain/retrieve'
import { extractKnowledgeDocument } from './extract-document'

function crc32(data: Buffer) {
  let crc = 0xffffffff
  for (const byte of data) {
    crc ^= byte
    for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ ((crc & 1) === 1 ? 0xedb88320 : 0)
  }
  return (crc ^ 0xffffffff) >>> 0
}

function zip(entries: { name: string; data: string }[]) {
  const locals: Buffer[] = []
  const centrals: Buffer[] = []
  let offset = 0
  for (const entry of entries) {
    const name = Buffer.from(entry.name)
    const raw = Buffer.from(entry.data)
    const compressed = deflateRawSync(raw)
    const crc = crc32(raw)
    const local = Buffer.alloc(30)
    local.writeUInt32LE(0x04034b50, 0)
    local.writeUInt16LE(20, 4)
    local.writeUInt16LE(8, 8)
    local.writeUInt32LE(crc, 14)
    local.writeUInt32LE(compressed.length, 18)
    local.writeUInt32LE(raw.length, 22)
    local.writeUInt16LE(name.length, 26)
    const central = Buffer.alloc(46)
    central.writeUInt32LE(0x02014b50, 0)
    central.writeUInt16LE(20, 6)
    central.writeUInt16LE(8, 10)
    central.writeUInt32LE(crc, 16)
    central.writeUInt32LE(compressed.length, 20)
    central.writeUInt32LE(raw.length, 24)
    central.writeUInt16LE(name.length, 28)
    central.writeUInt32LE(offset, 42)
    locals.push(local, name, compressed)
    centrals.push(central, name)
    offset += local.length + name.length + compressed.length
  }
  const directory = Buffer.concat(centrals)
  const end = Buffer.alloc(22)
  end.writeUInt32LE(0x06054b50, 0)
  end.writeUInt16LE(entries.length, 8)
  end.writeUInt16LE(entries.length, 10)
  end.writeUInt32LE(directory.length, 12)
  end.writeUInt32LE(offset, 16)
  return Buffer.concat([...locals, directory, end])
}

const workbook = zip([
  {
    name: 'xl/sharedStrings.xml',
    data: '<sst><si><t>ID</t></si><si><t>Name</t></si><si><t>Apple</t></si><si><t>Служба</t></si><si><t>ТЗК</t></si></sst>',
  },
  {
    name: 'xl/workbook.xml',
    data: '<workbook xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Фрукты" sheetId="1" r:id="rId1"/><sheet name="Смены" sheetId="2" r:id="rId2"/></sheets></workbook>',
  },
  {
    name: 'xl/_rels/workbook.xml.rels',
    data: '<Relationships><Relationship Id="rId1" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Target="worksheets/sheet2.xml"/></Relationships>',
  },
  {
    name: 'xl/worksheets/sheet1.xml',
    data: '<worksheet><sheetData><row r="1"><c r="A1" t="s"><v>0</v></c><c r="B1" t="s"><v>1</v></c></row><row r="2"><c r="A2"><v>1</v></c><c r="B2" t="s"><v>2</v></c></row></sheetData></worksheet>',
  },
  {
    name: 'xl/worksheets/sheet2.xml',
    data: '<worksheet><sheetData><row r="1"><c r="A1" t="s"><v>3</v></c><c r="B1" t="inlineStr"><is><t>Смена</t></is></c></row><row r="2"><c r="A2" t="s"><v>4</v></c><c r="B2"><v>2</v></c></row></sheetData></worksheet>',
  },
])

test('an excel workbook keeps each sheet as its own table', async () => {
  const text = await extractKnowledgeDocument('book.xlsx', workbook)
  expect(text).toContain('Лист «Фрукты»')
  expect(text).toContain('| Apple |')
  expect(text).toContain('| ТЗК | 2 |')
  const menu = directKnowledgeReply(attachedFileContext('какие там есть таблицы?', 'book.xlsx', text))
  expect(menu).toContain('1. Фрукты')
  expect(menu).toContain('2. Смены')
  const sheet = directKnowledgeReply(attachedFileContext('построй вторую?', 'book.xlsx', text))
  expect(sheet).toContain('| ТЗК | 2 |')
  expect(sheet).not.toContain('Apple')
})
