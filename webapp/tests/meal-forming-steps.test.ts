import { expect, test } from 'bun:test'

import {
  isComposerAnalyzingPlaceholder,
  mealFormingSteps,
  mealRefiningSteps,
} from '../src/features/diary/meal-forming-steps'

test('forming steps mention several photos and then the calorie count', () => {
  const steps = mealFormingSteps(3)
  expect(steps[0]).toContain('3 фото')
  expect(steps.some((step) => step.includes('калории'))).toBe(true)
  expect(steps.at(-1)).toContain('карточку')
  expect(mealFormingSteps(1)[0]).toContain('фото')
  expect(mealFormingSteps(1)[0]).not.toContain('1 фото')
})

test('hides the generic analyzing line while detailed steps are shown', () => {
  expect(isComposerAnalyzingPlaceholder('⏳ Распознаю еду по фото и считаю КБЖУ…')).toBe(true)
  expect(isComposerAnalyzingPlaceholder('⏳ Обрабатываю 2 фото (пояснения не дождался)…')).toBe(true)
  expect(isComposerAnalyzingPlaceholder('📝 Пояснение к фото принято. Считаю КБЖУ…')).toBe(false)
})

test('refining a meal without a new photo skips looking at photos', () => {
  expect(mealRefiningSteps(false)[0]).toContain('Уточняю состав')
  expect(mealRefiningSteps(false)[0]).not.toContain('фото')
  expect(mealRefiningSteps(true)[0]).toContain('фото')
})
