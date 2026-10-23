import { expect, test } from 'bun:test'

import { reasoningEnabledFrom } from '../src/features/dialogs/reasoning-open'
import { reasoningStatusLabel } from '../src/features/dialogs/reasoning-time'

test('reasoning stays off until the composer button is turned on', () => {
  expect(reasoningEnabledFrom(null)).toBe(false)
  expect(reasoningEnabledFrom('0')).toBe(false)
  expect(reasoningEnabledFrom('1')).toBe(true)
})

test('reasoning time reads like a finished or running task', () => {
  expect(reasoningStatusLabel(400, true)).toBe('Думает…')
  expect(reasoningStatusLabel(21_000, true)).toBe('Думает · 21 с')
  expect(reasoningStatusLabel(400, false)).toBe('Думала меньше секунды')
  expect(reasoningStatusLabel(21_400, false)).toBe('Думала 21 с')
  expect(reasoningStatusLabel(81_000, false)).toBe('Думала 1 мин 21 с')
  expect(reasoningStatusLabel(120_000, false)).toBe('Думала 2 мин')
  expect(reasoningStatusLabel(14_000, false, true)).toBe('Думала 14 с · искала в интернете')
  expect(reasoningStatusLabel(3_000, false, false)).toBe('Думала 3 с')
  expect(reasoningStatusLabel(5_000, true, true)).toBe('Думает · 5 с · искала в интернете')
})
