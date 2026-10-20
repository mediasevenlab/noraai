import { z } from 'zod'

export const newsMediaSchema = z.object({
  kind: z.enum(['image', 'video']),
  url: z.string().min(1),
})

export const newsPostSchema = z.object({
  id: z.string().uuid(),
  channelHandle: z.string(),
  telegramPostId: z.number().int(),
  text: z.string(),
  postedAt: z.string().datetime(),
  href: z.string().url(),
  media: z.array(newsMediaSchema),
})

export const newsFeedSchema = z.object({
  posts: z.array(newsPostSchema),
})

export const newsImportFailureSchema = z.object({
  handle: z.string(),
  message: z.string(),
})

export const newsImportRequestSchema = z.object({
  channels: z.array(z.string().trim().min(1).max(200)).min(1).max(30),
  from: z.string().datetime(),
  to: z.string().datetime(),
})

export const newsDeleteResponseSchema = z.object({
  id: z.string().uuid(),
})

export const newsChannelDeleteResponseSchema = z.object({
  handle: z.string(),
  deleted: z.number().int(),
})

export const newsImportResponseSchema = newsFeedSchema.extend({
  imported: z.number().int(),
  skipped: z.number().int(),
  failed: z.array(newsImportFailureSchema),
})

export type NewsPost = z.infer<typeof newsPostSchema>
export type NewsFeed = z.infer<typeof newsFeedSchema>
export type NewsImportResult = z.infer<typeof newsImportResponseSchema>
