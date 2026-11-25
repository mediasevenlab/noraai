import type { DbClient } from '../../../db'
import type { AgentStore } from '../application/agents'
import type { ChatAgentId } from '../domain/agent'

export function createPrismaAgentStore(db: DbClient): AgentStore {
  return {
    async get(userId) {
      const row = await db.user.findUnique({ where: { id: userId }, select: { chatAgent: true } })
      return row?.chatAgent ?? 'nora'
    },
    async set(userId, agent: ChatAgentId) {
      await db.user.update({ where: { id: userId }, data: { chatAgent: agent } })
    },
  }
}
