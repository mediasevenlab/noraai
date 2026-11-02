import { expect, test } from 'bun:test'
import sharp from 'sharp'

import { chatVisionTiles } from './chat-image-tiles'

test('a photo stays one frame that fits the vision window', async () => {
  const photo = await sharp({
    create: { width: 900, height: 700, channels: 3, background: { r: 20, g: 160, b: 30 } },
  })
    .jpeg()
    .toBuffer()
  const tiles = await chatVisionTiles(photo)
  expect(tiles).toHaveLength(1)
  const meta = await sharp(tiles[0]!).metadata()
  expect(Math.max(meta.width ?? 0, meta.height ?? 0)).toBeLessThanOrEqual(448)
})

test('a wide table stays one frame so the columns are not cut apart', async () => {
  const sheet = await sharp({
    create: { width: 1800, height: 420, channels: 3, background: { r: 250, g: 250, b: 250 } },
  })
    .png()
    .toBuffer()
  const tiles = await chatVisionTiles(sheet)
  expect(tiles).toHaveLength(1)
  const meta = await sharp(tiles[0]!).metadata()
  expect(Math.max(meta.width ?? 0, meta.height ?? 0)).toBeLessThanOrEqual(1600)
  expect(meta.height ?? 0).toBeGreaterThan(280)
})

test('a tall screenshot is cut into bands that keep its width', async () => {
  const page = await sharp({
    create: { width: 400, height: 3000, channels: 3, background: { r: 250, g: 250, b: 250 } },
  })
    .png()
    .toBuffer()
  const tiles = await chatVisionTiles(page)
  expect(tiles.length).toBeGreaterThan(1)
  for (const tile of tiles) {
    const meta = await sharp(tile).metadata()
    expect(meta.width).toBe(400)
    expect(meta.height ?? 0).toBeLessThanOrEqual(1280)
    expect(meta.height ?? 0).toBeGreaterThan(200)
  }
})
