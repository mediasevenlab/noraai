import type { DbClient } from '../../../db'
import type { CompanyStore } from '../domain/company'

export function createPrismaCompanyStore(db: DbClient): CompanyStore {
  return {
    async list(userId) {
      const rows = await db.companyProfile.findMany({
        where: { userId },
        orderBy: { createdAt: 'asc' },
        select: { id: true, name: true, prompt: true, enabled: true },
      })
      return rows
    },
    count(userId) {
      return db.companyProfile.count({ where: { userId } })
    },
    async create(userId, name) {
      const row = await db.companyProfile.create({
        data: { userId, name },
        select: { id: true, name: true, prompt: true, enabled: true },
      })
      return row
    },
    async update(userId, id, patch) {
      const existing = await db.companyProfile.findFirst({
        where: { id, userId },
        select: { id: true },
      })
      if (!existing) return null
      return db.companyProfile.update({
        where: { id },
        data: patch,
        select: { id: true, name: true, prompt: true, enabled: true },
      })
    },
    async remove(userId, id) {
      const removed = await db.companyProfile.deleteMany({ where: { id, userId } })
      return removed.count > 0
    },
    async briefs(userId, ids) {
      if (ids.length === 0) return []
      return db.companyProfile.findMany({
        where: { userId, id: { in: [...ids] }, enabled: true },
        select: { id: true, name: true, prompt: true },
      })
    },
  }
}
