import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi'
import {
  createKnowledgeBaseRequestSchema,
  deleteKnowledgeResponseSchema,
  knowledgeBaseListSchema,
  knowledgeBaseSchemaResponse,
  renameKnowledgeBaseRequestSchema,
} from '@web-app-demo/contracts'
import type { MiddlewareHandler } from 'hono'

import { AppError, validationErrorHook } from '../../../http/errors'
import type { AuthHttpEnv } from '../../auth'
import { KnowledgeFailure } from '../domain/errors'
import { readHandbookScheme } from '../infrastructure/handbook-schemes'
import type { KnowledgeService } from '../application/knowledge-service'

const errorContent = {
  'application/json': {
    schema: z.object({
      error: z.object({
        code: z.string(),
        message: z.string(),
      }),
    }),
  },
}

const listRoute = createRoute({
  method: 'get',
  path: '/me/knowledge-bases',
  tags: ['Knowledge'],
  security: [{ BearerAuth: [] }],
  responses: {
    200: {
      content: { 'application/json': { schema: knowledgeBaseListSchema } },
      description: 'Knowledge bases owned by the current user',
    },
    401: { content: errorContent, description: 'Authentication required' },
  },
})

const createRouteSpec = createRoute({
  method: 'post',
  path: '/me/knowledge-bases',
  tags: ['Knowledge'],
  security: [{ BearerAuth: [] }],
  request: {
    body: { content: { 'application/json': { schema: createKnowledgeBaseRequestSchema } } },
  },
  responses: {
    200: {
      content: { 'application/json': { schema: knowledgeBaseSchemaResponse } },
      description: 'Created knowledge base',
    },
    400: { content: errorContent, description: 'Invalid name' },
    401: { content: errorContent, description: 'Authentication required' },
  },
})

const renameRoute = createRoute({
  method: 'patch',
  path: '/me/knowledge-bases/{baseId}',
  tags: ['Knowledge'],
  security: [{ BearerAuth: [] }],
  request: {
    params: z.object({ baseId: z.string().uuid() }),
    body: { content: { 'application/json': { schema: renameKnowledgeBaseRequestSchema } } },
  },
  responses: {
    200: {
      content: { 'application/json': { schema: knowledgeBaseSchemaResponse } },
      description: 'Renamed knowledge base',
    },
    401: { content: errorContent, description: 'Authentication required' },
    404: { content: errorContent, description: 'Knowledge base not found' },
  },
})

const deleteRoute = createRoute({
  method: 'delete',
  path: '/me/knowledge-bases/{baseId}',
  tags: ['Knowledge'],
  security: [{ BearerAuth: [] }],
  request: { params: z.object({ baseId: z.string().uuid() }) },
  responses: {
    200: {
      content: { 'application/json': { schema: deleteKnowledgeResponseSchema } },
      description: 'Knowledge base deleted',
    },
    401: { content: errorContent, description: 'Authentication required' },
    404: { content: errorContent, description: 'Knowledge base not found' },
  },
})

const deleteFileRoute = createRoute({
  method: 'delete',
  path: '/me/knowledge-bases/{baseId}/files/{fileId}',
  tags: ['Knowledge'],
  security: [{ BearerAuth: [] }],
  request: {
    params: z.object({
      baseId: z.string().uuid(),
      fileId: z.string().uuid(),
    }),
  },
  responses: {
    200: {
      content: { 'application/json': { schema: deleteKnowledgeResponseSchema } },
      description: 'Knowledge file deleted',
    },
    401: { content: errorContent, description: 'Authentication required' },
    404: { content: errorContent, description: 'Knowledge file not found' },
  },
})

function toAppError(error: unknown) {
  if (error instanceof KnowledgeFailure) {
    if (error.kind === 'not_found') return new AppError(404, 'NOT_FOUND', error.message)
    return new AppError(400, 'BAD_REQUEST', error.message)
  }
  return error
}

async function execute<T>(operation: () => Promise<T>) {
  try {
    return await operation()
  } catch (error) {
    throw toAppError(error)
  }
}

export function createKnowledgeRoutes(options: {
  requireAuth: MiddlewareHandler<AuthHttpEnv>
  service: KnowledgeService
}) {
  const routes = new OpenAPIHono<AuthHttpEnv>({ defaultHook: validationErrorHook })
  routes.use('*', options.requireAuth)
  routes.get('/me/knowledge-schemes/:name', async (c) => {
    const scheme = await readHandbookScheme(c.req.param('name'))
    if (!scheme) throw new AppError(404, 'NOT_FOUND', 'Схема не найдена')
    return c.body(new Uint8Array(scheme.bytes), 200, {
      'Content-Type': scheme.mime,
      'Cache-Control': 'private, max-age=86400',
    })
  })
  routes.openapi(listRoute, async (c) => {
    const result = await execute(() => options.service.list(c.var.user.id))
    return c.json(result, 200)
  })
  routes.openapi(createRouteSpec, async (c) => {
    const result = await execute(() => options.service.create(c.var.user.id, c.req.valid('json').name))
    return c.json(result, 200)
  })
  routes.openapi(renameRoute, async (c) => {
    const result = await execute(() =>
      options.service.rename(c.var.user.id, c.req.valid('param').baseId, c.req.valid('json').name),
    )
    return c.json(result, 200)
  })
  routes.openapi(deleteRoute, async (c) => {
    const result = await execute(() => options.service.remove(c.var.user.id, c.req.valid('param').baseId))
    return c.json(result, 200)
  })
  routes.openapi(deleteFileRoute, async (c) => {
    const result = await execute(() => options.service.removeFile(c.var.user.id, c.req.valid('param').fileId))
    return c.json(result, 200)
  })
  routes.get('/me/knowledge-bases/:baseId/files/:fileId/content', async (c) => {
    const file = await execute(() => options.service.readFile(c.var.user.id, c.req.param('fileId')))
    const ascii = file.fileName.replace(/[^\x20-\x7E]/g, '_').replace(/["\\]/g, '_') || 'file'
    return c.body(new Uint8Array(file.bytes), 200, {
      'Content-Type': file.mime,
      'Content-Disposition': `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(file.fileName)}`,
    })
  })
  routes.post('/me/knowledge-bases/:baseId/files', async (c) => {
    const baseId = c.req.param('baseId')
    if (!z.string().uuid().safeParse(baseId).success) {
      throw new AppError(400, 'BAD_REQUEST', 'База знаний не найдена')
    }
    const result = await execute(async () => {
      const body = await c.req.parseBody()
      const file = body.file
      if (!(file instanceof File)) throw new KnowledgeFailure('bad_request', 'Выберите файл')
      return options.service.addFile(c.var.user.id, baseId, {
        name: file.name,
        mime: file.type || 'application/octet-stream',
        bytes: Buffer.from(await file.arrayBuffer()),
      })
    })
    return c.json(result, 200)
  })
  return routes
}
