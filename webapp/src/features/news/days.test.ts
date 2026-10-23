import { expect, test } from 'bun:test'
import type { NewsPost } from '@web-app-demo/contracts'

import { groupNewsByDay, postsCountLabel } from './days'

function post(id: string, postedAt: string): NewsPost {
  return {
    id,
    channelHandle: 'naebnet',
    telegramPostId: Number(id),
    text: id,
    postedAt,
    href: 'https://t.me/naebnet/1',
    media: [],
    ad: false,
  }
}

test('posts on one calendar day stay together, and the next day is its own capsule', () => {
  const groups = groupNewsByDay([
    post('3', '2026-10-21T02:00:00'),
    post('2', '2026-10-20T20:00:00'),
    post('1', '2026-10-20T04:00:00'),
  ])
  expect(groups.map((group) => [group.dayKey, group.posts.map((item) => item.id)])).toEqual([
    ['2026-10-21', ['3']],
    ['2026-10-20', ['2', '1']],
  ])
  expect(groups[0]?.dayIso).toBe('2026-10-21T02:00:00')
})

test('the count capsule uses the same plural as a diary meal count', () => {
  expect(postsCountLabel(1)).toBe('1 пост')
  expect(postsCountLabel(2)).toBe('2 поста')
  expect(postsCountLabel(5)).toBe('5 постов')
  expect(postsCountLabel(11)).toBe('11 постов')
  expect(postsCountLabel(21)).toBe('21 пост')
})
