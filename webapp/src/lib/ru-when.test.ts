import { expect, test } from 'bun:test'

import { dialogDatesLabel, dialogDayLabel, ruRecordedAt, ruUploadDate } from './ru-when'

const now = new Date(2026, 9, 27, 12, 0, 0)

test('a dialog day is today, yesterday, or a calendar date', () => {
  expect(dialogDayLabel(new Date(2026, 9, 27, 9, 0), undefined, now)).toBe('Сегодня')
  expect(dialogDayLabel(new Date(2026, 9, 26, 18, 0), undefined, now)).toBe('Вчера')
  expect(dialogDayLabel(new Date(2026, 9, 20, 18, 0), undefined, now)).toBe('20 октября')
  expect(dialogDayLabel(new Date(2025, 11, 2, 8, 0), undefined, now)).toBe('2 декабря 2025')
  expect(dialogDayLabel(new Date(2026, 9, 27, 10, 0), new Date(2026, 9, 27, 9, 0), now)).toBeNull()
})

test('a recording date keeps the year and the clock', () => {
  expect(ruRecordedAt(new Date(2026, 9, 27, 9, 5))).toBe('27 октября 2026, 09:05')
  expect(ruUploadDate(new Date(2026, 9, 27, 9, 5))).toBe('27 октября 2026')
})

test('a dialog tooltip uses one day or the span of its messages', () => {
  const raw = JSON.stringify({
    messages: [
      { message: { createdAt: new Date(2026, 9, 20, 10).toISOString() } },
      { message: { createdAt: new Date(2026, 9, 22, 11).toISOString() } },
    ],
  })
  expect(dialogDatesLabel(raw, now)).toBe('20 октября — 22 октября')
  expect(dialogDatesLabel(JSON.stringify({ createdAt: new Date(2026, 9, 27, 9).toISOString() }), now)).toBe('27 октября')
  expect(dialogDatesLabel(null, now)).toBe('')
})
