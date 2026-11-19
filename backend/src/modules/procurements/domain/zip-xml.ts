import { inflateRawSync } from 'node:zlib'

import { EisFailure } from './errors'

const LOCAL = 0x04034b50
const CENTRAL = 0x02014b50
const EOCD = 0x06054b50

export function readZipXml(bytes: Buffer) {
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
  const first = files[0]
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
