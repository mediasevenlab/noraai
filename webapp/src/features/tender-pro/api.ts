import { tenderProPageSchema, type TenderProPage } from '@web-app-demo/contracts'

import type { AuthenticatedTransport } from '@/platform/api'

export function loadTenderProProcedures(transport: AuthenticatedTransport) {
  return transport.request('/api/users/me/tender-pro/procedures', tenderProPageSchema)
}

export type { TenderProPage }
