import { KnowledgeFailure } from '../domain/errors'
import { buildKnowledgeContext, chunkKnowledgeText, spreadSchemeMarkers } from '../domain/retrieve'
import type { KnowledgeBaseRecord, KnowledgeFileRecord, KnowledgeFileStore, KnowledgeRepository } from './ports'

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
    builtin: base.builtin,
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

function downloadMime(fileName: string) {
  const ext = fileName.toLowerCase().split('.').pop()
  if (ext === 'pdf') return 'application/pdf'
  if (ext === 'txt' || ext === 'md' || ext === 'csv' || ext === 'log') return 'text/plain; charset=utf-8'
  if (ext === 'json') return 'application/json'
  if (ext === 'html' || ext === 'htm') return 'text/html; charset=utf-8'
  if (ext === 'xls') return 'application/vnd.ms-excel'
  if (ext === 'xlsx' || ext === 'xlsm') return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  if (ext === 'docx') return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  return 'application/octet-stream'
}

const missingFile = 'Файл не сохранился, загрузите его ещё раз'

export function createKnowledgeService(deps: {
  repository: KnowledgeRepository
  extract: (name: string, bytes: Buffer) => Promise<string>
  files?: KnowledgeFileStore
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
      const current = (await deps.repository.list(userId)).find((item) => item.id === baseId)
      if (current?.builtin) throw new KnowledgeFailure('bad_request', 'Эту базу нельзя изменить')
      const base = await deps.repository.rename(userId, baseId, cleanName(name))
      if (!base) throw new KnowledgeFailure('not_found', 'База знаний не найдена')
      return presentBase(base)
    },
    async remove(userId: string, baseId: string) {
      const bases = await deps.repository.list(userId)
      const base = bases.find((item) => item.id === baseId)
      if (!base) throw new KnowledgeFailure('not_found', 'База знаний не найдена')
      if (base.builtin) throw new KnowledgeFailure('bad_request', 'Эту базу нельзя удалить')
      const removed = await deps.repository.remove(userId, baseId)
      if (!removed) throw new KnowledgeFailure('not_found', 'База знаний не найдена')
      if (base && deps.files) await Promise.all(base.files.map((file) => deps.files!.remove(file.id)))
      return { ok: true as const }
    },
    async addFile(userId: string, baseId: string, upload: { name: string; mime: string; bytes: Buffer }) {
      const base = (await deps.repository.list(userId)).find((item) => item.id === baseId)
      if (!base) throw new KnowledgeFailure('not_found', 'База знаний не найдена')
      if (base.builtin) throw new KnowledgeFailure('bad_request', 'Эту базу нельзя изменить')
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
      const chunks = spreadSchemeMarkers(chunkKnowledgeText(text))
      if (chunks.length === 0) throw new KnowledgeFailure('bad_request', 'В файле не нашлось текста')
      const saved = await deps.repository.addFile(userId, baseId, {
        name,
        mime: upload.mime.slice(0, 120),
        bytes: upload.bytes.length,
        chunks,
      })
      if (!saved) throw new KnowledgeFailure('not_found', 'База знаний не найдена')
      if (deps.files) {
        try {
          await deps.files.save(saved.id, upload.bytes)
        } catch {
          await deps.repository.removeFile(userId, saved.id)
          throw new KnowledgeFailure('bad_request', 'Не удалось сохранить файл')
        }
      }
      return presentFile(saved)
    },
    async readFile(userId: string, fileId: string) {
      const file = await deps.repository.findFile(userId, fileId)
      if (!file) throw new KnowledgeFailure('not_found', 'Файл не найден')
      const bytes = deps.files ? await deps.files.read(fileId) : null
      if (!bytes) throw new KnowledgeFailure('bad_request', missingFile)
      return { bytes, fileName: file.name, mime: downloadMime(file.name) }
    },
    async removeFile(userId: string, fileId: string) {
      const file = await deps.repository.findFile(userId, fileId)
      if (!file) throw new KnowledgeFailure('not_found', 'Файл не найден')
      if (file.builtin) throw new KnowledgeFailure('bad_request', 'Эту базу нельзя изменить')
      const removed = await deps.repository.removeFile(userId, fileId)
      if (!removed) throw new KnowledgeFailure('not_found', 'Файл не найден')
      await deps.files?.remove(fileId)
      return { ok: true as const }
    },
    async context(userId: string, baseIds: readonly string[], query: string) {
      const passages = await deps.repository.passages(userId, baseIds)
      return buildKnowledgeContext(query, passages)
    },
  }
}

export type KnowledgeService = ReturnType<typeof createKnowledgeService>
