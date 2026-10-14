import { expect, test } from 'bun:test'

import { commitMealVersionExtras, imagesForDiaryMeal } from '../src/features/diary/MealCard'
import type { MealEntry } from '../src/features/diary/meals-catalog'
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

test('an open ration card reads the gallery saved on the source meal', () => {
  const meal = {
    id: 'open:11111111-1111-4111-8111-111111111111:2026-10-14',
    image: '/api/meals/11111111-1111-4111-8111-111111111111/image?sig=cover',
    activeVersionId: 'version-2',
    versions: [{ id: 'version-2' }],
  } as MealEntry
  const images = imagesForDiaryMeal(
    meal,
    {
      '11111111-1111-4111-8111-111111111111': {
        'version-2': ['data:image/jpeg;base64,CARROT'],
      },
    },
  )
  expect(images).toEqual([
    meal.image,
    'data:image/jpeg;base64,CARROT',
  ])
})
