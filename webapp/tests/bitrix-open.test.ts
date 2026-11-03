import { expect, test } from 'bun:test'

import { bitrixEnabledFrom } from '../src/features/dialogs/bitrix-open'

test('bitrix stays off until the composer button is turned on', () => {
  expect(bitrixEnabledFrom(null)).toBe(false)
  expect(bitrixEnabledFrom('0')).toBe(false)
  expect(bitrixEnabledFrom('1')).toBe(true)
})
