import { b2bPageSchema, type B2bPage } from '@web-app-demo/contracts'

import type { AuthenticatedTransport } from '@/platform/api'

export function loadB2bProcedures(transport: AuthenticatedTransport) {
  return transport.request('/api/users/me/b2b/procedures', b2bPageSchema)
}

export type { B2bPage }
