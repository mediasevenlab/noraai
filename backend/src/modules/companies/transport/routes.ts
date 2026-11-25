import { OpenAPIHono } from '@hono/zod-openapi'
import {
  companyCreateSchema,
  companyDeletedSchema,
  companyListSchema,
  companySchema,
  companyUpdateSchema,
} from '@web-app-demo/contracts'
import type { MiddlewareHandler } from 'hono'

import { AppError } from '../../../http/errors'
import type { AuthHttpEnv } from '../../auth'
import type { createCompaniesService } from '../application/companies'
import { CompanyRuleError } from '../domain/company'

type CompaniesService = ReturnType<typeof createCompaniesService>

function fail(error: unknown): never {
  if (error instanceof CompanyRuleError) throw new AppError(error.status, error.status === 404 ? 'NOT_FOUND' : 'VALIDATION_ERROR', error.message)
  throw error
}

export function createCompanyRoutes(options: {
  requireAuth: MiddlewareHandler<AuthHttpEnv>
  service: CompaniesService
}) {
  const routes = new OpenAPIHono<AuthHttpEnv>()
  routes.use('*', options.requireAuth)
  routes.get('/me/companies', async (c) => {
    const companies = await options.service.list(c.var.user.id)
    return c.json(companyListSchema.parse({ companies }))
  })
  routes.post('/me/companies', async (c) => {
    const body = companyCreateSchema.parse(await c.req.json())
    const company = await options.service.create(c.var.user.id, body.name).catch(fail)
    return c.json(companySchema.parse(company), 201)
  })
  routes.patch('/me/companies/:id', async (c) => {
    const body = companyUpdateSchema.parse(await c.req.json())
    const company = await options.service.update(c.var.user.id, c.req.param('id'), body).catch(fail)
    return c.json(companySchema.parse(company))
  })
  routes.delete('/me/companies/:id', async (c) => {
    await options.service.remove(c.var.user.id, c.req.param('id')).catch(fail)
    return c.json(companyDeletedSchema.parse({ ok: true }))
  })
  return routes
}
