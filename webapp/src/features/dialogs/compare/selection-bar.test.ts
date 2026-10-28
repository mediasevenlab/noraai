import { expect, test } from 'bun:test'

import { selectionBarPosition } from './selection-bar'

test('the ask bar sits above the first line of a selection', () => {
  const placed = selectionBarPosition({ top: 180, bottom: 210, left: 40, width: 200 }, 1000)
  expect(placed.above).toBe(true)
  expect(placed.top).toBe(172)
  expect(placed.left).toBe(140)
})

test('the ask bar drops below a selection that is already at the top', () => {
  const placed = selectionBarPosition({ top: 20, bottom: 48, left: 10, width: 80 }, 1000)
  expect(placed.above).toBe(false)
  expect(placed.top).toBe(56)
})
