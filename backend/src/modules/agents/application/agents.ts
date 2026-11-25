import { agentView, isChatAgent, parseChatAgent, type AgentReady, type ChatAgentId } from '../domain/agent'

export type AgentStore = {
  get: (userId: string) => Promise<string | null>
  set: (userId: string, agent: ChatAgentId) => Promise<void>
}

export class AgentRuleError extends Error {
  constructor(message: string) {
    super(message)
  }
}

export function createAgentsService(store: AgentStore, ready: () => AgentReady) {
  return {
    async view(userId: string) {
      return agentView(parseChatAgent(await store.get(userId)), ready())
    },
    async select(userId: string, agent: string) {
      if (!isChatAgent(agent)) throw new AgentRuleError('Такого агента нет')
      await store.set(userId, agent)
      return agentView(agent, ready())
    },
    async preference(userId: string) {
      return parseChatAgent(await store.get(userId))
    },
  }
}
