import { OpenAPIHono } from '@hono/zod-openapi'
import type { MiddlewareHandler } from 'hono'

import { procurementSavedPageSchema, procurementSyncSchema } from '@web-app-demo/contracts'

import { AppError } from '../../../http/errors'
import type { AuthHttpEnv } from '../../auth'
import type { createProcurementListService } from '../application/list-service'
import type { createProcurementSampleService } from '../application/sample-service'
import { EisFailure } from '../domain/errors'

type SampleService = ReturnType<typeof createProcurementSampleService>
type ListService = ReturnType<typeof createProcurementListService>

export function createProcurementRoutes(options: {
  requireAuth: MiddlewareHandler<AuthHttpEnv>
  service: SampleService
  list: ListService
  sync: () => {
    running: boolean
    phase: string
    day: string
    page: number
    queued: number
    saved: number
    failed: number
    zipBytes: number
    truncated: number
    dropped: number
    cellsDone: number
    cellsTotal: number
    eta: string
    indexed: number
    sweepDone: number
    sweepTotal: number
    sweepNote: string
  }
  saved: (page: number, raw: { text?: string; laws?: readonly string[] }) => {
    total: number
    page: number
    pageCount: number
    notices: {
      law: string
      status: string
      number: string
      object: string
      customer: string
      price: string
      published: string
      updated: string
      deadline: string
      url: string
    }[]
  }
}) {
  const routes = new OpenAPIHono<AuthHttpEnv>()
  routes.use('*', options.requireAuth)
  routes.get('/me/procurements/sync', (c) => c.json(procurementSyncSchema.parse(options.sync())))
  routes.get('/me/procurements/saved', (c) => {
    const page = Number(c.req.query('page') ?? '1')
    const laws = (c.req.query('law') ?? '').split(',').map((item) => item.trim()).filter(Boolean)
    return c.json(procurementSavedPageSchema.parse(options.saved(Number.isFinite(page) ? page : 1, {
      text: c.req.query('q') ?? '',
      laws,
    })))
  })
  routes.get('/me/procurements/open', async (c) => {
    try {
      return c.json(await options.list.open(c.req.raw.signal))
    } catch (error) {
      if (error instanceof EisFailure) throw new AppError(503, 'INTERNAL_ERROR', error.message)
      throw new AppError(503, 'INTERNAL_ERROR', 'ЕИС сейчас не отвечает.')
    }
  })
  routes.get('/me/procurements/sample', async (c) => {
    try {
      return c.json(await options.service.sample(c.req.raw.signal))
    } catch (error) {
      if (error instanceof EisFailure) throw new AppError(503, 'INTERNAL_ERROR', error.message)
      throw new AppError(503, 'INTERNAL_ERROR', 'ЕИС не отдала архив.')
    }
  })
  return { routes }
}
