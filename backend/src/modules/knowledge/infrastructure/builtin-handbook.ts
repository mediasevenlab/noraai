import path from 'node:path'

import type { DbClient } from '../../../db'
import { chunkKnowledgeText, spreadSchemeMarkers } from '../domain/retrieve'
import { extractKnowledgeDocument } from './extract-document'
import { createKnowledgeFileStore } from './knowledge-file-store'

export const HANDBOOK_BASE_ID = '019a2c3d-7e4b-7000-8000-000000000001'
const HANDBOOK_NAME = 'Схемы операционного контроля'
const HANDBOOK_FILE = 'Схемы операционного контроля.html'
const HANDBOOK_HTML = path.join(import.meta.dir, '../../../../assets/knowledge/sprav/handbook.html')
const MAX_EXTRACTED_CHARS = 1_500_000

/** One shared handbook for every account. A second start leaves the existing base in place. */
export async function ensureBuiltinHandbook(db: DbClient) {
  const existing = await db.knowledgeBase.findFirst({ where: { builtin: true }, select: { id: true } })
  if (existing) return
  const asset = Bun.file(HANDBOOK_HTML)
  if (!(await asset.exists())) {
    console.error('Handbook HTML is missing, the default knowledge base was not created')
    return
  }
  const bytes = Buffer.from(await asset.arrayBuffer())
  const extracted = (await extractKnowledgeDocument(HANDBOOK_FILE, bytes)).replace(/\u0000/g, '').trim()
  const chunks = spreadSchemeMarkers(chunkKnowledgeText(extracted.slice(0, MAX_EXTRACTED_CHARS)))
  if (chunks.length === 0) {
    console.error('Handbook HTML had no text, the default knowledge base was not created')
    return
  }
  const files = createKnowledgeFileStore()
  let fileId = ''
  try {
    const base = await db.knowledgeBase.create({
      data: {
        id: HANDBOOK_BASE_ID,
        name: HANDBOOK_NAME,
        builtin: true,
        files: {
          create: {
            name: HANDBOOK_FILE,
            mime: 'text/html; charset=utf-8',
            bytes: bytes.length,
            chunks: { create: chunks.map((text, position) => ({ position, text })) },
          },
        },
      },
      select: { files: { select: { id: true } } },
    })
    fileId = base.files[0]?.id ?? ''
    if (!fileId) return
    await files.save(fileId, bytes)
  } catch (error) {
    if (fileId) {
      await db.knowledgeBase.delete({ where: { id: HANDBOOK_BASE_ID } }).catch(() => undefined)
      throw error
    }
    const ready = await db.knowledgeBase.findFirst({ where: { builtin: true }, select: { id: true } })
    if (ready) return
    throw error
  }
  console.log('Handbook knowledge base is ready')
}
