import { expect, test } from 'bun:test'

import {
  displayMealComment,
  distributePortionMacros,
  formatPortionItemMacros,
  mealCompositionLines,
  micronutrientsForMeal,
  partitionMealMicronutrients,
  portionItemsForMeal,
  type MealEntry,
} from './meals-catalog'

const meal = {
  id: 'meal-01',
  title: 'Обед',
  ingredients: 'Курица, брокколи',
  category: 'Птица',
  meal: 'Обед',
  at: '2026-08-11T08:55:00.000Z',
  kcal: 480,
  protein: 45,
  fat: 23,
  carbs: 28,
  image: '/diary/meals/meal-01.jpg',
} satisfies MealEntry

test('meal card composition splits comma soup into one line per ingredient', () => {
  expect(
    mealCompositionLines({
      ingredients: 'Кабачок 280 г, яйцо 2 шт., сыр 40 г, мука 20 г, соль, зелень.',
    }),
  ).toEqual(['Кабачок 280 г', 'яйцо 2 шт', 'сыр 40 г', 'мука 20 г', 'соль', 'зелень'])
  expect(
    mealCompositionLines({
      ingredients: 'ignored',
      portionItems: [
        { label: 'Моцарелла — 400 г', kcal: 0, protein: 0, fat: 0, carbs: 0 },
        { label: 'Сухари — 200 г', kcal: 0, protein: 0, fat: 0, carbs: 0 },
      ],
    }),
  ).toEqual(['Моцарелла — 400 г', 'Сухари — 200 г'])
})

test('distributes meal macros across portion lines by grams', () => {
  const items = distributePortionMacros(
    ['Курица ~150 г', 'Брокколи ~150 г', 'Картофель ~100 г'],
    meal,
  )
  expect(items).toHaveLength(3)
  expect(items.reduce((sum, item) => sum + item.kcal, 0)).toBe(480)
  expect(items.reduce((sum, item) => sum + item.protein, 0)).toBe(45)
  expect(items[0]?.label).toBe('Курица ~150 г')
  expect(items[0]!.kcal).toBeGreaterThan(items[2]!.kcal)
})

test('keeps structured per-item macros from the API', () => {
  const items = portionItemsForMeal({
    ...meal,
    portionItems: [
      { label: 'Курица ~150 г', kcal: 240, protein: 40, fat: 10, carbs: 0 },
      { label: 'Брокколи ~150 г', kcal: 50, protein: 4, fat: 1, carbs: 8 },
    ],
  })
  expect(items[0]).toEqual({
    label: 'Курица ~150 г',
    kcal: 240,
    protein: 40,
    fat: 10,
    carbs: 0,
  })
  expect(formatPortionItemMacros(items[0]!)).toBe('240 ккал · Б: 40 · Ж: 10 · У: 0')
})

test('fills demo micronutrients and keeps API estimates when present', () => {
  const demo = micronutrientsForMeal(meal)
  expect(demo).toHaveLength(18)
  expect(demo[0]?.key).toBe('sodium')
  expect(demo[0]!.amount).toBeGreaterThan(0)

  const fromApi = micronutrientsForMeal({
    ...meal,
    fromApi: true,
    micronutrients: [{ key: 'sodium', label: 'Натрий', unit: 'мг', amount: 310 }],
  })
  expect(fromApi).toHaveLength(18)
  expect(fromApi[0]?.amount).toBe(310)
  expect(micronutrientsForMeal({ ...meal, fromApi: true })).toEqual([])
})

test('splits micronutrients into primary and additional groups', () => {
  const groups = partitionMealMicronutrients(micronutrientsForMeal(meal))
  expect(groups.primary).toHaveLength(6)
  expect(groups.additional).toHaveLength(12)
  expect(groups.primary.map((item) => item.key)).toContain('sodium')
  expect(groups.additional.map((item) => item.key)).toContain('folate')
})

test('shows пользователь instead of клиент in meal comments', () => {
  expect(displayMealComment('Клиент сфотографировал тарелку.')).toBe(
    'Пользователь сфотографировал тарелку.',
  )
  expect(displayMealComment('По словам клиента, порция обычная.')).toBe(
    'По словам пользователя, порция обычная.',
  )
})

test('shows meal comments in past tense', () => {
  expect(
    displayMealComment('Пользователь просит посчитать это как два приема пищи.'),
  ).toBe('Пользователь просил посчитать это как два приема пищи.')
  expect(displayMealComment('Клиент просит учесть соус отдельно.')).toBe(
    'Пользователь просил учесть соус отдельно.',
  )
  expect(displayMealComment('Пользователь уточняет, что порция двойная.')).toBe(
    'Пользователь уточнил, что порция двойная.',
  )
})
