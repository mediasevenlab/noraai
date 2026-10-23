import { expect, test } from 'bun:test'

import { readAdVerdict } from './ad-verdict'

test('an explicit ad verdict is kept', () => {
  expect(readAdVerdict('{"ad":true}')).toBe(true)
  expect(readAdVerdict('```json\n{"ad": true}\n```')).toBe(true)
})

test('news and a broken answer stay unmarked', () => {
  expect(readAdVerdict('{"ad":false}')).toBe(false)
  expect(readAdVerdict('это реклама')).toBe(false)
  expect(readAdVerdict('{')).toBe(false)
})
