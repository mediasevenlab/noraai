import { describe, expect, test } from 'bun:test'

import { hexToRgb } from './spooky-smoke-animation'

describe('hexToRgb', () => {
  test('parses a six-digit color', () => {
    expect(hexToRgb('#c45c6a')).toEqual([
      196 / 255,
      92 / 255,
      106 / 255,
    ])
  })

  test('accepts a value without a hash', () => {
    expect(hexToRgb('FF0000')).toEqual([1, 0, 0])
  })

  test('returns null for invalid input', () => {
    expect(hexToRgb('red')).toBeNull()
  })
})
