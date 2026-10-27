import { expect, test } from 'bun:test'

import type { KnowledgeFileStore, KnowledgeRepository, KnowledgeBaseRecord, KnowledgeFileRecord } from './ports'
import { createKnowledgeService } from './knowledge-service'

function memoryFiles(): KnowledgeFileStore & { files: Map<string, Buffer> } {
  const files = new Map<string, Buffer>()
  return {
    files,
    async save(fileId, bytes) {
      files.set(fileId, Buffer.from(bytes))
    },
    async read(fileId) {
      return files.get(fileId) ?? null
    },
    async remove(fileId) {
      files.delete(fileId)
    },
  }
}

function memoryRepository(): KnowledgeRepository & { rows: KnowledgeBaseRecord[] } {
  const rows: KnowledgeBaseRecord[] = []
  return {
    rows,
    async list(userId) {
      return rows.filter((row) => row.id.startsWith(userId))
    },
    async create(userId, name) {
      const row: KnowledgeBaseRecord = {
        id: `${userId}-base`,
        name,
        updatedAt: new Date('2026-10-27T00:00:00.000Z'),
        files: [],
      }
      rows.push(row)
      return row
    },
    async rename() {
      return null
    },
    async findFile(userId, fileId) {
      for (const row of rows) {
        if (!row.id.startsWith(userId)) continue
        const file = row.files.find((item) => item.id === fileId)
        if (file) return { ...file, baseId: row.id }
      }
      return null
    },
    async remove(userId, baseId) {
      const index = rows.findIndex((row) => row.id === baseId && row.id.startsWith(userId))
      if (index < 0) return false
      rows.splice(index, 1)
      return true
    },
    async addFile(_userId, baseId, file) {
      const row = rows.find((item) => item.id === baseId)
      if (!row) return null
      const saved: KnowledgeFileRecord = {
        id: `${baseId}-file-${row.files.length + 1}`,
        name: file.name,
        bytes: file.bytes,
        createdAt: new Date('2026-10-23T00:00:00.000Z'),
      }
      row.files.push(saved)
      return saved
    },
    async removeFile(userId, fileId) {
      for (const row of rows) {
        if (!row.id.startsWith(userId)) continue
        const index = row.files.findIndex((file) => file.id === fileId)
        if (index < 0) continue
        row.files.splice(index, 1)
        return true
      }
      return false
    },
    async passages() {
      return []
    },
  }
}

test('a saved knowledge file can be downloaded and leaves with the base', async () => {
  const repository = memoryRepository()
  const files = memoryFiles()
  const service = createKnowledgeService({
    repository,
    files,
    async extract() {
      return 'Текст инструкции'
    },
  })
  const base = await service.create('user-1', 'БКО')
  const saved = await service.addFile('user-1', base.id, {
    name: 'test_table.pdf',
    mime: 'application/pdf',
    bytes: Buffer.from('pdf'),
  })
  const downloaded = await service.readFile('user-1', saved.id)
  expect(downloaded.bytes.toString()).toBe('pdf')
  expect(downloaded.fileName).toBe('test_table.pdf')
  expect(downloaded.mime).toBe('application/pdf')
  await service.remove('user-1', base.id)
  expect(files.files.has(saved.id)).toBe(false)
})

test('a file uploaded before copies were kept cannot be downloaded', async () => {
  const repository = memoryRepository()
  const service = createKnowledgeService({
    repository,
    async extract() {
      return 'Текст'
    },
  })
  const base = await service.create('user-1', 'БКО')
  const saved = await service.addFile('user-1', base.id, {
    name: 'old.pdf',
    mime: 'application/pdf',
    bytes: Buffer.from('pdf'),
  })
  await expect(service.readFile('user-1', saved.id)).rejects.toThrow('не сохранился')
})
