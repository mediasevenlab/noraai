import { OpenAPIHono } from '@hono/zod-openapi'
import type { MiddlewareHandler } from 'hono'

import { tenderProPageSchema } from '@web-app-demo/contracts'

import type { AuthHttpEnv } from '../../auth'
import { loadTenderProPage } from '../application/procedures'

export function createTenderProRoutes(options: {
  requireAuth: MiddlewareHandler<AuthHttpEnv>
  key?: string
  companyId?: string
  loadList: (key: string, companyId: string | undefined, signal?: AbortSignal) => Promise<string>
}) {
  const routes = new OpenAPIHono<AuthHttpEnv>()
  routes.use('*', options.requireAuth)
  routes.get('/me/tender-pro/procedures', async (c) => {
    const page = await loadTenderProPage({
      key: options.key,
      companyId: options.companyId,
      loadList: options.loadList,
      signal: c.req.raw.signal,
    })
    return c.json(tenderProPageSchema.parse(page))
  })
  return { routes }
}
