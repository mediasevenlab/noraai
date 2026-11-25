import { OpenAPIHono } from '@hono/zod-openapi'
import { chatAgentUpdateSchema, chatAgentViewSchema } from '@web-app-demo/contracts'
import type { MiddlewareHandler } from 'hono'

import { AppError } from '../../../http/errors'
import type { AuthHttpEnv } from '../../auth'
import { AgentRuleError, type createAgentsService } from '../application/agents'

type AgentsService = ReturnType<typeof createAgentsService>

export function createAgentRoutes(options: {
  requireAuth: MiddlewareHandler<AuthHttpEnv>
  service: AgentsService
}) {
  const routes = new OpenAPIHono<AuthHttpEnv>()
  routes.use('*', options.requireAuth)
  routes.get('/me/agent', async (c) => {
    const view = await options.service.view(c.var.user.id)
    return c.json(chatAgentViewSchema.parse(view))
  })
  routes.put('/me/agent', async (c) => {
    const body = chatAgentUpdateSchema.parse(await c.req.json())
    const view = await options.service.select(c.var.user.id, body.agent).catch((error: unknown) => {
      if (error instanceof AgentRuleError) throw new AppError(400, 'VALIDATION_ERROR', error.message)
      throw error
    })
    return c.json(chatAgentViewSchema.parse(view))
  })
  return routes
}
