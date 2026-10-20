import type { DbClient } from '../../../db'
import { Prisma } from '../../../generated/prisma/client'
import { newsPostKey, type NewsStore, type StoredNewsPost } from '../application/ports'
import { NewsFailure } from '../domain/errors'
import { isAllowedTelegramMediaUrl, type NewsMediaKind } from '../domain/media-url'
import type { ParsedTelegramMedia, ParsedTelegramPost } from '../domain/telegram-page'

export function createNewsStore(db: DbClient): NewsStore {
  return {
    async list(userId) {
      const rows = await db.newsPost.findMany({
        where: { userId },
        orderBy: { postedAt: 'desc' },
        take: 200,
      })
      return rows.map(toRecord)
    },
    async existing(userId, handles) {
      const rows = await db.newsPost.findMany({
        where: { userId, channelHandle: { in: handles } },
      })
      return new Map(rows.map((row) => {
        const record = toRecord(row)
        return [newsPostKey(record.channelHandle, record.telegramPostId), record] as const
      }))
    },
    async create(userId, post) {
      try {
        const row = await db.newsPost.create({ data: dataFor(userId, post) })
        return toRecord(row)
      } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
          throw new NewsFailure('conflict', 'This post is already saved')
        }
        throw error
      }
    },
    async update(id, post) {
      await db.newsPost.update({
        where: { id },
        data: {
          text: post.text,
          postedAt: post.postedAt,
          media: mediaJson(post.media),
        },
      })
    },
    async find(id) {
      const row = await db.newsPost.findUnique({ where: { id } })
      return row ? toRecord(row) : null
    },
    async delete(userId, id) {
      const result = await db.newsPost.deleteMany({ where: { id, userId } })
      if (result.count === 0) throw new NewsFailure('not_found', 'News post not found')
    },
    async deleteChannel(userId, handle) {
      const result = await db.newsPost.deleteMany({ where: { userId, channelHandle: handle } })
      return result.count
    },
  }
}

function dataFor(userId: string, post: ParsedTelegramPost) {
  return {
    userId,
    channelHandle: post.channelHandle,
    telegramPostId: post.telegramPostId,
    text: post.text,
    postedAt: post.postedAt,
    media: mediaJson(post.media),
  }
}

function mediaJson(media: ParsedTelegramMedia[]): Prisma.InputJsonValue {
  return media.map((item) => ({ kind: item.kind, url: item.url }))
}

function toRecord(row: {
  id: string
  userId: string
  channelHandle: string
  telegramPostId: number
  text: string
  postedAt: Date
  media: Prisma.JsonValue
}): StoredNewsPost {
  return {
    id: row.id,
    userId: row.userId,
    channelHandle: row.channelHandle,
    telegramPostId: row.telegramPostId,
    text: row.text,
    postedAt: row.postedAt,
    media: readMedia(row.media),
  }
}

function readMedia(value: Prisma.JsonValue): ParsedTelegramMedia[] {
  if (!Array.isArray(value)) return []
  return value.flatMap((item) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) return []
    const kind = item.kind
    const url = item.url
    if ((kind !== 'image' && kind !== 'video') || typeof url !== 'string') return []
    if (!isAllowedTelegramMediaUrl(url)) return []
    return [{ kind: kind as NewsMediaKind, url }]
  })
}
