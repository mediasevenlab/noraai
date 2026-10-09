import { expect, test } from 'bun:test'

import { commitMealVersionExtras } from '../src/features/diary/MealCard'
import { photoAttachKeepsCurrentMeal } from '../src/features/diary/photo-attach'

test('a new photo replaces the meal unless the note asks to add it', () => {
  expect(photoAttachKeepsCurrentMeal('добавь банан')).toBe(false)
  expect(photoAttachKeepsCurrentMeal('Добавь это к текущему приёму.')).toBe(true)
})

test('replacing a meal photo drops the previous gallery', () => {
  const next = commitMealVersionExtras(
    { meal: { 'version-1': ['old-extra.jpg'] } },
    'meal',
    'version-1',
    'version-2',
    null,
    1,
    [],
  )
  expect(next.meal?.['version-2']).toEqual([])
  expect(next.meal?.['index:1']).toEqual([])
  expect(next.meal?.['version-1']).toEqual(['old-extra.jpg'])
})
