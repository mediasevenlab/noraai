import { expect, test } from 'bun:test'

import {
  isHollowMealAnalysis,
  mapGeminiCardToMealFields,
  mapGeminiCategory,
  mapGeminiMealSlot,
} from './mapping'

test('maps Gemini meal types and categories into diary enums', () => {
  expect(mapGeminiMealSlot('Завтрак')).toBe('Завтрак')
  expect(mapGeminiMealSlot('Набор')).toBe('Обед')
  expect(mapGeminiCategory('Рыба', 'Обед')).toBe('Рыба')
  expect(mapGeminiCategory('Баланс', 'Завтрак')).toBe('Завтрак')
  expect(mapGeminiCategory('Набор', 'Перекус')).toBe('Перекус')
})

test('maps Gemini card fields for persistence', () => {
  const mapped = mapGeminiCardToMealFields({
    title: 'Овсянка',
    excerpt: 'Овсянка, творог · Б 28',
    category: 'Баланс',
    mealType: 'Завтрак',
    nutrition: { kcal: 420.4, protein: 28.1, fat: 10, carbs: 55 },
    clientNoteStructured: 'Домашний завтрак',
    composition: ['Овсянка ~45 г', ''],
    assumptions: ['На воде'],
  })
  expect(mapped).toEqual({
    title: 'Овсянка',
    ingredients: 'Овсянка, творог',
    category: 'Завтрак',
    meal: 'Завтрак',
    kcal: 420,
    protein: 28,
    fat: 10,
    carbs: 55,
    portionItems: [{ label: 'Овсянка ~45 г', kcal: 0, protein: 0, fat: 0, carbs: 0 }],
    clientComment: 'Домашний завтрак',
    assumptions: ['На воде'],
    micronutrients: [],
  })
})

test('maps Gemini composition objects with per-item macros', () => {
  const mapped = mapGeminiCardToMealFields({
    title: 'Овсянка',
    excerpt: 'Овсянка',
    category: 'Завтрак',
    mealType: 'Завтрак',
    nutrition: { kcal: 420, protein: 28, fat: 10, carbs: 55 },
    composition: [
      { label: 'Овсянка ~45 г', kcal: 180.4, protein: 8.2, fat: 3, carbs: 30 },
      { name: 'Банан ~80 г', nutrition: { kcal: 90, protein: 1, fat: 0, carbs: 23 } },
    ],
  })
  expect(mapped.portionItems).toEqual([
    { label: 'Овсянка ~45 г', kcal: 180, protein: 8, fat: 3, carbs: 30 },
    { label: 'Банан ~80 г', kcal: 90, protein: 1, fat: 0, carbs: 23 },
  ])
})

test('treats a default empty card as a failed analysis, not a snack', () => {
  expect(
    isHollowMealAnalysis({
      title: 'Приём пищи',
      excerpt: '',
      nutrition: { kcal: 0, protein: 0, fat: 0, carbs: 0 },
      composition: [],
    }),
  ).toBe(true)
  expect(
    isHollowMealAnalysis({
      title: 'Овсянка',
      excerpt: 'Овсянка',
      nutrition: { kcal: 420, protein: 28, fat: 10, carbs: 55 },
    }),
  ).toBe(false)
  expect(
    isHollowMealAnalysis({
      title: 'Вода',
      excerpt: 'Вода',
      nutrition: { kcal: 0, protein: 0, fat: 0, carbs: 0 },
      composition: [{ label: 'Вода ~250 г', kcal: 0, protein: 0, fat: 0, carbs: 0 }],
    }),
  ).toBe(false)
})

test('maps Gemini micronutrients into the canonical diary list', () => {
  const mapped = mapGeminiCardToMealFields({
    title: 'Овсянка',
    excerpt: 'Овсянка',
    category: 'Завтрак',
    mealType: 'Завтрак',
    nutrition: { kcal: 420, protein: 28, fat: 10, carbs: 55 },
    micronutrients: [{ key: 'sodium', amount: 210 }, { key: 'vitaminC', amount: 4 }],
  })
  expect(mapped.micronutrients).toHaveLength(18)
  expect(mapped.micronutrients[0]).toEqual({
    key: 'sodium',
    label: 'Натрий',
    unit: 'мг',
    amount: 210,
  })
  expect(mapped.micronutrients.find((item) => item.key === 'vitaminC')?.amount).toBe(4)
})
