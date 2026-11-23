import { OpenAPIHono } from '@hono/zod-openapi'
import type { MiddlewareHandler } from 'hono'

import { b2bPageSchema } from '@web-app-demo/contracts'

import type { AuthHttpEnv } from '../../auth'
import { loadB2bPage } from '../application/procedures'

export function createB2bRoutes(options: {
  requireAuth: MiddlewareHandler<AuthHttpEnv>
  login?: string
  password?: string
  loadXml: (login: string, password: string, signal?: AbortSignal) => Promise<string>
}) {
  const routes = new OpenAPIHono<AuthHttpEnv>()
  routes.use('*', options.requireAuth)
  routes.get('/me/b2b/procedures', async (c) => {
    const page = await loadB2bPage({
      login: options.login,
      password: options.password,
      loadXml: options.loadXml,
      signal: c.req.raw.signal,
    })
    return c.json(b2bPageSchema.parse(page))
  })
  return { routes }
}
