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
  filter: { phrases: readonly string[]; laws: readonly string[]; rank: boolean },
) {
  const params = new URLSearchParams({ page: String(page) })
  for (const phrase of filter.phrases) params.append('q', phrase)
  if (filter.laws.length > 0) params.set('law', filter.laws.join(','))
  if (filter.rank && filter.phrases.length > 0) params.set('rank', '1')
  return transport.request(`/api/users/me/procurements/saved?${params}`, procurementSavedPageSchema)
}

export function loadProcurementSync(transport: AuthenticatedTransport) {
  return transport.request('/api/users/me/procurements/sync', procurementSyncSchema)
}

export type { ProcurementSavedPage, ProcurementSync }
