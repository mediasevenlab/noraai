import type { NewsFeed, NewsImportResult, NewsPost } from '@web-app-demo/contracts'

import { NewsFailure } from '../domain/errors'
import type { createNewsMediaUrlBuilder } from '../domain/media-url'
import { newsChannelHandle, type ParsedTelegramMedia } from '../domain/telegram-page'
import { newsPostKey, type NewsStore, type StoredNewsPost, type TelegramChannelSource } from './ports'

const DAY_MS = 24 * 60 * 60 * 1000
const MAX_RANGE_MS = 31 * DAY_MS

type MediaUrls = ReturnType<typeof createNewsMediaUrlBuilder>

export class NewsService {
  constructor(
    private readonly store: NewsStore,
    private readonly pages: TelegramChannelSource,
    private readonly urls: MediaUrls,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async list(userId: string): Promise<NewsFeed> {
    const posts = await this.store.list(userId)
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
    const existing = await this.store.existing(userId, handles)
    let imported = 0
    let skipped = 0
    const failed: NewsImportResult['failed'] = []

    for (const handle of handles) {
      let posts
      try {
        posts = await this.pages.loadRecent(handle, since)
      } catch (error) {
        console.error('news import failed', handle, safeError(error))
        failed.push({ handle, message: 'Could not open the channel' })
        continue
      }

      for (const post of posts) {
        if (post.postedAt < since || post.postedAt > until) continue
        const key = newsPostKey(post.channelHandle, post.telegramPostId)
        const prior = existing.get(key)
        if (prior) {
          skipped += 1
          if (prior.text !== post.text || !sameMedia(prior.media, post.media)) {
            await this.store.update(prior.id, post)
            prior.text = post.text
            prior.media = post.media
          }
          continue
        }
        try {
          const created = await this.store.create(userId, post)
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
    }

    const feed = await this.list(userId)
    const allowed = new Set(handles)
    return {
      imported,
      skipped,
      failed,
      posts: feed.posts.filter((post) => allowed.has(post.channelHandle)),
    }
  }

  async deleteChannel(userId: string, rawHandle: string) {
    const handle = newsChannelHandle(rawHandle)
    if (!handle) throw new NewsFailure('bad_request', 'Channel handle is invalid')
    const deleted = await this.store.deleteChannel(userId, handle)
    return { handle, deleted }
  }

  async deletePost(userId: string, postId: string) {
    await this.store.delete(userId, postId)
    return { id: postId }
  }

  async openMedia(postId: string, index: number, exp: string | undefined, sig: string | undefined, range?: string) {
    if (!this.urls.verify(postId, index, exp, sig)) {
      throw new NewsFailure('unauthorized', 'Media link expired')
    }
    const post = await this.store.find(postId)
    const item = post?.media[index]
    if (!post || !item) throw new NewsFailure('not_found', 'News media not found')
    return this.pages.openMedia(item.url, range)
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
      })),
    }
  }
}

function sameMedia(left: ParsedTelegramMedia[], right: ParsedTelegramMedia[]) {
  return JSON.stringify(left) === JSON.stringify(right)
}

function safeError(error: unknown) {
  const message = error instanceof Error ? error.message : 'error'
  return message.replace(/https?:\/\/\S+/g, '[url]')
}
