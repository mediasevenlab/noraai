import { procurementOpenListSchema, procurementSyncSchema, type ProcurementOpenList, type ProcurementSync } from '@web-app-demo/contracts'

import type { AuthenticatedTransport } from '@/platform/api'

export function loadOpenProcurements(transport: AuthenticatedTransport) {
  return transport.request('/api/users/me/procurements/open', procurementOpenListSchema)
}

export function loadProcurementSync(transport: AuthenticatedTransport) {
  return transport.request('/api/users/me/procurements/sync', procurementSyncSchema)
}

export type { ProcurementOpenList, ProcurementSync }
