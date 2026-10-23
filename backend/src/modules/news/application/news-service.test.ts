import { expect, test } from 'bun:test'

import { NewsFailure } from '../domain/errors'
import { createNewsMediaUrlBuilder } from '../domain/media-url'
import type { ParsedTelegramPost } from '../domain/telegram-page'
import { NewsService } from './news-service'
import { newsPostKey, type ArchivePublication, type NewsArchive, type NewsStore, type StoredNewsPost, type TelegramChannelSource } from './ports'

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

function saved(item: ParsedTelegramPost, id = `id-${item.telegramPostId}`): StoredNewsPost {
  return {
    id,
    userId: USER,
    ...item,
    archiveChatId: null,
    archiveMessageIds: [],
    ad: false,
  }
}

function connectedArchive() {
  const published: string[] = []
  const removed: string[] = []
  let nextId = 100
  const archive: NewsArchive = {
    async publish(channels) {
      const copies: ArchivePublication[] = []
      for (const channel of channels) {
        for (const item of channel.posts) {
          published.push(`${channel.handle}/${item.telegramPostId}`)
          const messageId = nextId
          nextId += 1
          copies.push({
            handle: channel.handle,
            telegramPostId: item.telegramPostId,
            chatId: '-100',
            messageIds: [messageId],
            media: item.media.map((media) => ({ kind: media.kind, fileId: `file-${messageId}` })),
          })
        }
      }
      return { published: copies, failed: null }
    },
    async remove(chatId, messageIds) {
      removed.push(`${chatId}:${messageIds.join(',')}`)
    },
    async revise(edit) {
      const messageId = edit.messageIds[0] ?? nextId
      nextId += 1
      return {
        chatId: edit.chatId || '-100',
        messageIds: edit.messageIds.length > 0 ? edit.messageIds : [messageId],
        media: edit.next.map((file, index) => ({
          kind: file.kind,
          fileId: 'fileId' in file && file.fileId ? file.fileId : `file-${messageId}-${index}`,
        })),
      }
    },
    async openFile(fileId) {
      return new Response(fileId, { status: 200, headers: { 'content-type': 'image/jpeg' } })
    },
  }
  return { archive, published, removed }
}

function memory() {
  const rows: StoredNewsPost[] = []
  const store: NewsStore = {
    async list() {
      return [...rows].sort((a, b) => b.postedAt.getTime() - a.postedAt.getTime())
    },
    async existing(handles) {
      const found = new Map<string, StoredNewsPost>()
      for (const row of rows) {
        if (handles.includes(row.channelHandle)) {
          found.set(newsPostKey(row.channelHandle, row.telegramPostId), row)
        }
      }
      return found
    },
    async create(userId, item, copy, ad) {
      if (rows.some((row) => row.channelHandle === item.channelHandle && row.telegramPostId === item.telegramPostId)) {
        throw new NewsFailure('conflict', 'duplicate')
      }
      const row: StoredNewsPost = {
        id: `id-${item.telegramPostId}`,
        userId,
        ...item,
        archiveChatId: copy.chatId,
        archiveMessageIds: copy.messageIds,
        ad,
      }
      rows.push(row)
      return row
    },
    async attachArchive(id, item, copy, ad) {
      const row = rows.find((candidate) => candidate.id === id)
      if (!row) return
      row.text = item.text
      row.media = item.media
      row.postedAt = item.postedAt
      row.archiveChatId = copy.chatId
      row.archiveMessageIds = copy.messageIds
      row.ad = ad
    },
    async update(id, item) {
      const row = rows.find((candidate) => candidate.id === id)
      if (!row) return
      row.text = item.text
      row.media = item.media
      row.postedAt = item.postedAt
    },
    async replaceContent(id, content) {
      const row = rows.find((candidate) => candidate.id === id)
      if (!row) return
      row.text = content.text
      row.media = content.media
      row.archiveChatId = content.archiveChatId
      row.archiveMessageIds = content.archiveMessageIds
      row.ad = content.ad
    },
    async find(id) {
      return rows.find((row) => row.id === id) ?? null
    },
    async delete(id) {
      const index = rows.findIndex((row) => row.id === id)
      if (index < 0) throw new NewsFailure('not_found', 'missing')
      rows.splice(index, 1)
    },
    async deleteChannel(handle) {
      const before = rows.length
      for (let index = rows.length - 1; index >= 0; index -= 1) {
        const row = rows[index]
        if (row && row.channelHandle === handle) rows.splice(index, 1)
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
    async loadPost() {
      return null
    },
    async openMedia() {
      return new Response('clip', { status: 200, headers: { 'content-type': 'video/mp4' } })
    },
  }
  const { rows, store } = memory()
  const { archive, published } = connectedArchive()
  const service = new NewsService(
    store,
    source,
    createNewsMediaUrlBuilder('secret-secret-secret-secret-secret'),
    archive,
    () => NOW,
  )

  const day = { from: new Date(NOW.getTime() - 24 * 60 * 60 * 1000), to: NOW }
  const first = await service.importChannels(USER, ['https://t.me/s/BBCNews'], day)
  expect(first.imported).toBe(2)
  expect(first.archived).toBe(2)
  expect(published).toEqual(['bbcnews/1', 'bbcnews/3'])
  expect(first.posts.map((item) => item.telegramPostId)).toEqual([3, 1])
  expect(first.posts[0]?.media[0]?.url.startsWith('/api/news/posts/')).toBe(true)
  expect(JSON.stringify(first)).not.toContain('telesco.pe')

  pages.set('bbcnews', [post(1, 2, 'Edited'), post(3, 1)])
  const second = await service.importChannels(USER, ['@bbcnews'], day)
  expect(second.imported).toBe(0)
  expect(second.archived).toBe(0)
  expect(second.skipped).toBe(2)
  expect(published).toHaveLength(2)
  expect(rows).toHaveLength(2)
  expect(second.posts.find((item) => item.telegramPostId === 1)?.text).toBe('Post 1')
})

test('a copy already in the newsroom is not published again for another account', async () => {
  const source: TelegramChannelSource = {
    async loadRecent() {
      return [post(1, 1)]
    },
    async loadPost() {
      return null
    },
    async openMedia() {
      return new Response('clip', { status: 200 })
    },
  }
  const { rows, store } = memory()
  const earlier = saved(post(1, 1), 'id-earlier')
  earlier.userId = '22222222-2222-4222-8222-222222222222'
  earlier.archiveChatId = '-100'
  earlier.archiveMessageIds = [9]
  rows.push(earlier)
  const { archive, published } = connectedArchive()
  const service = new NewsService(
    store,
    source,
    createNewsMediaUrlBuilder('secret-secret-secret-secret-secret'),
    archive,
    () => NOW,
  )
  const day = { from: new Date(NOW.getTime() - 24 * 60 * 60 * 1000), to: NOW }

  const result = await service.importChannels(USER, ['@bbcnews'], day)

  expect(result.imported).toBe(0)
  expect(result.skipped).toBe(1)
  expect(result.archived).toBe(0)
  expect(published).toEqual([])
  expect((await service.list()).posts.map((item) => item.id)).toEqual(['id-earlier'])
})

test('a channel that cannot be opened is reported and does not wipe saved posts', async () => {
  const { store } = memory()
  const service = new NewsService(
    store,
    {
      async loadRecent() {
        throw new NewsFailure('upstream', 'https://t.me/s/bbcnews failed')
      },
      async loadPost() {
        return null
      },
      async openMedia() {
        return new Response(null, { status: 404 })
      },
    },
    createNewsMediaUrlBuilder('secret-secret-secret-secret-secret'),
    connectedArchive().archive,
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
    async loadPost() {
      return null
    },
    async openMedia() {
      return new Response(null, { status: 404 })
    },
  }
  const { rows, store } = memory()
  const { archive, removed } = connectedArchive()
  const service = new NewsService(
    store,
    source,
    createNewsMediaUrlBuilder('secret-secret-secret-secret-secret'),
    archive,
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
    archiveChatId: '-100',
    archiveMessageIds: [77],
    ad: false,
  })
  const again = await service.importChannels(USER, ['bbcnews'], {
    from: new Date(NOW.getTime() - 90 * 60 * 1000),
    to: NOW,
  })
  expect(again.posts.map((item) => item.channelHandle)).toEqual(['bbcnews'])
  expect(await service.deleteChannel('@OtherNews')).toEqual({ handle: 'othernews', deleted: 1 })
  expect(removed).toEqual(['-100:77'])
  expect(rows.map((row) => row.channelHandle)).toEqual(['bbcnews'])
  const archiveId = rows.find((row) => row.id === 'id-3')?.archiveMessageIds[0]
  await service.deletePost('id-3')
  expect(removed).toEqual(['-100:77', `-100:${archiveId}`])
  expect(rows).toHaveLength(0)
  expect((await service.list()).posts).toHaveLength(0)
})

test('an expired telegram file link is replaced from the public post before the image opens', async () => {
  const stored = post(7, 1)
  const fresh = post(7, 1)
  fresh.media = [{ kind: 'video', url: 'https://cdn4.telesco.pe/file/fresh.mp4' }]
  const opened: string[] = []
  const { rows, store } = memory()
  rows.push(saved(stored))
  const service = new NewsService(
    store,
    {
      async loadRecent() {
        return []
      },
      async loadPost() {
        return fresh
      },
      async openMedia(url) {
        opened.push(url)
        if (url.endsWith('/7.mp4')) throw new NewsFailure('not_found', 'Telegram media is unavailable')
        return new Response('clip', { status: 200, headers: { 'content-type': 'video/mp4' } })
      },
    },
    createNewsMediaUrlBuilder('secret-secret-secret-secret-secret'),
    connectedArchive().archive,
    () => NOW,
  )
  const link = new URL(`http://local${(await service.list()).posts[0]?.media[0]?.url}`)
  const response = await service.openMedia('id-7', 0, link.searchParams.get('exp') ?? '', link.searchParams.get('sig') ?? '')
  expect(response.status).toBe(200)
  expect(opened).toEqual([
    'https://cdn4.telesco.pe/file/7.mp4',
    'https://cdn4.telesco.pe/file/fresh.mp4',
  ])
  expect(rows[0]?.media[0]?.url).toBe('https://cdn4.telesco.pe/file/fresh.mp4')
})

test('channels are archived in list order and a deleted post can be exported again', async () => {
  const source: TelegramChannelSource = {
    async loadRecent(handle) {
      const own = (id: number, hoursAgo: number) => ({ ...post(id, hoursAgo), channelHandle: handle })
      if (handle === 'second') return [own(2, 1), own(1, 4)]
      if (handle === 'first') return [own(8, 2)]
      return []
    },
    async loadPost() {
      return null
    },
    async openMedia() {
      return new Response(null, { status: 404 })
    },
  }
  const { rows, store } = memory()
  const { archive, published } = connectedArchive()
  const service = new NewsService(
    store,
    source,
    createNewsMediaUrlBuilder('secret-secret-secret-secret-secret'),
    archive,
    () => NOW,
  )
  const day = { from: new Date(NOW.getTime() - 24 * 60 * 60 * 1000), to: NOW }
  const first = await service.importChannels(USER, ['first', 'second'], day)
  expect(published).toEqual(['first/8', 'second/1', 'second/2'])
  expect(first.archived).toBe(3)
  await service.deletePost('id-8')
  const again = await service.importChannels(USER, ['first', 'second'], day)
  expect(again.imported).toBe(1)
  expect(again.skipped).toBe(2)
  expect(published).toEqual(['first/8', 'second/1', 'second/2', 'first/8'])
  expect(rows.filter((row) => row.telegramPostId === 8)).toHaveLength(1)
})

test('a post already copied to the archive is not published again', async () => {
  const { rows, store } = memory()
  const existing = saved(post(4, 1))
  existing.archiveChatId = '-100'
  existing.archiveMessageIds = [5]
  rows.push(existing)
  const { archive, published } = connectedArchive()
  const service = new NewsService(
    store,
    {
      async loadRecent() {
        return [post(4, 1)]
      },
      async loadPost() {
        return null
      },
      async openMedia() {
        return new Response(null, { status: 404 })
      },
    },
    createNewsMediaUrlBuilder('secret-secret-secret-secret-secret'),
    archive,
    () => NOW,
  )
  const result = await service.importChannels(USER, ['bbcnews'], {
    from: new Date(NOW.getTime() - 24 * 60 * 60 * 1000),
    to: NOW,
  })
  expect(result.skipped).toBe(1)
  expect(result.archived).toBe(0)
  expect(published).toEqual([])
})

test('a selling post is marked before it is saved and a model failure still saves the post', async () => {
  const { rows, store } = memory()
  const { archive } = connectedArchive()
  const seen: string[] = []
  const service = new NewsService(
    store,
    {
      async loadRecent() {
        return [post(8, 1, 'Скидка по промокоду SALE'), post(9, 2, 'Вышла новая игра')]
      },
      async loadPost() {
        return null
      },
      async openMedia() {
        return new Response(null, { status: 404 })
      },
    },
    createNewsMediaUrlBuilder('secret-secret-secret-secret-secret'),
    archive,
    () => NOW,
    {
      async classify(text) {
        seen.push(text)
        if (text.includes('игра')) throw new Error('model down')
        return text.includes('промокод')
      },
    },
  )
  const result = await service.importChannels(USER, ['bbcnews'], {
    from: new Date(NOW.getTime() - 24 * 60 * 60 * 1000),
    to: NOW,
  })
  expect(result.imported).toBe(2)
  expect(result.posts.map((item) => [item.telegramPostId, item.ad])).toEqual([
    [8, true],
    [9, false],
  ])
  expect(rows.find((row) => row.telegramPostId === 8)?.ad).toBe(true)
  expect(rows.find((row) => row.telegramPostId === 9)?.ad).toBe(false)
  expect(seen).toEqual(['Вышла новая игра', 'Скидка по промокоду SALE'])
})

test('archive deletion failure keeps the post in the app', async () => {
  const { rows, store } = memory()
  rows.push({ ...saved(post(3, 1)), archiveChatId: '-100', archiveMessageIds: [9] })
  const archive = connectedArchive().archive
  archive.remove = async () => {
    throw new NewsFailure('upstream', 'Could not delete the archive post')
  }
  const service = new NewsService(
    store,
    {
      async loadRecent() {
        return []
      },
      async loadPost() {
        return null
      },
      async openMedia() {
        return new Response(null, { status: 404 })
      },
    },
    createNewsMediaUrlBuilder('secret-secret-secret-secret-secret'),
    archive,
    () => NOW,
  )
  await expect(service.deletePost('id-3')).rejects.toThrow('Could not delete the archive post')
  expect(rows).toHaveLength(1)
})

const urls = () => createNewsMediaUrlBuilder('secret-secret-secret-secret-secret')

const idleSource = (): TelegramChannelSource => ({
  async loadRecent() {
    return []
  },
  async loadPost() {
    return null
  },
  async openMedia() {
    return new Response(null, { status: 404 })
  },
})

test('saving a new title updates the post and the archive copy', async () => {
  const { rows, store } = memory()
  rows.push({
    ...saved(post(4, 1, 'Старый заголовок\n\nТекст')),
    archiveChatId: '-100',
    archiveMessageIds: [4],
    media: [{ kind: 'video', url: 'https://cdn4.telesco.pe/file/4.mp4', fileId: 'clip-4' }],
  })
  const seen: string[] = []
  const { archive } = connectedArchive()
  archive.revise = async (edit) => {
    seen.push(edit.text)
    expect(edit.next).toEqual([{ kind: 'video', fileId: 'clip-4' }])
    return { chatId: '-100', messageIds: [4], media: [{ kind: 'video', fileId: 'clip-4' }] }
  }
  const service = new NewsService(store, idleSource(), urls(), archive, () => NOW)
  const updated = await service.editPost('id-4', { title: 'Новый', body: 'Текст', keep: [0], uploads: [] })
  expect(updated.text).toBe('Новый\n\nТекст')
  expect(rows[0]?.text).toBe('Новый\n\nТекст')
  expect(rows[0]?.archiveMessageIds).toEqual([4])
  expect(seen).toEqual(['Новый\n\nТекст'])
})

test('a failed archive edit leaves the saved post unchanged', async () => {
  const { rows, store } = memory()
  rows.push({
    ...saved(post(5, 1, 'Старый')),
    archiveChatId: '-100',
    archiveMessageIds: [5],
    media: [{ kind: 'image', url: 'https://cdn4.telesco.pe/file/5.jpg', fileId: 'photo-5' }],
  })
  const { archive } = connectedArchive()
  archive.revise = async () => {
    throw new NewsFailure('upstream', 'Telegram request failed')
  }
  const service = new NewsService(store, idleSource(), urls(), archive, () => NOW)
  await expect(service.editPost('id-5', { title: 'Новый', body: '', keep: [0], uploads: [] })).rejects.toThrow('Telegram request failed')
  expect(rows[0]?.text).toBe('Старый')
})

test('removing a photo replaces the archive copy and dropping the video drops its preview', async () => {
  const { rows, store } = memory()
  rows.push({
    ...saved(post(6, 1, 'Смешанный')),
    archiveChatId: '-100',
    archiveMessageIds: [6, 7],
    media: [
      { kind: 'image', url: 'https://cdn4.telesco.pe/file/poster.jpg', role: 'poster' },
      { kind: 'video', url: 'https://cdn4.telesco.pe/file/6.mp4', fileId: 'clip-6' },
      { kind: 'image', url: 'https://cdn4.telesco.pe/file/6.jpg', fileId: 'photo-6' },
    ],
  })
  const { archive } = connectedArchive()
  archive.revise = async (edit) => {
    expect(edit.previous.map((item) => item.fileId)).toEqual(['clip-6', 'photo-6'])
    expect(edit.next).toEqual([{ kind: 'image', fileId: 'photo-6' }])
    return { chatId: '-100', messageIds: [20], media: [{ kind: 'image', fileId: 'photo-6' }] }
  }
  const service = new NewsService(store, idleSource(), urls(), archive, () => NOW, {
    async classify(text) {
      return text.includes('купи')
    },
  })
  const updated = await service.editPost('id-6', { title: 'купи сейчас', body: '', keep: [2], uploads: [] })
  expect(updated.ad).toBe(true)
  expect(rows[0]?.archiveMessageIds).toEqual([20])
  expect(rows[0]?.media).toEqual([{ kind: 'image', url: 'https://cdn4.telesco.pe/file/6.jpg', fileId: 'photo-6' }])
})

test('a replaced file stays between the photos that were kept', async () => {
  const { rows, store } = memory()
  rows.push({
    ...saved(post(7, 1, 'Три фото')),
    archiveChatId: '-100',
    archiveMessageIds: [7],
    media: [
      { kind: 'image', url: 'https://cdn4.telesco.pe/file/a.jpg', fileId: 'a' },
      { kind: 'image', url: 'https://cdn4.telesco.pe/file/b.jpg', fileId: 'b' },
      { kind: 'image', url: 'https://cdn4.telesco.pe/file/c.jpg', fileId: 'c' },
    ],
  })
  const { archive } = connectedArchive()
  archive.revise = async (edit) => {
    expect(edit.next.map((item) => 'fileId' in item ? item.fileId : 'upload')).toEqual(['a', 'upload', 'c'])
    return {
      chatId: '-100',
      messageIds: [30],
      media: [
        { kind: 'image', fileId: 'a' },
        { kind: 'image', fileId: 'new' },
        { kind: 'image', fileId: 'c' },
      ],
    }
  }
  const service = new NewsService(store, idleSource(), urls(), archive, () => NOW)
  await service.editPost('id-7', {
    title: 'Три фото',
    body: '',
    keep: [0, 2],
    uploads: [{ kind: 'image', bytes: new Uint8Array([1]), mime: 'image/jpeg' }],
    order: ['keep', 'file', 'keep'],
  })
  expect(rows[0]?.media.map((item) => item.fileId)).toEqual(['a', 'new', 'c'])
})
