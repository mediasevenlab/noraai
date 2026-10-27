import type { Context, MiddlewareHandler } from 'hono'
import { getConnInfo } from 'hono/bun'
import { bodyLimit } from 'hono/body-limit'
import { isIP } from 'node:net'

import { errorResponse } from './errors'

type AuthSecurityOptions = {
  bodyLimitBytes: number
  mealBodyLimitBytes?: number
  rateLimitMax: number
  rateLimitWindowSeconds: number
  mealRateLimitMax?: number
  trustProxy: boolean
  trustedProxyClientIpHeader?: string
  trustedProxyClientIpPosition?: 'first' | 'last'
}

type RateLimitBucket = {
  count: number
  resetAt: number
}

type RateLimitOptions = AuthSecurityOptions & {
  skipGet?: boolean
  errorMessage?: string
  skipPath?: (pathname: string) => boolean
  matchPath?: (pathname: string) => boolean
}

const maxTrackedClients = 10_000

export function isMealWritePath(pathname: string): boolean {
  return /\/meals(?:\/|$)/.test(pathname)
}

/** Mentor plan create and update embed meal photos, same size as a meal write. */
export function isMentorPlanBodyPath(pathname: string): boolean {
  return /\/mentor\/plans(?:\/|$)/.test(pathname)
}

/** Settings model chat sends the same photo payloads as a meal. */
export function isModelChatPath(pathname: string): boolean {
  return /\/model-chat(?:\/|$)/.test(pathname)
}

export function isKnowledgeUploadPath(pathname: string): boolean {
  return /\/knowledge-bases\/[^/]+\/files(?:\/|$)/.test(pathname)
}

export function isMeetingUploadPath(pathname: string): boolean {
  return /\/meetings(?:\/|$)/.test(pathname)
}

export function isFavoritesPath(pathname: string): boolean {
  return /\/favorites(?:\/|$)/.test(pathname)
}

export function isPlanLibraryPath(pathname: string): boolean {
  return /\/plan-library(?:\/|$)/.test(pathname)
}

export function isAuthWriteBudgetExemptPath(pathname: string): boolean {
  return isMealWritePath(pathname) || isFavoritesPath(pathname) || isPlanLibraryPath(pathname)
}

/** Catalog week clone posts ~21–28 meals; keep that off the login budget. */
export function mealWriteRateLimitMax(accountRateLimitMax: number) {
  return Math.max(accountRateLimitMax * 4, 120)
}

function payloadTooLargeLimit(maxSize: number): MiddlewareHandler {
  return bodyLimit({
    maxSize,
    onError: (c) => c.json(errorResponse('PAYLOAD_TOO_LARGE', 'Request body is too large'), 413),
  })
}

export function createAuthSecurity(options: AuthSecurityOptions): MiddlewareHandler[] {
  const accountBodyLimit = payloadTooLargeLimit(options.bodyLimitBytes)
  const mealBodyLimit = options.mealBodyLimitBytes != null
    ? payloadTooLargeLimit(Math.max(options.bodyLimitBytes, options.mealBodyLimitBytes))
    : accountBodyLimit

  const meetingBodyLimit = options.meetingBodyLimitBytes != null
    ? payloadTooLargeLimit(Math.max(options.bodyLimitBytes, options.meetingBodyLimitBytes))
    : mealBodyLimit

  return [
    async (c, next) => {
      if (options.meetingBodyLimitBytes != null && isMeetingUploadPath(c.req.path)) {
        return meetingBodyLimit(c, next)
      }
      if (
        options.mealBodyLimitBytes != null &&
        (isMealWritePath(c.req.path) || isMentorPlanBodyPath(c.req.path) || isModelChatPath(c.req.path) || isKnowledgeUploadPath(c.req.path))
      ) {
        return mealBodyLimit(c, next)
      }
      return accountBodyLimit(c, next)
    },
    createRateLimit({
      ...options,
      skipGet: true,
      skipPath: isAuthWriteBudgetExemptPath,
      errorMessage: 'Too many authentication requests',
    }),
    createRateLimit({
      ...options,
      skipGet: true,
      matchPath: isMealWritePath,
      rateLimitMax: options.mealRateLimitMax ?? mealWriteRateLimitMax(options.rateLimitMax),
      errorMessage: 'Too many meal requests',
    }),
  ]
}

export function createInternalRateLimit(
  options: Omit<AuthSecurityOptions, 'bodyLimitBytes'>,
): MiddlewareHandler {
  return createRateLimit({
    ...options,
    bodyLimitBytes: 1,
    skipGet: false,
    errorMessage: 'Too many internal requests',
  })
}

function createRateLimit(options: RateLimitOptions): MiddlewareHandler {
  const buckets = new Map<string, RateLimitBucket>()
  const windowMs = options.rateLimitWindowSeconds * 1000

  return async (c, next) => {
    if (c.req.method === 'OPTIONS' || (options.skipGet !== false && c.req.method === 'GET')) {
      await next()
      return
    }
    if (options.skipPath?.(c.req.path) || (options.matchPath && !options.matchPath(c.req.path))) {
      await next()
      return
    }

    const now = Date.now()
    let key = clientAddress(c, options)
    let bucket = buckets.get(key)

    if (!bucket || bucket.resetAt <= now) {
      if (buckets.size >= maxTrackedClients - 1) {
        deleteExpiredBuckets(buckets, now)
      }
      if (buckets.size >= maxTrackedClients - 1) {
        key = 'overflow'
        bucket = buckets.get(key)
      }
    }

    if (!bucket || bucket.resetAt <= now) {
      bucket = { count: 0, resetAt: now + windowMs }
      buckets.set(key, bucket)
    }

    bucket.count += 1
    c.header('RateLimit-Limit', String(options.rateLimitMax))
    c.header('RateLimit-Remaining', String(Math.max(0, options.rateLimitMax - bucket.count)))
    c.header('RateLimit-Reset', String(Math.ceil(bucket.resetAt / 1000)))

    if (bucket.count > options.rateLimitMax) {
      c.header('Retry-After', String(Math.max(1, Math.ceil((bucket.resetAt - now) / 1000))))
      return c.json(errorResponse('RATE_LIMITED', options.errorMessage ?? 'Too many authentication requests'), 429)
    }

    await next()
  }
}

export function clientAddress(
  c: Context,
  options: Pick<
    AuthSecurityOptions,
    'trustProxy' | 'trustedProxyClientIpHeader' | 'trustedProxyClientIpPosition'
  >,
) {
  if (options.trustProxy && options.trustedProxyClientIpHeader) {
    const addresses = c.req
      .header(options.trustedProxyClientIpHeader)
      ?.split(',')
      .map((address) => address.trim())
      .filter(Boolean)
    const forwardedAddress = options.trustedProxyClientIpPosition === 'last'
      ? addresses?.at(-1)
      : addresses?.[0]
    if (forwardedAddress && isIP(forwardedAddress)) return forwardedAddress
  }

  try {
    return getConnInfo(c).remote.address || 'unknown'
  } catch {
    return 'unknown'
  }
}

function deleteExpiredBuckets(buckets: Map<string, RateLimitBucket>, now: number) {
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key)
  }
}
