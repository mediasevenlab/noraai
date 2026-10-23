import { createHash, timingSafeEqual } from 'node:crypto'
import { Hono } from 'hono'
import type { MiddlewareHandler } from 'hono'

import type { AppEnv } from '../../../env'
import { sendArchivePost } from '../infrastructure/telegram-archive'

export function createNewsArchiveInternalRoutes(env: Pick<AppEnv, 'INTERNAL_SERVICE_TOKEN' | 'TELEGRAM_NEWS_BOT_TOKEN' | 'TELEGRAM_API_BASE' | 'GEMINI_PROXY_TOKEN'>) {
  const routes = new Hono()
  routes.use('*', requireServiceToken(env.INTERNAL_SERVICE_TOKEN))
  routes.post('/news-archive/send', async (c) => {
    const body = await c.req.json().catch(() => null)
    try {
      const sent = await sendArchivePost(env, body && typeof body === 'object' ? body : {})
      return c.json({ ok: true, ...sent })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not publish'
      return c.json({
        ok: false,
        description: message.replace(/bot\d+:[A-Za-z0-9_-]+/g, 'bot').replace(/https?:\/\/\S+/g, '[url]').slice(0, 300),
      })
    }
  })
  return routes
}

function requireServiceToken(expected: string | undefined): MiddlewareHandler {
  return async (c, next) => {
    if (!expected) return c.json({ ok: false, description: 'Archive send is not configured' }, 503)
    const header = c.req.header('authorization') ?? ''
    const provided = header.startsWith('Bearer ') ? header.slice('Bearer '.length) : ''
    if (!provided || !sameToken(provided, expected)) return c.json({ ok: false, description: 'Unauthorized' }, 401)
    await next()
  }
}

function sameToken(left: string, right: string) {
  const leftDigest = createHash('sha256').update(left).digest()
  const rightDigest = createHash('sha256').update(right).digest()
  return timingSafeEqual(leftDigest, rightDigest)
}
