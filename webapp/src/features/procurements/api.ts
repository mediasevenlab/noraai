import {
  procurementSavedPageSchema,
  procurementSyncSchema,
  type ProcurementSavedPage,
  type ProcurementSync,
} from '@web-app-demo/contracts'

import type { AuthenticatedTransport } from '@/platform/api'

export function loadSavedProcurements(transport: AuthenticatedTransport, page: number) {
  return transport.request(`/api/users/me/procurements/saved?page=${page}`, procurementSavedPageSchema)
}

export function loadProcurementSync(transport: AuthenticatedTransport) {
  return transport.request('/api/users/me/procurements/sync', procurementSyncSchema)
}

export type { ProcurementSavedPage, ProcurementSync }
