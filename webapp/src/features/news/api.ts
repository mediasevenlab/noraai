import { z } from 'zod'
import {
  newsDeleteResponseSchema,
  newsFeedSchema,
  newsImportRequestSchema,
  newsImportResponseSchema,
  newsPostSchema,
} from '@web-app-demo/contracts'

import type { AuthenticatedTransport } from '@/platform/api'

const newsChannelDeleteResponseSchema = z.object({
  handle: z.string(),
  deleted: z.number().int(),
})

const newsArchiveImportSchema = newsImportResponseSchema.extend({
  archived: z.number().int().optional().default(0),
})

export function listNewsPosts(transport: AuthenticatedTransport) {
  return transport.request('/api/news/posts', newsFeedSchema)
}

export function importNewsPosts(
  transport: AuthenticatedTransport,
  channels: string[],
  range: { from: string; to: string },
) {
  return transport.request('/api/news/import', newsArchiveImportSchema, {
    method: 'POST',
    body: newsImportRequestSchema.parse({ channels, from: range.from, to: range.to }),
  })
}

export function updateNewsPost(transport: AuthenticatedTransport, postId: string, body: FormData) {
  return transport.request(`/api/news/posts/${postId}`, newsPostSchema, {
    method: 'PATCH',
    body,
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
