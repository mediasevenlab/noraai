import { expect, test } from 'bun:test'

import { createNewsMediaUrlBuilder, isAllowedTelegramMediaUrl } from './media-url'

test('only telegram https hosts can be streamed', () => {
  expect(isAllowedTelegramMediaUrl('https://cdn4.telesco.pe/file/clip.mp4')).toBe(true)
  expect(isAllowedTelegramMediaUrl('https://t.me/bbcnews/1')).toBe(true)
  expect(isAllowedTelegramMediaUrl('http://cdn4.telesco.pe/file/clip.mp4')).toBe(false)
  expect(isAllowedTelegramMediaUrl('https://example.com/clip.mp4')).toBe(false)
  expect(isAllowedTelegramMediaUrl('https://user:pass@cdn4.telesco.pe/file/a')).toBe(false)
})

test('media links stay valid inside one time bucket and then expire', () => {
  let now = Date.parse('2026-10-20T00:10:00Z')
  const urls = createNewsMediaUrlBuilder('secret-secret-secret-secret-secret', 60 * 60, () => now)
  const url = urls.build('11111111-1111-4111-8111-111111111111', 0)
  const parsed = new URL(url, 'http://local')
  expect(urls.verify(
    '11111111-1111-4111-8111-111111111111',
    0,
    parsed.searchParams.get('exp') ?? '',
    parsed.searchParams.get('sig') ?? '',
  )).toBe(true)
  now = Date.parse('2026-10-20T03:00:00Z')
  expect(urls.verify(
    '11111111-1111-4111-8111-111111111111',
    0,
    parsed.searchParams.get('exp') ?? '',
    parsed.searchParams.get('sig') ?? '',
  )).toBe(false)
})
