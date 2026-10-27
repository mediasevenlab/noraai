import { mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'

import type { KnowledgeFileStore } from '../application/ports'

export function createKnowledgeFileStore(root = path.join(process.cwd(), 'uploads', 'knowledge')): KnowledgeFileStore {
  function file(fileId: string) {
    return path.join(root, fileId)
  }

  return {
    async save(fileId, bytes) {
      await mkdir(root, { recursive: true })
      await writeFile(file(fileId), bytes)
    },
    async read(fileId) {
      try {
        return await readFile(file(fileId))
      } catch {
        return null
      }
    },
    async remove(fileId) {
      await rm(file(fileId), { force: true })
    },
  }
}
