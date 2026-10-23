import type { DbClient } from '../../../db'
import { Prisma } from '../../../generated/prisma/client'
import { newsPostKey, type ArchivePublication, type NewsStore, type StoredNewsPost } from '../application/ports'
import { NewsFailure } from '../domain/errors'
import { isAllowedTelegramMediaUrl, type NewsMediaKind } from '../domain/media-url'
import type { ParsedTelegramMedia, ParsedTelegramPost } from '../domain/telegram-page'

export function createNewsStore(db: DbClient): NewsStore {
  return {
    async list() {
      const rows = await db.newsPost.findMany({
        orderBy: { postedAt: 'desc' },
        take: 200,
      })
      return rows.map(toRecord)
    },
    async existing(handles) {
      const rows = await db.newsPost.findMany({
        where: { channelHandle: { in: handles } },
      })
      return new Map(rows.map((row) => {
        const record = toRecord(row)
        return [newsPostKey(record.channelHandle, record.telegramPostId), record] as const
      }))
    },
    async create(userId, post, copy, ad) {
      try {
        const row = await db.newsPost.create({ data: dataFor(userId, post, copy, ad) })
        return toRecord(row)
      } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
          throw new NewsFailure('conflict', 'This post is already saved')
        }
        throw error
      }
    },
    async attachArchive(id, post, copy, ad) {
      await db.newsPost.update({
        where: { id },
        data: {
          text: post.text,
          postedAt: post.postedAt,
          media: mediaJson(post.media),
          archiveChatId: copy.chatId,
          archiveMessageIds: copy.messageIds,
          ad,
        },
      })
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
    async replaceContent(id, content) {
      await db.newsPost.update({
        where: { id },
        data: {
          text: content.text,
          media: mediaJson(content.media),
          archiveChatId: content.archiveChatId,
          archiveMessageIds: content.archiveMessageIds,
          ad: content.ad,
        },
      })
    },
    async find(id) {
      const row = await db.newsPost.findUnique({ where: { id } })
      return row ? toRecord(row) : null
    },
    async delete(id) {
      const result = await db.newsPost.deleteMany({ where: { id } })
      if (result.count === 0) throw new NewsFailure('not_found', 'News post not found')
    },
    async deleteChannel(handle) {
      const result = await db.newsPost.deleteMany({ where: { channelHandle: handle } })
      return result.count
    },
  }
}

function dataFor(userId: string, post: ParsedTelegramPost, copy: ArchivePublication, ad: boolean) {
  return {
    userId,
    channelHandle: post.channelHandle,
    telegramPostId: post.telegramPostId,
    text: post.text,
    postedAt: post.postedAt,
    media: mediaJson(post.media),
    archiveChatId: copy.chatId,
    archiveMessageIds: copy.messageIds,
    ad,
  }
}

function mediaJson(media: ParsedTelegramMedia[]): Prisma.InputJsonValue {
  return media.map((item) => ({
    kind: item.kind,
    url: item.url,
    ...(item.role ? { role: item.role } : {}),
    ...(item.fileId ? { fileId: item.fileId } : {}),
  }))
}

function toRecord(row: {
  id: string
  userId: string
  channelHandle: string
  telegramPostId: number
  text: string
  postedAt: Date
  media: Prisma.JsonValue
  archiveChatId: string | null
  archiveMessageIds: Prisma.JsonValue
  ad: boolean
}): StoredNewsPost {
  return {
    id: row.id,
    userId: row.userId,
    channelHandle: row.channelHandle,
    telegramPostId: row.telegramPostId,
    text: row.text,
    postedAt: row.postedAt,
    media: readMedia(row.media),
    archiveChatId: row.archiveChatId,
    archiveMessageIds: readMessageIds(row.archiveMessageIds),
    ad: row.ad,
  }
}

function readMessageIds(value: Prisma.JsonValue): number[] {
  if (!Array.isArray(value)) return []
  return value.filter((item): item is number => Number.isInteger(item))
}

function readMedia(value: Prisma.JsonValue): ParsedTelegramMedia[] {
  if (!Array.isArray(value)) return []
  return value.flatMap((item) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) return []
    const kind = item.kind
    const url = item.url
    if ((kind !== 'image' && kind !== 'video') || typeof url !== 'string') return []
    if (!isAllowedTelegramMediaUrl(url)) return []
    const fileId = 'fileId' in item && typeof item.fileId === 'string' && item.fileId ? item.fileId : undefined
    const role = 'role' in item && item.role === 'poster' ? 'poster' as const : undefined
    return [{ kind: kind as NewsMediaKind, url, ...(role ? { role } : {}), ...(fileId ? { fileId } : {}) }]
  })
}
