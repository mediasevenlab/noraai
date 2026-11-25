import type { MiddlewareHandler } from 'hono'

import type { DbClient } from '../../db'
import type { AuthHttpEnv } from '../auth'
import { createCompaniesService } from './application/companies'
import { createPrismaCompanyStore } from './infrastructure/company-store'
import { createCompanyRoutes } from './transport/routes'

export function createCompaniesModule(options: {
  db: DbClient
  requireAuth: MiddlewareHandler<AuthHttpEnv>
}) {
  const service = createCompaniesService(createPrismaCompanyStore(options.db))
  return {
    routes: createCompanyRoutes({ requireAuth: options.requireAuth, service }),
    profilesForChat: (userId: string, ids: readonly string[]) => service.profilesForChat(userId, ids),
  }
}
