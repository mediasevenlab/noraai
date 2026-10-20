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

import { validationErrorHook } from '../../../http/errors'
import type { AuthHttpEnv } from '../../auth'
import type { NewsService } from '../application/news-service'
import { executeNews } from './errors'

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
  authed.openapi(listPostsRoute, async (c) => {
    const feed = await executeNews(() => service.list(c.var.user.id))
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
    const result = await executeNews(() => service.deletePost(
      c.var.user.id,
      c.req.valid('param').postId,
    ))
    return c.json(result, 200)
  })
  authed.openapi(deleteChannelRoute, async (c) => {
    const result = await executeNews(() => service.deleteChannel(
      c.var.user.id,
      c.req.valid('param').handle,
    ))
    return c.json(result, 200)
  })
  routes.route('/', authed)
  return routes
}
