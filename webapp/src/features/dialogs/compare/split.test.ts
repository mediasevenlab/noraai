import { expect, test } from 'bun:test'

import { nudgeSplit, splitAt } from './split'

const row = { left: 100, width: 1000 }

test('the handle follows the pointer between the two documents', () => {
  expect(splitAt(600, row)).toEqual({ split: 0.5 })
  expect(splitAt(300, row)).toEqual({ split: 0.2 })
})

test('reaching about a tenth of either edge folds that document', () => {
  expect(splitAt(200, row)).toEqual({ collapse: 'left' })
  expect(splitAt(199, row)).toEqual({ collapse: 'left' })
  expect(splitAt(201, row)).toEqual({ split: 0.101 })
  expect(splitAt(1000, row)).toEqual({ collapse: 'right' })
  expect(splitAt(999, row)).toEqual({ split: 0.899 })
})

test('arrow keys step the split and fold at the same edge', () => {
  expect(nudgeSplit(0.5, -0.05)).toEqual({ split: 0.45 })
  expect(nudgeSplit(0.12, -0.05)).toEqual({ collapse: 'left' })
  expect(nudgeSplit(0.88, 0.05)).toEqual({ collapse: 'right' })
})

test('a row that has not been measured yet stays even', () => {
  expect(splitAt(10, { left: 0, width: 0 })).toEqual({ split: 0.5 })
})
