import { describe, expect, test } from 'bun:test'
import sharp from 'sharp'

import { encodeMealImage } from './sharp-meal-image'

async function jpegFixture(width: number, height: number) {
  return sharp({
    create: { width, height, channels: 3, background: { r: 48, g: 96, b: 140 } },
  })
    .jpeg({ quality: 90 })
    .toBuffer()
}

describe('sharp meal image', () => {
  test('encodes a card thumbnail within 480px as webp', async () => {
    const source = await jpegFixture(1200, 900)
    const encoded = await encodeMealImage(source, 'card')
    const info = await sharp(encoded.bytes).metadata()
    expect(encoded.mime).toBe('image/webp')
    expect(info.format).toBe('webp')
    expect(Math.max(info.width ?? 0, info.height ?? 0)).toBeLessThanOrEqual(480)
    expect(encoded.bytes.length).toBeLessThan(source.length)
  })

  test('keeps a full variant inside 1280px without upscaling small photos', async () => {
    const source = await jpegFixture(800, 600)
    const encoded = await encodeMealImage(source, 'full')
    const info = await sharp(encoded.bytes).metadata()
    expect(info.width).toBe(800)
    expect(info.height).toBe(600)
  })
})
