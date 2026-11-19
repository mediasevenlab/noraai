import { expect, test } from 'bun:test'

import { tendersEnabledFrom } from '../src/features/dialogs/tenders-open'

test('the tender button stays off until it is turned on', () => {
  expect(tendersEnabledFrom(null)).toBe(false)
  expect(tendersEnabledFrom('0')).toBe(false)
  expect(tendersEnabledFrom('1')).toBe(true)
})
