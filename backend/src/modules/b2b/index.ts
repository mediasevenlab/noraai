import type { MiddlewareHandler } from 'hono'

import type { AuthHttpEnv } from '../auth'
import { loadFirmTenders } from './infrastructure/client'
import { createB2bRoutes } from './transport/routes'

export function createB2bModule(options: {
  requireAuth: MiddlewareHandler<AuthHttpEnv>
  login?: string
  password?: string
}) {
  return createB2bRoutes({ ...options, loadXml: loadFirmTenders })
}
