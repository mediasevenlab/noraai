import { expect, test } from 'bun:test'

import { channelPageRequest, mediaRequest, usesTelegramWebProxy } from './telegram-web'

const direct = {
  GEMINI_API_HOST: 'generativelanguage.googleapis.com',
  GEMINI_API_PORT: 443,
  GEMINI_PROXY_TOKEN: '',
}

const proxy = {
  GEMINI_API_HOST: '89.124.122.90',
  GEMINI_API_PORT: 8788,
  GEMINI_PROXY_TOKEN: 'proxy-token',
}

test('public pages and media stay on t.me until the foreign proxy is configured', () => {
  expect(usesTelegramWebProxy(direct)).toBe(false)
  const page = channelPageRequest(direct, 'bbcnews', 100)
  expect(page.url).toBe('https://t.me/s/bbcnews?before=100')
  expect(page.headers.Authorization).toBeUndefined()
  const media = mediaRequest(direct, 'https://cdn4.telesco.pe/file/clip.mp4', 'bytes=0-1')
  expect(media.url).toBe('https://cdn4.telesco.pe/file/clip.mp4')
  expect(media.headers.Range).toBe('bytes=0-1')
})

test('the foreign proxy receives channel html and allowlisted media, not an open url', () => {
  expect(usesTelegramWebProxy(proxy)).toBe(true)
  const page = channelPageRequest(proxy, 'bbcnews')
  expect(page.url).toBe('https://89.124.122.90:8788/tme/s/bbcnews')
  expect(page.headers.Authorization).toBe('Bearer proxy-token')
  const media = mediaRequest(proxy, 'https://cdn4.telesco.pe/file/clip.mp4')
  expect(media.url).toBe('https://89.124.122.90:8788/cdn')
  expect(media.headers['X-Upstream-Url']).toBe('https://cdn4.telesco.pe/file/clip.mp4')
  expect(() => mediaRequest(proxy, 'https://example.com/secret')).toThrow('Media host is not allowed')
})
