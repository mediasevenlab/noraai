import { createHash, timingSafeEqual } from 'node:crypto'
import { createMiddleware } from 'hono/factory'

import { AppError } from '../../../http/errors'

export function createRequireServiceToken(expectedToken: string | undefined) {
  return createMiddleware(async (c, next) => {
    if (!expectedToken) {
      throw new AppError(503, 'INTERNAL_ERROR', 'INTERNAL_SERVICE_TOKEN is not configured')
    }
    const provided = bearerToken(c.req.header('authorization'))
    if (!provided || !tokensEqual(provided, expectedToken)) {
      throw new AppError(401, 'UNAUTHORIZED', 'Valid service token required')
    }
    await next()
  })
}

export function tokensEqual(left: string, right: string) {
  const leftDigest = createHash('sha256').update(left).digest()
  const rightDigest = createHash('sha256').update(right).digest()
  return timingSafeEqual(leftDigest, rightDigest)
}

function bearerToken(authorization: string | undefined) {
  if (!authorization?.startsWith('Bearer ')) return undefined
  return authorization.slice('Bearer '.length)
}
