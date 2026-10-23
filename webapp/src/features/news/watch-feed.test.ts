import { expect, test } from 'bun:test'
import type { NewsPost } from '@web-app-demo/contracts'

import { waitForSavedPosts } from './watch-feed'

function post(id: string): NewsPost {
  return {
    id,
    channelHandle: 'naebnet',
    telegramPostId: 1,
    text: id,
    postedAt: '2026-10-21T02:00:00.000Z',
    href: 'https://t.me/naebnet/1',
    media: [],
    ad: false,
  }
}

test('the open page hears about posts once they are saved', async () => {
  const loads = [
    Promise.resolve([post('old')]),
    Promise.resolve([post('old'), post('new')]),
  ]
  const found = await waitForSavedPosts({
    previousIds: new Set(['old']),
    intervalMs: 0,
    timeoutMs: 5_000,
    signal: new AbortController().signal,
    load: () => loads.shift() ?? Promise.resolve([post('old'), post('new')]),
  })
  expect(found?.map((item) => item.id)).toEqual(['old', 'new'])
})

test('a dropped export stops waiting when the page closes', async () => {
  const watch = new AbortController()
  watch.abort()
  const found = await waitForSavedPosts({
    previousIds: new Set(),
    intervalMs: 0,
    timeoutMs: 5_000,
    signal: watch.signal,
    load: async () => [post('new')],
  })
  expect(found).toBeNull()
})

test('waiting gives up when nothing new is saved', async () => {
  const found = await waitForSavedPosts({
    previousIds: new Set(['old']),
    intervalMs: 0,
    timeoutMs: 0,
    signal: new AbortController().signal,
    load: async () => [post('old')],
  })
  expect(found).toBeNull()
})
