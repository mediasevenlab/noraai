import { expect, test } from 'bun:test'

import { createNewsArchive, readPublishResult } from './archive-channel'
import type { ParsedTelegramPost } from '../domain/telegram-page'

const post: ParsedTelegramPost = {
  channelHandle: 'it_teech',
  telegramPostId: 4,
  text: 'Hello',
  postedAt: new Date('2026-10-20T00:00:00.000Z'),
  media: [{ kind: 'image', url: 'https://cdn4.telesco.pe/file/a.jpg' }],
}

test('publish keeps channel order and leaves the bot token in n8n', async () => {
  const bodies: unknown[] = []
  const archive = createNewsArchive(
    { N8N_NEWS_ARCHIVE_WEBHOOK_URL: 'http://n8n.local/webhook/news-archive-sync', TELEGRAM_NEWS_BOT_TOKEN: 'secret-token' },
    async (_url, init) => {
      bodies.push(JSON.parse(String(init?.body)))
      return new Response(JSON.stringify({
        ok: true,
        published: [{
          handle: 'it_teech',
          telegramPostId: 4,
          chatId: '-1001',
          messageIds: [15],
          media: [{ kind: 'image', fileId: 'file-15' }],
        }],
        failed: null,
      }))
    },
  )
  const result = await archive.publish([{ handle: 'it_teech', posts: [post] }])
  expect(JSON.stringify(bodies)).not.toContain('secret-token')
  expect(result.published[0]?.messageIds).toEqual([15])
  expect(result.failed).toBeNull()
})

test('an unfinished archive copy is removed before the error returns', async () => {
  const bodies: unknown[] = []
  const archive = createNewsArchive(
    { N8N_NEWS_ARCHIVE_WEBHOOK_URL: 'http://n8n.local/webhook/news-archive-sync', TELEGRAM_NEWS_BOT_TOKEN: 'secret-token' },
    async (_url, init) => {
      const body = JSON.parse(String(init?.body))
      bodies.push(body)
      if (bodies.length === 1) {
        return new Response(JSON.stringify({
          ok: false,
          published: [],
          failed: { handle: 'it_teech', message: 'download failed' },
          rollback: { chatId: '-1001', messageIds: [9] },
        }))
      }
      return new Response(JSON.stringify({ ok: true, deleted: 1 }))
    },
  )
  await expect(archive.publish([{ handle: 'it_teech', posts: [post] }])).rejects.toThrow('Could not publish to the archive channel')
  expect(bodies[1]).toEqual({ action: 'delete', chatId: '-1001', messageIds: [9] })
})

test('a failed archive publish without copies is an error', () => {
  expect(() => readPublishResult({
    ok: false,
    published: [],
    failed: { handle: 'naebnet', message: 'bot123:ABC failed' },
  })).toThrow('Could not publish to the archive channel')
})
