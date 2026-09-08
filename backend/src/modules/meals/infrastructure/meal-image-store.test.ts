import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'

import { describe, expect, test } from 'bun:test'
import sharp from 'sharp'

import { mealImageCardKey } from '../domain/meal-image-variants'
import { createLocalMealImageStore } from './meal-image-store'
import { sharpMealImageProcessor } from './sharp-meal-image'

const jpegBase64 = Buffer.from([0xff, 0xd8, 0xff, 0x00]).toString('base64')

async function jpegBase64Fixture(width = 900, height = 600) {
  const bytes = await sharp({
    create: { width, height, channels: 3, background: { r: 70, g: 110, b: 90 } },
  })
    .jpeg({ quality: 88 })
    .toBuffer()
  return bytes.toString('base64')
}

describe('local meal image store', () => {
  test('saves extra photos under a different key than the cover', async () => {
    const uploadDir = await mkdtemp(path.join(tmpdir(), 'meals-upload-'))
    const store = createLocalMealImageStore(uploadDir)
    const input = {
      userId: 'user-1',
      mealId: 'meal-1',
      imageBase64: jpegBase64,
      imageMime: 'image/jpeg' as const,
    }

    try {
      const cover = await store.saveImage(input)
      const extra = await store.saveImage({ ...input, variant: 'extra' })
      expect(extra.imageKey).not.toBe(cover.imageKey)
      expect(extra.imageKey).toContain('meal-1-extra-')

      const coverBytes = await store.readImage(cover.imageKey)
      const extraBytes = await store.readImage(extra.imageKey)
      expect(coverBytes?.equals(extraBytes ?? Buffer.alloc(0))).toBe(true)
    } finally {
      await rm(uploadDir, { recursive: true, force: true })
    }
  })

  test('writes a webp original and a card thumbnail, then lazy-fills missing cards', async () => {
    const uploadDir = await mkdtemp(path.join(tmpdir(), 'meals-upload-'))
    const store = createLocalMealImageStore(uploadDir, sharpMealImageProcessor)
    const imageBase64 = await jpegBase64Fixture()

    try {
      const saved = await store.saveImage({
        userId: 'user-1',
        mealId: 'meal-2',
        imageBase64,
        imageMime: 'image/jpeg',
      })
      expect(saved.imageMime).toBe('image/webp')
      expect(saved.imageKey.endsWith('.webp')).toBe(true)

      const full = await store.readImage(saved.imageKey, 'full')
      const card = await store.readImage(saved.imageKey, 'card')
      expect(full).toBeTruthy()
      expect(card).toBeTruthy()
      expect((card ?? Buffer.alloc(0)).length).toBeLessThan((full ?? Buffer.alloc(1)).length)

      const cardPath = path.join(uploadDir, ...mealImageCardKey(saved.imageKey).split('/'))
      await rm(cardPath, { force: true })
      const regenerated = await store.readImage(saved.imageKey, 'card')
      expect(regenerated).toBeTruthy()
      expect((await sharp(regenerated!).metadata()).format).toBe('webp')
    } finally {
      await rm(uploadDir, { recursive: true, force: true })
    }
  })
})
