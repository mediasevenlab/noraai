import type { MiddlewareHandler } from 'hono'

import type { DbClient } from '../../db'
import type { AppEnv } from '../../env'
import type { AuthHttpEnv } from '../auth'
import { NewsService } from './application/news-service'
import { createNewsMediaUrlBuilder } from './domain/media-url'
import { createNewsStore } from './infrastructure/news-store'
import { createTelegramChannelSource } from './infrastructure/telegram-web'
import { createNewsRoutes } from './transport/routes'

export function createNewsModule({
  db,
  env,
  requireAuth,
}: {
  db: DbClient
  env: AppEnv
  requireAuth: MiddlewareHandler<AuthHttpEnv>
}) {
  const service = new NewsService(
    createNewsStore(db),
    createTelegramChannelSource(env),
    createNewsMediaUrlBuilder(env.JWT_SECRET),
  )
  return {
    routes: createNewsRoutes({ requireAuth, service }),
  }
}
