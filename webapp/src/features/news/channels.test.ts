import { expect, test } from 'bun:test'

import { parseTelegramChannelLink } from './channels'

test('telegram channel links become a public handle', () => {
  expect(parseTelegramChannelLink(' https://t.me/meduza_news ')).toEqual({
    handle: 'meduza_news',
    href: 'https://t.me/meduza_news',
  })
  expect(parseTelegramChannelLink('t.me/s/meduza_news')).toEqual({
    handle: 'meduza_news',
    href: 'https://t.me/meduza_news',
  })
  expect(parseTelegramChannelLink('@meduza_news')).toEqual({
    handle: 'meduza_news',
    href: 'https://t.me/meduza_news',
  })
  expect(parseTelegramChannelLink('https://telegram.me/meduza_news?start=1')).toEqual({
    handle: 'meduza_news',
    href: 'https://t.me/meduza_news',
  })
})

test('rejects text that is not a public telegram channel', () => {
  expect(parseTelegramChannelLink('')).toBeNull()
  expect(parseTelegramChannelLink('https://example.com/news')).toBeNull()
  expect(parseTelegramChannelLink('https://t.me/+inviteSecret')).toBeNull()
  expect(parseTelegramChannelLink('@ab')).toBeNull()
})
