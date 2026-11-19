import {
  procurementSavedPageSchema,
  procurementSyncSchema,
  type ProcurementSavedPage,
  type ProcurementSync,
} from '@web-app-demo/contracts'

import type { AuthenticatedTransport } from '@/platform/api'

export function loadSavedProcurements(
  transport: AuthenticatedTransport,
  page: number,
  filter: { query: string; laws: readonly string[] },
) {
  const params = new URLSearchParams({ page: String(page) })
  if (filter.query.trim()) params.set('q', filter.query.trim())
  if (filter.laws.length > 0) params.set('law', filter.laws.join(','))
  return transport.request(`/api/users/me/procurements/saved?${params}`, procurementSavedPageSchema)
}

export function loadProcurementSync(transport: AuthenticatedTransport) {
  return transport.request('/api/users/me/procurements/sync', procurementSyncSchema)
}

export type { ProcurementSavedPage, ProcurementSync }
