import type { DbClient } from '../../../db'
import type { KnowledgeRepository } from '../application/ports'
import type { KnowledgePassage } from '../domain/retrieve'

export function createKnowledgeRepository(db: DbClient): KnowledgeRepository {
  return {
    list(userId: string) {
      return db.knowledgeBase.findMany({
        where: { OR: [{ userId }, { builtin: true }] },
        orderBy: [{ builtin: 'desc' }, { updatedAt: 'desc' }],
        include: { files: { orderBy: { createdAt: 'asc' }, select: { id: true, name: true, bytes: true, createdAt: true } } },
      })
    },
    create(userId: string, name: string) {
      return db.knowledgeBase.create({
        data: { userId, name },
        include: { files: { select: { id: true, name: true, bytes: true, createdAt: true } } },
      })
    },
    async rename(userId: string, baseId: string, name: string) {
      const owned = await db.knowledgeBase.findFirst({ where: { id: baseId, userId }, select: { id: true } })
      if (!owned) return null
      return db.knowledgeBase.update({
        where: { id: baseId },
        data: { name },
        include: { files: { orderBy: { createdAt: 'asc' }, select: { id: true, name: true, bytes: true, createdAt: true } } },
      })
    },
    async findFile(userId: string, fileId: string) {
      const file = await db.knowledgeFile.findFirst({
        where: { id: fileId, base: { OR: [{ userId }, { builtin: true }] } },
        select: {
          id: true,
          baseId: true,
          name: true,
          bytes: true,
          createdAt: true,
          base: { select: { builtin: true } },
        },
      })
      if (!file) return null
      return {
        id: file.id,
        baseId: file.baseId,
        name: file.name,
        bytes: file.bytes,
        createdAt: file.createdAt,
        builtin: file.base.builtin,
      }
    },
    async remove(userId: string, baseId: string) {
      const result = await db.knowledgeBase.deleteMany({ where: { id: baseId, userId } })
      return result.count > 0
    },
    async addFile(
      userId: string,
      baseId: string,
      file: { name: string; mime: string; bytes: number; chunks: string[] },
    ) {
      const owned = await db.knowledgeBase.findFirst({ where: { id: baseId, userId }, select: { id: true } })
      if (!owned) return null
      return db.knowledgeFile.create({
        data: {
          baseId,
          name: file.name,
          mime: file.mime,
          bytes: file.bytes,
          chunks: { create: file.chunks.map((text, position) => ({ position, text })) },
        },
        select: { id: true, name: true, bytes: true, createdAt: true },
      })
    },
    async removeFile(userId: string, fileId: string) {
      const file = await db.knowledgeFile.findFirst({
        where: { id: fileId, base: { userId } },
        select: { id: true },
      })
      if (!file) return false
      await db.knowledgeFile.delete({ where: { id: fileId } })
      return true
    },
    async passages(userId: string, baseIds: readonly string[]): Promise<KnowledgePassage[]> {
      if (baseIds.length === 0) return []
      const chunks = await db.knowledgeChunk.findMany({
        where: { file: { baseId: { in: [...baseIds] }, base: { OR: [{ userId }, { builtin: true }] } } },
        select: {
          position: true,
          text: true,
          file: { select: { name: true, base: { select: { name: true } } } },
        },
      })
      return chunks.map((chunk) => ({
        baseName: chunk.file.base.name,
        fileName: chunk.file.name,
        position: chunk.position,
        text: chunk.text,
      }))
    },
  }
}
