import { describe, expect, test } from 'bun:test'

import { validateMealImage } from './meal-image'

describe('meal image validation', () => {
  test('accepts matching JPEG content and MIME type', () => {
    const base64 = Buffer.from([0xff, 0xd8, 0xff, 0x00]).toString('base64')
    expect(validateMealImage({ base64, declaredMime: 'image/jpeg' }).mime).toBe('image/jpeg')
  })

  test('rejects spoofed MIME types and unsupported content', () => {
    const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0x00]).toString('base64')
    expect(() => validateMealImage({ base64: jpeg, declaredMime: 'image/png' })).toThrow()
    expect(() => validateMealImage({ base64: Buffer.from('not-an-image').toString('base64') })).toThrow()
  })

  test('rejects oversized decoded media', () => {
    const bytes = Buffer.alloc(32, 0)
    bytes.set([0xff, 0xd8, 0xff])
    expect(() => validateMealImage({
      base64: bytes.toString('base64'),
      maxBytes: 16,
    })).toThrow()
  })
})
