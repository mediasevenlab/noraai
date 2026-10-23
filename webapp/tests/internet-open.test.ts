import { expect, test } from 'bun:test'

import { internetEnabledFrom } from '../src/features/dialogs/internet-open'

test('internet stays off until the composer button is turned on', () => {
  expect(internetEnabledFrom(null)).toBe(false)
  expect(internetEnabledFrom('0')).toBe(false)
  expect(internetEnabledFrom('1')).toBe(true)
})
