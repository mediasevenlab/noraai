import type { NewsFeed, NewsImportResult, NewsPost } from '@web-app-demo/contracts'

import { NewsFailure } from '../domain/errors'
import type { createNewsMediaUrlBuilder } from '../domain/media-url'
import { keptNewsMedia, newsPostText, postersForEdit } from '../domain/post-edit'
import { newsChannelHandle, type ParsedTelegramMedia, type ParsedTelegramPost } from '../domain/telegram-page'
import {
  newsPostKey,
  type ArchiveEditFile,
  type ArchivePublication,
  type NewsArchive,
  type NewsAdClassifier,
  type NewsStore,
  type StoredNewsPost,
  type TelegramChannelSource,
} from './ports'

const DAY_MS = 24 * 60 * 60 * 1000
const MAX_RANGE_MS = 31 * DAY_MS

type MediaUrls = ReturnType<typeof createNewsMediaUrlBuilder>

export class NewsService {
  constructor(
    private readonly store: NewsStore,
    private readonly pages: TelegramChannelSource,
    private readonly urls: MediaUrls,
    private readonly archive: NewsArchive,
    private readonly now: () => Date = () => new Date(),
    private readonly ads: NewsAdClassifier = { async classify() { return false } },
  ) {}

  async list(): Promise<NewsFeed> {
    const posts = await this.store.list()
    return { posts: posts.map((post) => this.toDto(post)) }
  }

  async importChannels(
    userId: string,
    rawChannels: string[],
    range: { from: Date; to: Date },
  ): Promise<NewsImportResult> {
    const handles = [...new Set(rawChannels.flatMap((value) => {
      const handle = newsChannelHandle(value)
      return handle ? [handle] : []
    }))]
    if (handles.length === 0) {
      throw new NewsFailure('bad_request', 'Add a Telegram channel link first')
    }
    if (Number.isNaN(range.from.getTime()) || Number.isNaN(range.to.getTime()) || range.from > range.to) {
      throw new NewsFailure('bad_request', 'Import range is invalid')
    }
    if (range.to.getTime() - range.from.getTime() > MAX_RANGE_MS) {
      throw new NewsFailure('bad_request', 'Import range is too long')
    }

    const since = range.from
    const until = range.to
    const existing = await this.store.existing(handles)
    let imported = 0
    let skipped = 0
    let archived = 0
    const failed: NewsImportResult['failed'] = []
    const batch: { handle: string; posts: ParsedTelegramPost[] }[] = []

    for (const handle of handles) {
      let posts
      try {
        posts = await this.pages.loadRecent(handle, since)
      } catch (error) {
        console.error('news import failed', handle, safeError(error))
        failed.push({ handle, message: 'Could not open the channel' })
        continue
      }

      const queued = []
      for (const post of oldestFirst(posts)) {
        if (post.postedAt < since || post.postedAt > until) continue
        const prior = existing.get(newsPostKey(post.channelHandle, post.telegramPostId))
        if (prior?.archiveMessageIds.length) {
          skipped += 1
          continue
        }
        queued.push(post)
      }
      if (queued.length > 0) batch.push({ handle, posts: queued })
    }

    if (batch.length > 0) {
      const result = await this.archive.publish(batch)
      if (result.failed) {
        console.error('news archive publish failed', result.failed.handle, result.failed.message.replace(/https?:\/\/\S+/g, '[url]'))
        failed.push(result.failed)
      }
      for (const copy of result.published) {
        const post = batch
          .find((channel) => channel.handle === copy.handle)
          ?.posts.find((item) => item.telegramPostId === copy.telegramPostId)
        if (!post || copy.messageIds.length === 0) continue
        const saved = withArchiveFiles(post, copy)
        const ad = await this.markAd(saved.text)
        const key = newsPostKey(saved.channelHandle, saved.telegramPostId)
        const prior = existing.get(key)
        if (prior) {
          await this.store.attachArchive(prior.id, saved, copy, ad)
          prior.archiveChatId = copy.chatId
          prior.archiveMessageIds = copy.messageIds
          prior.text = saved.text
          prior.media = saved.media
          prior.ad = ad
        } else {
          try {
            const created = await this.store.create(userId, saved, copy, ad)
            existing.set(key, created)
            imported += 1
          } catch (error) {
            if (error instanceof NewsFailure && error.kind === 'conflict') {
              skipped += 1
              continue
            }
            throw error
          }
        }
        archived += 1
      }
    }

    const feed = await this.list()
    const allowed = new Set(handles)
    return {
      imported,
      skipped,
      archived,
      failed,
      posts: feed.posts.filter((post) => allowed.has(post.channelHandle)),
    }
  }

  async deleteChannel(rawHandle: string) {
    const handle = newsChannelHandle(rawHandle)
    if (!handle) throw new NewsFailure('bad_request', 'Channel handle is invalid')
    const posts = [...(await this.store.existing([handle])).values()]
    await this.removeArchiveCopies(posts)
    const deleted = await this.store.deleteChannel(handle)
    return { handle, deleted }
  }

  async editPost(
    postId: string,
    input: {
      title: string
      body: string
      keep: number[]
      uploads: { kind: ParsedTelegramMedia['kind']; bytes: Uint8Array; mime: string }[]
      order?: Array<'keep' | 'file'>
    },
  ): Promise<NewsPost> {
    const post = await this.store.find(postId)
    if (!post) throw new NewsFailure('not_found', 'News post not found')
    const text = newsPostText(input.title, input.body).slice(0, 8_000)
    const kept = keptNewsMedia(post.media, input.keep)
    const posters = postersForEdit(post.media, kept, input.uploads)
    if (!text && kept.length + input.uploads.length === 0) {
      throw new NewsFailure('bad_request', 'A post needs text or media')
    }
    const slots = input.order && input.order.length === kept.length + input.uploads.length
      ? input.order
      : [...kept.map(() => 'keep' as const), ...input.uploads.map(() => 'file' as const)]
    let keepCursor = 0
    let uploadCursor = 0
    const ordered = slots.map((slot) => {
      if (slot === 'keep') {
        const item = kept[keepCursor]
        keepCursor += 1
        if (!item) throw new NewsFailure('bad_request', 'News media is invalid')
        const file: ArchiveEditFile = item.fileId
          ? { kind: item.kind, fileId: item.fileId }
          : { kind: item.kind, url: item.url }
        return { item, file }
      }
      const upload = input.uploads[uploadCursor]
      uploadCursor += 1
      if (!upload) throw new NewsFailure('bad_request', 'News media is invalid')
      return {
        item: { kind: upload.kind, url: '' },
        file: { kind: upload.kind, bytes: upload.bytes, mime: upload.mime },
      }
    })
    const next = ordered.map((entry) => entry.file)
    const copy = await this.archive.revise({
      chatId: post.archiveChatId,
      messageIds: post.archiveMessageIds,
      text,
      previous: post.media
        .filter((item) => item.role !== 'poster')
        .map((item) => ({ kind: item.kind, fileId: item.fileId ?? '' })),
      next,
    })
    const media: ParsedTelegramMedia[] = [
      ...posters,
      ...ordered.map((entry, index) => ({
        ...entry.item,
        ...(copy.media[index]?.fileId ? { fileId: copy.media[index].fileId } : {}),
      })),
    ]
    const ad = await this.markAd(text)
    await this.store.replaceContent(post.id, {
      text,
      media,
      archiveChatId: copy.chatId,
      archiveMessageIds: copy.messageIds,
      ad,
    })
    const saved = await this.store.find(post.id)
    if (!saved) throw new NewsFailure('not_found', 'News post not found')
    return this.toDto(saved)
  }

  async deletePost(postId: string) {
    const post = await this.store.find(postId)
    if (!post) throw new NewsFailure('not_found', 'News post not found')
    await this.removeArchiveCopies([post])
    await this.store.delete(postId)
    return { id: postId }
  }

  async openMedia(postId: string, index: number, exp: string | undefined, sig: string | undefined, range?: string) {
    if (!this.urls.verify(postId, index, exp, sig)) {
      throw new NewsFailure('unauthorized', 'Media link expired')
    }
    const post = await this.store.find(postId)
    const item = post?.media[index]
    if (!post || !item) throw new NewsFailure('not_found', 'News media not found')
    if (item.fileId) {
      try {
        return await this.archive.openFile(item.fileId, item.kind, range)
      } catch (error) {
        if (!isStaleMedia(error)) throw error
      }
    }
    try {
      return await this.pages.openMedia(item.url, range)
    } catch (error) {
      if (!isStaleMedia(error)) throw error
      const fresh = await this.pages.loadPost(post.channelHandle, post.telegramPostId)
      const replacement = fresh?.media[index]
      if (!fresh || !replacement || sameMedia(post.media, fresh.media)) throw error
      const merged = {
        ...fresh,
        media: fresh.media.map((media, mediaIndex) => ({
          ...media,
          ...(post.media[mediaIndex]?.fileId ? { fileId: post.media[mediaIndex]?.fileId } : {}),
        })),
      }
      await this.store.update(post.id, merged)
      return this.pages.openMedia(replacement.url, range)
    }
  }

  private async removeArchiveCopies(posts: StoredNewsPost[]) {
    const groups = new Map<string, number[]>()
    for (const post of posts) {
      if (!post.archiveChatId || post.archiveMessageIds.length === 0) continue
      const ids = groups.get(post.archiveChatId) ?? []
      ids.push(...post.archiveMessageIds)
      groups.set(post.archiveChatId, ids)
    }
    for (const [chatId, messageIds] of groups) {
      await this.archive.remove(chatId, messageIds)
    }
  }

  private toDto(post: StoredNewsPost): NewsPost {
    return {
      id: post.id,
      channelHandle: post.channelHandle,
      telegramPostId: post.telegramPostId,
      text: post.text,
      postedAt: post.postedAt.toISOString(),
      href: `https://t.me/${post.channelHandle}/${post.telegramPostId}`,
      media: post.media.map((item, index) => ({
        kind: item.kind,
        url: this.urls.build(post.id, index),
        ...(item.role === 'poster' ? { role: 'poster' as const } : {}),
      })),
      ad: post.ad,
    }
  }

  private async markAd(text: string) {
    const trimmed = text.trim()
    if (!trimmed) return false
    try {
      return await this.ads.classify(trimmed)
    } catch (error) {
      console.error('news ad check failed', safeError(error))
      return false
    }
  }
}

function oldestFirst(posts: ParsedTelegramPost[]) {
  return [...posts].sort((left, right) => left.postedAt.getTime() - right.postedAt.getTime() || left.telegramPostId - right.telegramPostId)
}

function withArchiveFiles(post: ParsedTelegramPost, copy: ArchivePublication): ParsedTelegramPost {
  let cursor = 0
  return {
    ...post,
    media: post.media.map((item) => {
      if (item.role === 'poster') return item
      const file = copy.media[cursor]
      cursor += 1
      return file?.fileId ? { ...item, fileId: file.fileId } : item
    }),
  }
}

function isStaleMedia(error: unknown) {
  return error instanceof NewsFailure && (error.kind === 'not_found' || error.kind === 'upstream')
}

function sameMedia(left: ParsedTelegramMedia[], right: ParsedTelegramMedia[]) {
  return JSON.stringify(left) === JSON.stringify(right)
}

function safeError(error: unknown) {
  const message = error instanceof Error ? error.message : 'error'
  return message.replace(/https?:\/\/\S+/g, '[url]')
}
