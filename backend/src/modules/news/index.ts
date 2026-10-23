import type { MiddlewareHandler } from 'hono'

import type { DbClient } from '../../db'
import type { AppEnv } from '../../env'
import type { AuthHttpEnv } from '../auth'
import { NewsService } from './application/news-service'
import { createNewsMediaUrlBuilder } from './domain/media-url'
import { createNewsAdClassifier } from './infrastructure/ad-classifier'
import { createNewsArchive } from './infrastructure/archive-channel'
import { createNewsStore } from './infrastructure/news-store'
import { createTelegramChannelSource } from './infrastructure/telegram-web'
import { createNewsArchiveInternalRoutes } from './transport/internal'
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
    createNewsArchive(env),
    () => new Date(),
    createNewsAdClassifier(env),
  )
  return {
    routes: createNewsRoutes({ requireAuth, service }),
    internalRoutes: createNewsArchiveInternalRoutes(env),
  }
}
