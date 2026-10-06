import { expect, test } from 'bun:test'

import { mealCorrectionLimitReached } from '../src/features/diary/meal-corrections'

test('user and mentor corrections are counted apart from the original card', () => {
  const versions = [
    { id: 'original' },
    { authorRole: 'user' as const },
    { authorRole: 'user' as const },
    { authorRole: 'mentor' as const },
  ]
  expect(mealCorrectionLimitReached(versions, 'user')).toBe(true)
  expect(mealCorrectionLimitReached(versions, 'mentor')).toBe(false)
  expect(mealCorrectionLimitReached(undefined, 'user')).toBe(false)
})

test('refinements saved before authors were recorded count as the user', () => {
  expect(mealCorrectionLimitReached([{}, {}, {}], 'user')).toBe(true)
  expect(mealCorrectionLimitReached([{}, {}, {}], 'mentor')).toBe(false)
})
