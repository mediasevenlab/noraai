import { OpenAPIHono } from '@hono/zod-openapi'
import type { MiddlewareHandler } from 'hono'

import { AppError, validationErrorHook } from '../../../http/errors'
import type { AuthHttpEnv } from '../../auth'
import type { createSpeechService } from '../application/speech-service'
import { SpeechFailure } from '../domain/errors'

type SpeechService = ReturnType<typeof createSpeechService>

export function createSpeechRoutes(options: {
  requireAuth: MiddlewareHandler<AuthHttpEnv>
  service: SpeechService
}) {
  const routes = new OpenAPIHono<AuthHttpEnv>({ defaultHook: validationErrorHook })
  routes.use('*', options.requireAuth)
  routes.post('/me/speech', async (c) => {
    const body = await c.req.json().catch(() => null)
    const text = body && typeof body === 'object' && 'text' in body && typeof body.text === 'string' ? body.text : ''
    if (text.length > 20_000) throw new AppError(400, 'BAD_REQUEST', 'Текст для озвучки слишком длинный')
    let parts: AsyncGenerator<Uint8Array>
    try {
      parts = options.service.speakParts(text, c.req.raw.signal)
    } catch (error) {
      throw speechRouteError(error)
    }
    let first: IteratorResult<Uint8Array>
    try {
      first = await parts.next()
    } catch (error) {
      throw speechRouteError(error)
    }
    if (first.done || !first.value) throw new AppError(400, 'BAD_REQUEST', 'Нечего озвучивать')
    const opening = first.value
    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        const write = (part: Uint8Array) => {
          const header = new Uint8Array(4)
          new DataView(header.buffer).setUint32(0, part.byteLength)
          controller.enqueue(header)
          controller.enqueue(part)
        }
        try {
          write(opening)
          let next = await parts.next()
          while (!next.done) {
            write(next.value)
            next = await parts.next()
          }
          controller.close()
        } catch (error) {
          controller.error(error)
        }
      },
      cancel() {
        void parts.return(undefined)
      },
    })
    return c.body(stream, 200, {
      'Content-Type': 'application/octet-stream',
      'Cache-Control': 'no-store',
    })
  })
  return { routes }
}

function speechRouteError(error: unknown) {
  if (error instanceof SpeechFailure) {
    const status = error.kind === 'bad_request' ? 400 : 503
    const code = error.kind === 'bad_request' ? 'BAD_REQUEST' : 'INTERNAL_ERROR'
    return new AppError(status, code, error.message)
  }
  if (error instanceof AppError) return error
  return new AppError(503, 'INTERNAL_ERROR', 'Не получилось озвучить')
}
