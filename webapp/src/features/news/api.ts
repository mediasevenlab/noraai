import { z } from 'zod'
import {
  newsDeleteResponseSchema,
  newsFeedSchema,
  newsImportRequestSchema,
  newsImportResponseSchema,
} from '@web-app-demo/contracts'

import type { AuthenticatedTransport } from '@/platform/api'

const newsChannelDeleteResponseSchema = z.object({
  handle: z.string(),
  deleted: z.number().int(),
})

export function listNewsPosts(transport: AuthenticatedTransport) {
  return transport.request('/api/news/posts', newsFeedSchema)
}

export function importNewsPosts(
  transport: AuthenticatedTransport,
  channels: string[],
  range: { from: string; to: string },
) {
  return transport.request('/api/news/import', newsImportResponseSchema, {
    method: 'POST',
    body: newsImportRequestSchema.parse({ channels, from: range.from, to: range.to }),
  })
}

export function deleteNewsPost(transport: AuthenticatedTransport, postId: string) {
  return transport.request(`/api/news/posts/${postId}`, newsDeleteResponseSchema, {
    method: 'DELETE',
  })
}

export function deleteNewsChannel(transport: AuthenticatedTransport, handle: string) {
  return transport.request(
    `/api/news/channels/${encodeURIComponent(handle)}`,
    newsChannelDeleteResponseSchema,
    { method: 'DELETE' },
  )
}
