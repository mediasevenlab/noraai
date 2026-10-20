import { expect, test } from 'bun:test'

import { NewsFailure } from '../domain/errors'
import { createNewsMediaUrlBuilder } from '../domain/media-url'
import type { ParsedTelegramPost } from '../domain/telegram-page'
import { NewsService } from './news-service'
import { newsPostKey, type NewsStore, type StoredNewsPost, type TelegramChannelSource } from './ports'

const NOW = new Date('2026-10-20T09:00:00.000Z')
const USER = '11111111-1111-4111-8111-111111111111'

function post(id: number, hoursAgo: number, text = `Post ${id}`): ParsedTelegramPost {
  return {
    channelHandle: 'bbcnews',
    telegramPostId: id,
    text,
    postedAt: new Date(NOW.getTime() - hoursAgo * 60 * 60 * 1000),
    media: [{ kind: 'video', url: `https://cdn4.telesco.pe/file/${id}.mp4` }],
  }
}

function memory() {
  const rows: StoredNewsPost[] = []
  const store: NewsStore = {
    async list(userId) {
      return rows.filter((row) => row.userId === userId).sort((a, b) => b.postedAt.getTime() - a.postedAt.getTime())
    },
    async existing(userId, handles) {
      const found = new Map<string, StoredNewsPost>()
      for (const row of rows) {
        if (row.userId === userId && handles.includes(row.channelHandle)) {
          found.set(newsPostKey(row.channelHandle, row.telegramPostId), row)
        }
      }
      return found
    },
    async create(userId, item) {
      if (rows.some((row) => row.userId === userId && row.channelHandle === item.channelHandle && row.telegramPostId === item.telegramPostId)) {
        throw new NewsFailure('conflict', 'duplicate')
      }
      const row: StoredNewsPost = { id: `id-${item.telegramPostId}`, userId, ...item }
      rows.push(row)
      return row
    },
    async update(id, item) {
      const row = rows.find((candidate) => candidate.id === id)
      if (!row) return
      row.text = item.text
      row.media = item.media
      row.postedAt = item.postedAt
    },
    async find(id) {
      return rows.find((row) => row.id === id) ?? null
    },
    async delete(userId, id) {
      const index = rows.findIndex((row) => row.userId === userId && row.id === id)
      if (index < 0) throw new NewsFailure('not_found', 'missing')
      rows.splice(index, 1)
    },
    async deleteChannel(userId, handle) {
      const before = rows.length
      for (let index = rows.length - 1; index >= 0; index -= 1) {
        const row = rows[index]
        if (row && row.userId === userId && row.channelHandle === handle) rows.splice(index, 1)
      }
      return before - rows.length
    },
  }
  return { rows, store }
}

test('import keeps the last day and does not create the same post twice', async () => {
  const pages = new Map<string, ParsedTelegramPost[]>([
    ['bbcnews', [post(1, 2), post(2, 30), post(3, 1)]],
  ])
  const source: TelegramChannelSource = {
    async loadRecent(handle, since) {
      return (pages.get(handle) ?? []).filter((item) => item.postedAt >= since)
    },
    async openMedia() {
      return new Response('clip', { status: 200, headers: { 'content-type': 'video/mp4' } })
    },
  }
  const { rows, store } = memory()
  const service = new NewsService(
    store,
    source,
    createNewsMediaUrlBuilder('secret-secret-secret-secret-secret'),
    () => NOW,
  )

  const day = { from: new Date(NOW.getTime() - 24 * 60 * 60 * 1000), to: NOW }
  const first = await service.importChannels(USER, ['https://t.me/s/BBCNews'], day)
  expect(first.imported).toBe(2)
  expect(first.posts.map((item) => item.telegramPostId)).toEqual([3, 1])
  expect(first.posts[0]?.media[0]?.url.startsWith('/api/news/posts/')).toBe(true)
  expect(JSON.stringify(first)).not.toContain('telesco.pe')

  pages.set('bbcnews', [post(1, 2, 'Edited'), post(3, 1)])
  const second = await service.importChannels(USER, ['@bbcnews'], day)
  expect(second.imported).toBe(0)
  expect(second.skipped).toBe(2)
  expect(rows).toHaveLength(2)
  expect(second.posts.find((item) => item.telegramPostId === 1)?.text).toBe('Edited')
})

test('a channel that cannot be opened is reported and does not wipe saved posts', async () => {
  const { store } = memory()
  const service = new NewsService(
    store,
    {
      async loadRecent() {
        throw new NewsFailure('upstream', 'https://t.me/s/bbcnews failed')
      },
      async openMedia() {
        return new Response(null, { status: 404 })
      },
    },
    createNewsMediaUrlBuilder('secret-secret-secret-secret-secret'),
    () => NOW,
  )
  const result = await service.importChannels(USER, ['bbcnews'], {
    from: new Date(NOW.getTime() - 24 * 60 * 60 * 1000),
    to: NOW,
  })
  expect(result.imported).toBe(0)
  expect(result.failed).toEqual([{ handle: 'bbcnews', message: 'Could not open the channel' }])
})

test('import keeps only posts inside the chosen interval and delete removes one post', async () => {
  const source: TelegramChannelSource = {
    async loadRecent(handle, since) {
      return [post(1, 2), post(3, 1)].filter((item) => item.channelHandle === handle && item.postedAt >= since)
    },
    async openMedia() {
      return new Response(null, { status: 404 })
    },
  }
  const { rows, store } = memory()
  const service = new NewsService(
    store,
    source,
    createNewsMediaUrlBuilder('secret-secret-secret-secret-secret'),
    () => NOW,
  )
  const narrow = await service.importChannels(USER, ['bbcnews'], {
    from: new Date(NOW.getTime() - 90 * 60 * 1000),
    to: NOW,
  })
  expect(narrow.imported).toBe(1)
  expect(narrow.posts.map((item) => item.telegramPostId)).toEqual([3])
  rows.push({
    id: 'other',
    userId: USER,
    channelHandle: 'othernews',
    telegramPostId: 9,
    text: 'Kept aside',
    postedAt: NOW,
    media: [],
  })
  const again = await service.importChannels(USER, ['bbcnews'], {
    from: new Date(NOW.getTime() - 90 * 60 * 1000),
    to: NOW,
  })
  expect(again.posts.map((item) => item.channelHandle)).toEqual(['bbcnews'])
  expect(await service.deleteChannel(USER, '@OtherNews')).toEqual({ handle: 'othernews', deleted: 1 })
  expect(rows.map((row) => row.channelHandle)).toEqual(['bbcnews'])
  await service.deletePost(USER, 'id-3')
  expect(rows).toHaveLength(0)
  expect((await service.list(USER)).posts).toHaveLength(0)
})
