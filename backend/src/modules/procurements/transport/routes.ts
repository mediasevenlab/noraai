import { OpenAPIHono } from '@hono/zod-openapi'
import type { MiddlewareHandler } from 'hono'

import { procurementNoticeCardSchema, procurementSavedPageSchema, procurementSyncSchema } from '@web-app-demo/contracts'

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
    closure: {
      phase: string
      day: string
      done: number
      total: number
      note: string
      removed: number
      cellsDone: number
      cellsTotal: number
    }
  }
  saved: (page: number, raw: { text?: string; phrases?: readonly string[]; laws?: readonly string[]; rank?: boolean }) => {
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
      matches: number
      parsed: boolean
    }[]
  }
  card: (number: string) => {
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
    parsed: boolean
    sections: { title: string; fields: { label: string; value: string }[] }[]
  } | null
}) {
  const routes = new OpenAPIHono<AuthHttpEnv>()
  routes.use('*', options.requireAuth)
  routes.get('/me/procurements/sync', (c) => c.json(procurementSyncSchema.parse(options.sync())))
  routes.get('/me/procurements/saved', (c) => {
    const page = Number(c.req.query('page') ?? '1')
    const laws = (c.req.query('law') ?? '').split(',').map((item) => item.trim()).filter(Boolean)
    const phrases = new URL(c.req.url).searchParams.getAll('q')
    return c.json(procurementSavedPageSchema.parse(options.saved(Number.isFinite(page) ? page : 1, {
      phrases,
      laws,
      rank: c.req.query('rank') === '1',
    })))
  })
  routes.get('/me/procurements/notices/:number', (c) => {
    const card = options.card(c.req.param('number'))
    if (!card) throw new AppError(404, 'NOT_FOUND', 'Извещение не найдено')
    return c.json(procurementNoticeCardSchema.parse(card))
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
