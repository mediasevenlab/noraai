import { documentCompareResponseSchema, type DocumentCompareResponse } from '@web-app-demo/contracts'

import type { AuthenticatedTransport } from '@/platform/api'

export function requestDocumentCompare(transport: AuthenticatedTransport, left: File, right: File) {
  const body = new FormData()
  body.set('left', left)
  body.set('right', right)
  return transport.request('/api/users/me/document-compare', documentCompareResponseSchema, {
    method: 'POST',
    body,
  })
}

export type { DocumentCompareResponse }
