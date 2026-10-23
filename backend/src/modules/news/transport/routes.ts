import {
  apiErrorSchema,
  newsChannelDeleteResponseSchema,
  newsDeleteResponseSchema,
  newsFeedSchema,
  newsImportRequestSchema,
  newsImportResponseSchema,
} from '@web-app-demo/contracts'
import { z } from 'zod'
import { createRoute, OpenAPIHono } from '@hono/zod-openapi'
import type { MiddlewareHandler } from 'hono'

import { AppError, validationErrorHook } from '../../../http/errors'
import type { AuthHttpEnv } from '../../auth'
import type { NewsService } from '../application/news-service'
import { NewsFailure } from '../domain/errors'
import { executeNews } from './errors'

const POST_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
const VIDEO_TYPES = new Set(['video/mp4', 'video/quicktime'])
const IMAGE_LIMIT = 10 * 1024 * 1024
const VIDEO_LIMIT = 49 * 1024 * 1024

const errorContent = {
  'application/json': {
    schema: apiErrorSchema,
  },
}

const bearerSecurity = [{ BearerAuth: [] }]

const listPostsRoute = createRoute({
  method: 'get',
  path: '/posts',
  security: bearerSecurity,
  responses: {
    200: {
      content: { 'application/json': { schema: newsFeedSchema } },
      description: 'Saved news posts for the signed-in user',
    },
    401: { content: errorContent, description: 'Authentication required' },
  },
})

const deletePostRoute = createRoute({
  method: 'delete',
  path: '/posts/{postId}',
  security: bearerSecurity,
  request: {
    params: z.object({
      postId: z.string().uuid(),
    }),
  },
  responses: {
    200: {
      content: { 'application/json': { schema: newsDeleteResponseSchema } },
      description: 'The post is removed for this user',
    },
    401: { content: errorContent, description: 'Authentication required' },
    404: { content: errorContent, description: 'Post not found' },
  },
})

const deleteChannelRoute = createRoute({
  method: 'delete',
  path: '/channels/{handle}',
  security: bearerSecurity,
  request: {
    params: z.object({
      handle: z.string().trim().min(1).max(200),
    }),
  },
  responses: {
    200: {
      content: { 'application/json': { schema: newsChannelDeleteResponseSchema } },
      description: 'Posts from this channel are removed for this user',
    },
    400: { content: errorContent, description: 'Channel handle is invalid' },
    401: { content: errorContent, description: 'Authentication required' },
  },
})

const importPostsRoute = createRoute({
  method: 'post',
  path: '/import',
  security: bearerSecurity,
  request: {
    body: {
      content: {
        'application/json': {
          schema: newsImportRequestSchema,
        },
      },
    },
  },
  responses: {
    200: {
      content: { 'application/json': { schema: newsImportResponseSchema } },
      description: 'Posts from the chosen interval, without creating duplicates',
    },
    400: { content: errorContent, description: 'No usable channel link' },
    401: { content: errorContent, description: 'Authentication required' },
  },
})

export function createNewsRoutes({
  requireAuth,
  service,
}: {
  requireAuth: MiddlewareHandler<AuthHttpEnv>
  service: NewsService
}) {
  const routes = new OpenAPIHono<AuthHttpEnv>({ defaultHook: validationErrorHook })
  routes.get('/posts/:postId/media/:index', async (c) => {
    const index = Number(c.req.param('index'))
    const response = await executeNews(() => service.openMedia(
      c.req.param('postId'),
      index,
      c.req.query('exp'),
      c.req.query('sig'),
      c.req.header('range'),
    ))
    return response
  })

  const authed = new OpenAPIHono<AuthHttpEnv>({ defaultHook: validationErrorHook })
  authed.use('*', requireAuth)
  authed.use('*', async (c, next) => {
    if (c.var.user.role !== 'admin') {
      throw new AppError(403, 'FORBIDDEN', 'You do not have permission to access this resource')
    }
    await next()
  })
  authed.openapi(listPostsRoute, async (c) => {
    const feed = await executeNews(() => service.list())
    return c.json(feed, 200)
  })
  authed.openapi(importPostsRoute, async (c) => {
    const body = c.req.valid('json')
    const result = await executeNews(() => service.importChannels(
      c.var.user.id,
      body.channels,
      { from: new Date(body.from), to: new Date(body.to) },
    ))
    return c.json(result, 200)
  })
  authed.openapi(deletePostRoute, async (c) => {
    const result = await executeNews(() => service.deletePost(c.req.valid('param').postId))
    return c.json(result, 200)
  })
  authed.openapi(deleteChannelRoute, async (c) => {
    const result = await executeNews(() => service.deleteChannel(c.req.valid('param').handle))
    return c.json(result, 200)
  })
  authed.patch('/posts/:postId', async (c) => {
    const postId = c.req.param('postId')
    if (!POST_ID.test(postId)) throw new AppError(400, 'BAD_REQUEST', 'News post not found')
    const result = await executeNews(async () => {
      const body = await c.req.parseBody({ all: true })
      const keep = readKeep(body.keep)
      const uploads = await readUploads(body.file)
      const order = readOrder(body.order, keep.length, uploads.length)
      return service.editPost(postId, {
        title: typeof body.title === 'string' ? body.title : '',
        body: typeof body.body === 'string' ? body.body : '',
        keep,
        uploads,
        ...(order ? { order } : {}),
      })
    })
    return c.json(result, 200)
  })
  routes.route('/', authed)
  return routes
}

function readOrder(value: unknown, keepCount: number, uploadCount: number) {
  if (typeof value !== 'string' || value.trim() === '') return null
  let parsed: unknown
  try {
    parsed = JSON.parse(value)
  } catch {
    throw new NewsFailure('bad_request', 'News media is invalid')
  }
  if (!Array.isArray(parsed) || parsed.some((item) => item !== 'keep' && item !== 'file')) {
    throw new NewsFailure('bad_request', 'News media is invalid')
  }
  const slots = parsed as Array<'keep' | 'file'>
  const keeps = slots.filter((item) => item === 'keep').length
  const files = slots.filter((item) => item === 'file').length
  if (keeps !== keepCount || files !== uploadCount) throw new NewsFailure('bad_request', 'News media is invalid')
  return slots
}

function readKeep(value: unknown) {
  if (typeof value !== 'string' || value.trim() === '') return []
  let parsed: unknown
  try {
    parsed = JSON.parse(value)
  } catch {
    throw new NewsFailure('bad_request', 'News media is invalid')
  }
  if (!Array.isArray(parsed) || parsed.some((item) => !Number.isInteger(item))) {
    throw new NewsFailure('bad_request', 'News media is invalid')
  }
  return parsed as number[]
}

async function readUploads(value: unknown) {
  const files = (Array.isArray(value) ? value : value == null ? [] : [value]).filter((item): item is File => item instanceof File && item.size > 0)
  if (files.length > 10) throw new NewsFailure('bad_request', 'A post can hold up to 10 files')
  const uploads: { kind: 'image' | 'video'; bytes: Uint8Array; mime: string }[] = []
  for (const file of files) {
    const image = IMAGE_TYPES.has(file.type)
    const video = VIDEO_TYPES.has(file.type)
    if (!image && !video) throw new NewsFailure('bad_request', 'News media is invalid')
    if (file.size > (video ? VIDEO_LIMIT : IMAGE_LIMIT)) throw new NewsFailure('bad_request', 'News media is too large')
    uploads.push({
      kind: video ? 'video' as const : 'image' as const,
      bytes: new Uint8Array(await file.arrayBuffer()),
      mime: file.type,
    })
  }
  return uploads
}
