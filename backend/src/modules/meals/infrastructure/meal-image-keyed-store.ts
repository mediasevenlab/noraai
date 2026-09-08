import type { MealImageStore } from '../application/ports'
import { validateMealImage } from '../domain/meal-image'
import { mealImageCardKey, type MealImageSize } from '../domain/meal-image-variants'
import type { MealImageProcessor } from './sharp-meal-image'

export type MealImageKeyInput = {
  userId: string
  mealId: string
  variant?: 'cover' | 'extra'
}

export type MealImageFiles = {
  put(key: string, bytes: Buffer, mime: string): Promise<void>
  get(key: string): Promise<Buffer | null>
  remove(key: string): Promise<void>
}

export function extensionForMealImageMime(mime: string | undefined) {
  if (mime === 'image/png') return 'png'
  if (mime === 'image/webp') return 'webp'
  return 'jpg'
}

export function createKeyedMealImageStore(options: {
  keyFor(input: MealImageKeyInput, extension: string): string
  files: MealImageFiles
  processor?: MealImageProcessor
}): MealImageStore {
  const { files, processor } = options

  return {
    async saveImage(input) {
      const image = validateMealImage({
        base64: input.imageBase64,
        declaredMime: input.imageMime,
      })
      if (!processor) {
        const extension = extensionForMealImageMime(image.mime)
        const imageKey = options.keyFor(input, extension)
        await files.put(imageKey, image.bytes, image.mime)
        return { imageKey, imageMime: image.mime }
      }

      const full = await processor.encode(image.bytes, 'full')
      const card = await processor.encode(image.bytes, 'card')
      const imageKey = options.keyFor(input, 'webp')
      await files.put(imageKey, full.bytes, full.mime)
      await files.put(mealImageCardKey(imageKey), card.bytes, card.mime)
      return { imageKey, imageMime: full.mime }
    },

    async readImage(imageKey, size: MealImageSize = 'full') {
      if (size === 'card') {
        const cardKey = mealImageCardKey(imageKey)
        const existing = await files.get(cardKey)
        if (existing) return existing
        const original = await files.get(imageKey)
        if (!original || !processor) return original
        try {
          const card = await processor.encode(original, 'card')
          await files.put(cardKey, card.bytes, card.mime)
          return card.bytes
        } catch {
          return original
        }
      }
      return files.get(imageKey)
    },

    async deleteImage(imageKey) {
      const cardKey = mealImageCardKey(imageKey)
      await files.remove(imageKey)
      if (cardKey !== imageKey) await files.remove(cardKey)
    },
  }
}
