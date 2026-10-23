import { KnowledgeFailure } from '../domain/errors'
import { buildKnowledgeContext, chunkKnowledgeText } from '../domain/retrieve'
import type { KnowledgeBaseRecord, KnowledgeFileRecord, KnowledgeRepository } from './ports'

const MAX_FILE_BYTES = 20 * 1024 * 1024
const MAX_EXTRACTED_CHARS = 1_500_000

function cleanName(name: string) {
  const cleaned = name.replace(/\s+/g, ' ').trim()
  if (!cleaned) throw new KnowledgeFailure('bad_request', 'Введите название базы')
  return cleaned.slice(0, 80)
}

function fileName(name: string) {
  const base = name.split(/[/\\]/).pop()?.replace(/\s+/g, ' ').trim() ?? ''
  if (!base) throw new KnowledgeFailure('bad_request', 'У файла нет имени')
  return base.slice(0, 180)
}

function presentBase(base: KnowledgeBaseRecord) {
  return {
    id: base.id,
    name: base.name,
    updatedAt: base.updatedAt.toISOString(),
    files: base.files.map(presentFile),
  }
}

function presentFile(file: KnowledgeFileRecord) {
  return {
    id: file.id,
    name: file.name,
    bytes: file.bytes,
    createdAt: file.createdAt.toISOString(),
  }
}

export function createKnowledgeService(deps: {
  repository: KnowledgeRepository
  extract: (name: string, bytes: Buffer) => Promise<string>
}) {
  return {
    async list(userId: string) {
      const bases = await deps.repository.list(userId)
      return { bases: bases.map(presentBase) }
    },
    async create(userId: string, name: string) {
      return presentBase(await deps.repository.create(userId, cleanName(name)))
    },
    async rename(userId: string, baseId: string, name: string) {
      const base = await deps.repository.rename(userId, baseId, cleanName(name))
      if (!base) throw new KnowledgeFailure('not_found', 'База знаний не найдена')
      return presentBase(base)
    },
    async remove(userId: string, baseId: string) {
      const removed = await deps.repository.remove(userId, baseId)
      if (!removed) throw new KnowledgeFailure('not_found', 'База знаний не найдена')
      return { ok: true as const }
    },
    async addFile(userId: string, baseId: string, upload: { name: string; mime: string; bytes: Buffer }) {
      if (upload.bytes.length === 0) throw new KnowledgeFailure('bad_request', 'Файл пустой')
      if (upload.bytes.length > MAX_FILE_BYTES) {
        throw new KnowledgeFailure('bad_request', 'Файл больше 20 МБ')
      }
      const name = fileName(upload.name)
      let extracted = ''
      try {
        extracted = await deps.extract(name, upload.bytes)
      } catch (error) {
        if (error instanceof KnowledgeFailure) throw error
        throw new KnowledgeFailure('bad_request', 'Не удалось прочитать файл')
      }
      const text = extracted.replace(/\u0000/g, '').trim().slice(0, MAX_EXTRACTED_CHARS)
      const chunks = chunkKnowledgeText(text)
      if (chunks.length === 0) throw new KnowledgeFailure('bad_request', 'В файле не нашлось текста')
      const saved = await deps.repository.addFile(userId, baseId, {
        name,
        mime: upload.mime.slice(0, 120),
        bytes: upload.bytes.length,
        chunks,
      })
      if (!saved) throw new KnowledgeFailure('not_found', 'База знаний не найдена')
      return presentFile(saved)
    },
    async removeFile(userId: string, fileId: string) {
      const removed = await deps.repository.removeFile(userId, fileId)
      if (!removed) throw new KnowledgeFailure('not_found', 'Файл не найден')
      return { ok: true as const }
    },
    async context(userId: string, baseIds: readonly string[], query: string) {
      const passages = await deps.repository.passages(userId, baseIds)
      return buildKnowledgeContext(query, passages)
    },
  }
}

export type KnowledgeService = ReturnType<typeof createKnowledgeService>
