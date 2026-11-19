import { crc32, inflateRawSync } from 'node:zlib'

import { EisFailure } from './errors'

const LOCAL = 0x04034b50
const CENTRAL = 0x02014b50
const EOCD = 0x06054b50

export function readZipEntries(bytes: Buffer) {
  const eocd = findEocd(bytes)
  const count = bytes.readUInt16LE(eocd + 10)
  let offset = bytes.readUInt32LE(eocd + 16)
  const files: { name: string; xml: string }[] = []
  for (let index = 0; index < count; index += 1) {
    if (offset + 46 > bytes.length || bytes.readUInt32LE(offset) !== CENTRAL) break
    const method = bytes.readUInt16LE(offset + 10)
    const compSize = bytes.readUInt32LE(offset + 20)
    const nameLen = bytes.readUInt16LE(offset + 28)
    const extraLen = bytes.readUInt16LE(offset + 30)
    const commentLen = bytes.readUInt16LE(offset + 32)
    const localOffset = bytes.readUInt32LE(offset + 42)
    const name = bytes.subarray(offset + 46, offset + 46 + nameLen).toString('utf8')
    if (name.endsWith('.xml') && compSize !== 0xffffffff) {
      if (localOffset + 30 > bytes.length || bytes.readUInt32LE(localOffset) !== LOCAL) {
        throw new EisFailure('Архив ЕИС не читается.')
      }
      const localNameLen = bytes.readUInt16LE(localOffset + 26)
      const localExtraLen = bytes.readUInt16LE(localOffset + 28)
      const start = localOffset + 30 + localNameLen + localExtraLen
      const data = bytes.subarray(start, start + compSize)
      const xml = method === 0 ? data : method === 8 ? inflateRawSync(data) : null
      if (!xml) throw new EisFailure('Архив ЕИС не читается.')
      files.push({ name, xml: xml.toString('utf8') })
    }
    offset += 46 + nameLen + extraLen + commentLen
  }
  return files
}

/** One notice kept after a mixed day archive is unpacked. */
export function zipSingleXml(name: string, xml: string) {
  const data = Buffer.from(xml)
  const fileName = Buffer.from(name)
  const checksum = crc32(data)
  const local = Buffer.alloc(30 + fileName.length + data.length)
  local.writeUInt32LE(LOCAL, 0)
  local.writeUInt16LE(20, 4)
  local.writeUInt32LE(checksum, 14)
  local.writeUInt32LE(data.length, 18)
  local.writeUInt32LE(data.length, 22)
  local.writeUInt16LE(fileName.length, 26)
  fileName.copy(local, 30)
  data.copy(local, 30 + fileName.length)
  const central = Buffer.alloc(46 + fileName.length)
  central.writeUInt32LE(CENTRAL, 0)
  central.writeUInt16LE(20, 4)
  central.writeUInt16LE(20, 6)
  central.writeUInt32LE(checksum, 16)
  central.writeUInt32LE(data.length, 20)
  central.writeUInt32LE(data.length, 24)
  central.writeUInt16LE(fileName.length, 28)
  fileName.copy(central, 46)
  const eocd = Buffer.alloc(22)
  eocd.writeUInt32LE(EOCD, 0)
  eocd.writeUInt16LE(1, 8)
  eocd.writeUInt16LE(1, 10)
  eocd.writeUInt32LE(central.length, 12)
  eocd.writeUInt32LE(local.length, 16)
  return Buffer.concat([local, central, eocd])
}

export function readZipXml(bytes: Buffer) {
  const first = readZipEntries(bytes)[0]
  if (!first) throw new EisFailure('В архиве ЕИС нет XML.')
  return first
}

function findEocd(bytes: Buffer) {
  const min = Math.max(0, bytes.length - 22 - 65535)
  for (let index = bytes.length - 22; index >= min; index -= 1) {
    if (bytes.readUInt32LE(index) === EOCD) return index
  }
  throw new EisFailure('Архив ЕИС не читается.')
}
