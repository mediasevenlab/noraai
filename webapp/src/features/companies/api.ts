import {
  companyDeletedSchema,
  companyListSchema,
  companySchema,
  type Company,
  type CompanyList,
} from '@web-app-demo/contracts'

import type { AuthenticatedTransport } from '@/platform/api'

export function loadCompanies(transport: AuthenticatedTransport) {
  return transport.request('/api/users/me/companies', companyListSchema)
}

export function createCompany(transport: AuthenticatedTransport, name: string) {
  return transport.request('/api/users/me/companies', companySchema, {
    method: 'POST',
    body: { name },
  })
}

export function updateCompany(
  transport: AuthenticatedTransport,
  id: string,
  patch: { name?: string; prompt?: string; enabled?: boolean },
) {
  return transport.request(`/api/users/me/companies/${id}`, companySchema, {
    method: 'PATCH',
    body: patch,
  })
}

export function deleteCompany(transport: AuthenticatedTransport, id: string) {
  return transport.request(`/api/users/me/companies/${id}`, companyDeletedSchema, {
    method: 'DELETE',
  })
}

export type { Company, CompanyList }
