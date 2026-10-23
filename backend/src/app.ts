import { OpenAPIHono } from '@hono/zod-openapi'
import { bodyLimit } from 'hono/body-limit'
import { cors } from 'hono/cors'
import { secureHeaders } from 'hono/secure-headers'

import { createBackgroundTasks, type TaskDeferrer } from './background-tasks'
import type { DbClient } from './db'
import { disabledEmailDelivery, type EmailDelivery } from './email/service'
import type { AppEnv } from './env'
import { errorResponse, handleError, validationErrorHook } from './http/errors'
import { createAuthSecurity, createInternalRateLimit } from './http/security'
import { createAuthModule, type AuthHttpEnv } from './modules/auth'
import { createKnowledgeModule } from './modules/knowledge'
import { createMealsModule } from './modules/meals'
import { createNewsModule } from './modules/news'
import { createQuestionnaireProjectUser, createTelegramLinkStore, createUsersModule } from './modules/users'

type CreateAppOptions = {
  backgroundTasks?: TaskDeferrer
  emailDelivery?: EmailDelivery
  env: AppEnv
  prisma: DbClient
  startMealsPoller?: boolean
}

export function createApp({
  backgroundTasks = createBackgroundTasks(),
  emailDelivery = disabledEmailDelivery,
  env,
  prisma,
  startMealsPoller = false,
}: CreateAppOptions) {
  // Photos travel as Base64. Chat and a meal with several shots need more than the 64 KB account limit.
  const mealRequestBodyLimitBytes = 32 * 1024 * 1024
  const auth = createAuthModule({
    backgroundTasks,
    db: prisma,
    emailDelivery,
    env,
    projectUser: createQuestionnaireProjectUser(prisma),
  })
  const telegramLinks = createTelegramLinkStore(prisma)
  const knowledge = createKnowledgeModule({
    db: prisma,
    env,
    requireAuth: auth.requireAuth,
  })
  const meals = createMealsModule({
    backgroundTasks,
    completeTelegramLink: (code, proof, extras) => telegramLinks.complete(code, proof, extras),
    db: prisma,
    env,
    requireAuth: auth.requireAuth,
    requireMentor: auth.requireMentor,
    loadKnowledge: knowledge.loadContext,
    readDocument: (name, bytes) => knowledge.readDocument(name, bytes),
    startPoller: startMealsPoller,
  })
  const news = createNewsModule({
    db: prisma,
    env,
    requireAuth: auth.requireAuth,
  })
  const users = createUsersModule({
    botUsername: env.TELEGRAM_MEALS_BOT_USERNAME,
    notifyBotUsername: env.TELEGRAM_NOTIFY_BOT_USERNAME,
    db: prisma,
    mealMediaCleanup: meals.service,
    requireAdmin: auth.requireAdmin,
    requireAuth: auth.requireAuth,
    requireMentor: auth.requireMentor,
    telegramLinks,
  })
  const app = new OpenAPIHono<AuthHttpEnv>({
    defaultHook: validationErrorHook,
  })
  app.openAPIRegistry.registerComponent('securitySchemes', 'BearerAuth', {
    type: 'http',
    scheme: 'bearer',
    bearerFormat: 'JWT',
  })

  app.use(secureHeaders())
  app.use(
    '*',
    cors({
      origin: (origin) => {
        if (!origin) return env.CORS_ORIGINS[0] ?? null
        return env.CORS_ORIGINS.includes(origin) ? origin : null
      },
      allowHeaders: ['Content-Type', 'Authorization'],
      allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      credentials: true,
      maxAge: 600,
    }),
  )
  for (const middleware of createAuthSecurity({
    bodyLimitBytes: env.AUTH_BODY_LIMIT_BYTES,
    rateLimitMax: env.AUTH_RATE_LIMIT_MAX,
    rateLimitWindowSeconds: env.AUTH_RATE_LIMIT_WINDOW_SECONDS,
    trustProxy: env.TRUST_PROXY,
    trustedProxyClientIpHeader: env.TRUSTED_PROXY_CLIENT_IP_HEADER,
    trustedProxyClientIpPosition: env.TRUSTED_PROXY_CLIENT_IP_POSITION,
  })) {
    app.use('/api/auth/*', middleware)
  }
  for (const middleware of createAuthSecurity({
    bodyLimitBytes: env.AUTH_BODY_LIMIT_BYTES,
    mealBodyLimitBytes: mealRequestBodyLimitBytes,
    rateLimitMax: env.AUTH_RATE_LIMIT_MAX,
    rateLimitWindowSeconds: env.AUTH_RATE_LIMIT_WINDOW_SECONDS,
    trustProxy: env.TRUST_PROXY,
    trustedProxyClientIpHeader: env.TRUSTED_PROXY_CLIENT_IP_HEADER,
    trustedProxyClientIpPosition: env.TRUSTED_PROXY_CLIENT_IP_POSITION,
  })) {
    app.use('/api/users/*', middleware)
    app.use('/api/plans/*', middleware)
    app.use('/api/admin/*', middleware)
    app.use('/api/mentor/*', middleware)
    app.use('/api/news/*', middleware)
  }
  app.get('/', (c) => {
    return c.json({
      name: 'web_app_demo backend',
      status: 'ok',
    })
  })

  app.get('/health', (c) => {
    return c.json({
      status: 'ok',
    })
  })

  app.get('/health/live', (c) => {
    return c.json({
      status: 'ok',
    })
  })

  app.get('/health/ready', async (c) => {
    try {
      await prisma.$queryRaw`SELECT 1`
      return c.json({ status: 'ok' }, 200)
    } catch {
      return c.json({ status: 'unavailable' }, 503)
    }
  })

  app.route('/api/auth', auth.routes)
  app.route('/api/users', users.userRoutes)
  app.route('/api/users', meals.userMealsRoutes)
  app.route('/api/users', knowledge.routes)
  app.route('/api/admin', users.adminRoutes)
  app.route('/api/mentor', users.mentorRoutes)
  app.route('/api/news', news.routes)
  app.use(
    '/api/internal/*',
    bodyLimit({
      maxSize: mealRequestBodyLimitBytes,
      onError: (c) => c.json(errorResponse('PAYLOAD_TOO_LARGE', 'Request body is too large'), 413),
    }),
  )
  app.use(
    '/api/internal/*',
    createInternalRateLimit({
      rateLimitMax: env.INTERNAL_RATE_LIMIT_MAX,
      rateLimitWindowSeconds: env.INTERNAL_RATE_LIMIT_WINDOW_SECONDS,
      trustProxy: env.TRUST_PROXY,
      trustedProxyClientIpHeader: env.TRUSTED_PROXY_CLIENT_IP_HEADER,
      trustedProxyClientIpPosition: env.TRUSTED_PROXY_CLIENT_IP_POSITION,
    }),
  )
  app.route('/api/internal', news.internalRoutes)

  app.doc('/openapi.json', {
    openapi: '3.0.0',
    info: {
      title: 'web_app_demo API',
      version: '1.0.0',
    },
  })

  app.notFound((c) => c.json(errorResponse('NOT_FOUND', 'Route not found'), 404))
  app.onError(handleError)

  return Object.assign(app, {
    dispose: async () => {
      await meals.dispose()
    },
  })
}

export type AppType = ReturnType<typeof createApp>
