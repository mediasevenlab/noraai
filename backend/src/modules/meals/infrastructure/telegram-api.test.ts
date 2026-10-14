import { describe, expect, test } from 'bun:test'

import { telegramApiHeaders, telegramBotMethodUrl, telegramFileUrl } from './telegram-api'

describe('telegram api route', () => {
  test('calls Telegram directly when no proxy is configured', () => {
    expect(telegramBotMethodUrl({}, '123:abc', 'getMe')).toBe(
      'https://api.telegram.org/bot123:abc/getMe',
    )
    expect(telegramFileUrl({}, '123:abc', 'photos/a.jpg')).toBe(
      'https://api.telegram.org/file/bot123:abc/photos/a.jpg',
    )
    expect(telegramApiHeaders({})).toEqual({ 'Content-Type': 'application/json' })
  })

  test('sends bot calls through the foreign proxy with the same token as Gemini', () => {
    const env = {
      TELEGRAM_API_BASE: 'https://proxy.example:8788/telegram/',
      GEMINI_PROXY_TOKEN: 'proxy-secret',
    }
    expect(telegramBotMethodUrl(env, '123:abc', 'getUpdates')).toBe(
      'https://proxy.example:8788/telegram/bot123:abc/getUpdates',
    )
    expect(telegramFileUrl(env, '123:abc', 'photos/a.jpg')).toBe(
      'https://proxy.example:8788/telegram/file/bot123:abc/photos/a.jpg',
    )
    expect(telegramApiHeaders(env)).toEqual({
      'Content-Type': 'application/json',
      Authorization: 'Bearer proxy-secret',
      'X-Gemini-Proxy-Token': 'proxy-secret',
    })
  })
})
