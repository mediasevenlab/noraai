import type { MiddlewareHandler } from 'hono'

import type { DbClient } from '../../db'
import type { AppEnv } from '../../env'
import type { AuthHttpEnv } from '../auth'
import { agentName } from './domain/agent'
import { createAgentsService } from './application/agents'
import { createPrismaAgentStore } from './infrastructure/agent-store'
import { agentReady, completeAgentText } from './infrastructure/agent-text'
import { createAgentRoutes } from './transport/routes'

export function createAgentsModule(options: {
  db: DbClient
  env: AppEnv
  requireAuth: MiddlewareHandler<AuthHttpEnv>
}) {
  const service = createAgentsService(createPrismaAgentStore(options.db), () => agentReady(options.env))
  return {
    routes: createAgentRoutes({ requireAuth: options.requireAuth, service }),
    preference: (userId: string) => service.preference(userId),
    ready: () => agentReady(options.env),
    completeText: (
      agent: 'nora' | 'chatgpt' | 'gemini',
      system: string,
      user: string,
      signal?: AbortSignal,
    ) => completeAgentText(options.env, agent, system, user, signal),
    name: agentName,
  }
}
