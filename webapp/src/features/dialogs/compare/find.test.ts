import { expect, test } from 'bun:test'

import { findHits, findLabel } from './find'

test('search counts each occurrence and labels the current one', () => {
  const hits = findHits(['В соответствии с заданием', 'соответ'], 'соответ')
  expect(hits).toEqual([
    { index: 0, start: 2 },
    { index: 1, start: 0 },
  ])
  expect(findLabel(0, hits.length)).toBe('1/2')
  expect(findLabel(1, 0)).toBe('0')
})
