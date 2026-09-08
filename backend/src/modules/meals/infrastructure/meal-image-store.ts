import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises'
import { randomUUID } from 'node:crypto'
import path from 'node:path'

import type { MealImageStore } from '../application/ports'
import { createKeyedMealImageStore, type MealImageFiles } from './meal-image-keyed-store'
import type { MealImageProcessor } from './sharp-meal-image'

function localMealImageFiles(uploadDir: string): MealImageFiles {
  const absolute = (imageKey: string) => path.join(uploadDir, ...imageKey.split('/'))
  return {
    async put(key, bytes) {
      const absolutePath = absolute(key)
      await mkdir(path.dirname(absolutePath), { recursive: true })
      await writeFile(absolutePath, bytes)
    },
    async get(key) {
      try {
        return await readFile(absolute(key))
      } catch {
        return null
      }
    },
    async remove(key) {
      try {
        await unlink(absolute(key))
      } catch {
        // Missing file is fine after meal deletion.
      }
    },
  }
}

export function createLocalMealImageStore(
  uploadDir: string,
  processor?: MealImageProcessor,
): MealImageStore {
  return createKeyedMealImageStore({
    processor,
    files: localMealImageFiles(uploadDir),
    keyFor(input, extension) {
      const filename =
        input.variant === 'extra'
          ? `${input.mealId}-extra-${randomUUID()}.${extension}`
          : `${input.mealId}.${extension}`
      return path.posix.join(input.userId, filename)
    },
  })
}
