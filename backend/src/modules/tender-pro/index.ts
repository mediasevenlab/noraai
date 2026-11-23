import type { MiddlewareHandler } from 'hono'

import type { AuthHttpEnv } from '../auth'
import { loadOpenTenders } from './infrastructure/client'
import { createTenderProRoutes } from './transport/routes'

export function createTenderProModule(options: {
  requireAuth: MiddlewareHandler<AuthHttpEnv>
  key?: string
  companyId?: string
}) {
  return createTenderProRoutes({ ...options, loadList: loadOpenTenders })
}
