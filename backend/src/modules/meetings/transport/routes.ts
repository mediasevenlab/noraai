import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi'
import {
  deleteMeetingResponseSchema,
  meetingListSchema,
  meetingSchema,
  renameMeetingSpeakerSchema,
  renameMeetingTitleSchema,
} from '@web-app-demo/contracts'
import type { MiddlewareHandler } from 'hono'

import { AppError, validationErrorHook } from '../../../http/errors'
import type { AuthHttpEnv } from '../../auth'
import type { MeetingsService } from '../application/meetings-service'
import { MeetingFailure } from '../domain/errors'
import { meetingPartBytes } from '../domain/meeting-parts'

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
  path: '/me/meetings',
  tags: ['Meetings'],
  security: [{ BearerAuth: [] }],
  responses: {
    200: {
      content: { 'application/json': { schema: meetingListSchema } },
      description: 'Meetings owned by the current user',
    },
    401: { content: errorContent, description: 'Authentication required' },
  },
})

const getRoute = createRoute({
  method: 'get',
  path: '/me/meetings/{meetingId}',
  tags: ['Meetings'],
  security: [{ BearerAuth: [] }],
  request: { params: z.object({ meetingId: z.string().uuid() }) },
  responses: {
    200: {
      content: { 'application/json': { schema: meetingSchema } },
      description: 'One meeting and its transcript',
    },
    401: { content: errorContent, description: 'Authentication required' },
    404: { content: errorContent, description: 'Meeting not found' },
  },
})

const renameRoute = createRoute({
  method: 'patch',
  path: '/me/meetings/{meetingId}/speakers',
  tags: ['Meetings'],
  security: [{ BearerAuth: [] }],
  request: {
    params: z.object({ meetingId: z.string().uuid() }),
    body: { content: { 'application/json': { schema: renameMeetingSpeakerSchema } } },
  },
  responses: {
    200: {
      content: { 'application/json': { schema: meetingSchema } },
      description: 'Meeting with the speaker name replaced',
    },
    400: { content: errorContent, description: 'The name cannot be saved' },
    401: { content: errorContent, description: 'Authentication required' },
    404: { content: errorContent, description: 'Meeting not found' },
  },
})

const renameTitleRoute = createRoute({
  method: 'patch',
  path: '/me/meetings/{meetingId}',
  tags: ['Meetings'],
  security: [{ BearerAuth: [] }],
  request: {
    params: z.object({ meetingId: z.string().uuid() }),
    body: { content: { 'application/json': { schema: renameMeetingTitleSchema } } },
  },
  responses: {
    200: {
      content: { 'application/json': { schema: meetingSchema } },
      description: 'Meeting with the new title',
    },
    400: { content: errorContent, description: 'The title cannot be saved' },
    401: { content: errorContent, description: 'Authentication required' },
    404: { content: errorContent, description: 'Meeting not found' },
  },
})

const deleteRoute = createRoute({
  method: 'delete',
  path: '/me/meetings/{meetingId}',
  tags: ['Meetings'],
  security: [{ BearerAuth: [] }],
  request: { params: z.object({ meetingId: z.string().uuid() }) },
  responses: {
    200: {
      content: { 'application/json': { schema: deleteMeetingResponseSchema } },
      description: 'Meeting deleted',
    },
    401: { content: errorContent, description: 'Authentication required' },
    404: { content: errorContent, description: 'Meeting not found' },
  },
})

function headerText(value: string | undefined) {
  return value?.trim() ?? ''
}

function headerInteger(value: string | undefined) {
  const raw = headerText(value)
  if (!/^\d+$/.test(raw)) throw new MeetingFailure('bad_request', 'Не удалось принять часть записи')
  const parsed = Number(raw)
  if (!Number.isSafeInteger(parsed)) throw new MeetingFailure('bad_request', 'Не удалось принять часть записи')
  return parsed
}

function headerFileName(value: string | undefined) {
  const raw = headerText(value)
  if (!raw) return ''
  try {
    return decodeURIComponent(raw).replace(/^.*[\\/]/, '').slice(0, 180)
  } catch {
    return raw.replace(/^.*[\\/]/, '').slice(0, 180)
  }
}

function toAppError(error: unknown) {
  if (error instanceof MeetingFailure) {
    if (error.kind === 'not_found') return new AppError(404, 'NOT_FOUND', error.message)
    if (error.kind === 'unavailable') return new AppError(503, 'INTERNAL_ERROR', error.message)
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

export function createMeetingRoutes(options: {
  requireAuth: MiddlewareHandler<AuthHttpEnv>
  service: MeetingsService
}) {
  const routes = new OpenAPIHono<AuthHttpEnv>({ defaultHook: validationErrorHook })
  routes.use('*', options.requireAuth)
  routes.openapi(listRoute, async (c) => {
    return c.json(await execute(() => options.service.list(c.var.user.id)), 200)
  })
  routes.openapi(getRoute, async (c) => {
    return c.json(await execute(() => options.service.get(c.var.user.id, c.req.valid('param').meetingId)), 200)
  })
  routes.openapi(renameTitleRoute, async (c) => {
    const body = c.req.valid('json')
    return c.json(
      await execute(() => options.service.renameTitle(c.var.user.id, c.req.valid('param').meetingId, body.title)),
      200,
    )
  })
  routes.openapi(renameRoute, async (c) => {
    const body = c.req.valid('json')
    return c.json(
      await execute(() => options.service.renameSpeaker(c.var.user.id, c.req.valid('param').meetingId, body.from, body.to)),
      200,
    )
  })
  routes.openapi(deleteRoute, async (c) => {
    return c.json(await execute(() => options.service.remove(c.var.user.id, c.req.valid('param').meetingId)), 200)
  })
  routes.get('/me/meetings/:meetingId/audio', async (c) => {
    const audio = await execute(() => options.service.readAudio(c.var.user.id, c.req.param('meetingId')))
    const ascii = audio.fileName.replace(/[^\x20-\x7E]/g, '_').replace(/["\\]/g, '_') || 'recording'
    return c.body(new Uint8Array(audio.bytes), 200, {
      'Content-Type': audio.mime,
      'Content-Disposition': `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(audio.fileName)}`,
    })
  })
  routes.post('/me/meetings/:meetingId/retry', async (c) => {
    return c.json(await execute(() => options.service.retry(c.var.user.id, c.req.param('meetingId'))), 200)
  })
  routes.post('/me/meetings/:meetingId/cancel', async (c) => {
    return c.json(await execute(() => options.service.cancel(c.var.user.id, c.req.param('meetingId'))), 200)
  })
  routes.post('/me/meetings/parts', async (c) => {
    const result = await execute(async () => {
      const declared = Number(c.req.header('content-length') ?? '')
      if (Number.isFinite(declared) && declared > meetingPartBytes) {
        throw new MeetingFailure('bad_request', 'Часть записи повреждена')
      }
      return options.service.acceptPart(c.var.user.id, {
        uploadId: headerText(c.req.header('x-upload-id')),
        index: headerInteger(c.req.header('x-part-index')),
        count: headerInteger(c.req.header('x-part-count')),
        fileSize: headerInteger(c.req.header('x-file-size')),
        fileName: headerFileName(c.req.header('x-file-name')),
        mime: headerText(c.req.header('x-file-mime')) || 'application/octet-stream',
        title: headerFileName(c.req.header('x-meeting-title')),
        bytes: Buffer.from(await c.req.arrayBuffer()),
      })
    })
    if (result.partial) return c.json({ received: result.index, count: result.count }, 200)
    return c.json(result.meeting, 200)
  })
  routes.delete('/me/meetings/parts/:uploadId', async (c) => {
    return c.json(await execute(() => options.service.discardPart(c.var.user.id, c.req.param('uploadId'))), 200)
  })
  routes.post('/me/meetings', async (c) => {
    const result = await execute(async () => {
      const body = await c.req.parseBody()
      const file = body.file
      if (!(file instanceof File)) throw new MeetingFailure('bad_request', 'Выберите запись встречи')
      return options.service.submit(
        c.var.user.id,
        {
          name: file.name,
          mime: file.type || 'application/octet-stream',
          bytes: Buffer.from(await file.arrayBuffer()),
        },
        body.speakers,
        typeof body.title === 'string' ? body.title : undefined,
      )
    })
    return c.json(result, 200)
  })
  return routes
}
