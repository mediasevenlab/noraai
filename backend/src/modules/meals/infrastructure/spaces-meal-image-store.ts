import { randomUUID } from 'node:crypto'

import { createStorageObjectKey, type StorageService } from '../../../storage/service'
import type { MealImageStore } from '../application/ports'
import { createKeyedMealImageStore } from './meal-image-keyed-store'
import type { MealImageProcessor } from './sharp-meal-image'

/** Durable private meal media for production object storage. */
export function createSpacesMealImageStore(
  storage: StorageService,
  processor?: MealImageProcessor,
): MealImageStore {
  return createKeyedMealImageStore({
    processor,
    files: {
      put: async (key, bytes, mime) => {
        await storage.putPrivateObject({ key, bytes, contentType: mime })
      },
      get: (key) => storage.readObject(key),
      remove: (key) => storage.deleteObject(key),
    },
    keyFor(input, extension) {
      return createStorageObjectKey({
        namespace: 'meal-images',
        ownerId: input.userId,
        id: input.variant === 'extra' ? randomUUID() : input.mealId,
        filename: input.variant === 'extra' ? `extra.${extension}` : `meal.${extension}`,
      })
    },
  })
}
