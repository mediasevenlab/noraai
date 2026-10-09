import { expect, test } from 'bun:test'

import {
  applyAdditivePhotoRefine,
  excerptFromPortionItems,
  mergeAdditivePortionItems,
  photoAttachKeepsCurrentMeal,
  portionItemKey,
} from './meal-composition'

test('a new photo replaces the meal unless the note asks to add it to the current one', () => {
  expect(photoAttachKeepsCurrentMeal('')).toBe(false)
  expect(photoAttachKeepsCurrentMeal('добавь банан')).toBe(false)
  expect(photoAttachKeepsCurrentMeal('убери лук')).toBe(false)
  expect(photoAttachKeepsCurrentMeal('добавь банан к обеду')).toBe(false)
  expect(photoAttachKeepsCurrentMeal('добавь это к текущему приему')).toBe(true)
  expect(photoAttachKeepsCurrentMeal('Добавь это к текущему приёму.')).toBe(true)
  expect(photoAttachKeepsCurrentMeal('пожалуйста, добавь к уже существующему приёму')).toBe(true)
  expect(photoAttachKeepsCurrentMeal('дополни этот приём')).toBe(true)
  expect(photoAttachKeepsCurrentMeal('не заменяй, просто добавь фото')).toBe(true)
})

test('portion keys ignore weights and punctuation so the same food matches', () => {
  expect(portionItemKey('Свинина — 2 кг ~120 г')).toBe('свинина')
  expect(portionItemKey('Свинина ~120 г')).toBe('свинина')
  expect(portionItemKey('Соль ~20 г по вкусу')).toBe('соль')
})

test('additive merge keeps the current plate and appends only new foods', () => {
  expect(
    mergeAdditivePortionItems(
      [
        { label: 'Брокколи на пару ~200 г', kcal: 69, protein: 6, fat: 1, carbs: 13 },
        { label: 'Курица запеченная ~180 г', kcal: 297, protein: 45, fat: 12, carbs: 0 },
      ],
      [
        { label: 'Курица запеченная ~180 г', kcal: 297, protein: 45, fat: 12, carbs: 0 },
        { label: 'Шаурма ~200 г', kcal: 400, protein: 20, fat: 12, carbs: 30 },
      ],
    ),
  ).toEqual([
    { label: 'Брокколи на пару ~200 г', kcal: 69, protein: 6, fat: 1, carbs: 13 },
    { label: 'Курица запеченная ~180 г', kcal: 297, protein: 45, fat: 12, carbs: 0 },
    { label: 'Шаурма ~200 г', kcal: 400, protein: 20, fat: 12, carbs: 30 },
  ])
})

test('photo refine restores dropped plan foods instead of rewriting the card', () => {
  const current = {
    title: 'Рецепт шашлыка из свинины в духовке',
    ingredients: 'Свинина, лук',
    category: 'Мясо' as const,
    meal: 'Обед' as const,
    kcal: 715,
    protein: 43,
    fat: 56,
    carbs: 9,
    portionItems: [
      { label: 'Свинина ~120 г', kcal: 320, protein: 28, fat: 22, carbs: 0 },
      { label: 'Лук репчатый ~80 г', kcal: 32, protein: 1, fat: 0, carbs: 7 },
    ],
    clientComment: '',
    assumptions: [] as string[],
    micronutrients: [] as never[],
  }
  const incoming = {
    title: 'Шаурма',
    ingredients: 'Шаурма',
    category: 'Мясо' as const,
    meal: 'Ужин' as const,
    kcal: 400,
    protein: 20,
    fat: 12,
    carbs: 30,
    portionItems: [{ label: 'Шаурма ~200 г', kcal: 400, protein: 20, fat: 12, carbs: 30 }],
    clientComment: 'Пользователь приложил своё фото',
    assumptions: ['Вес по фото'],
    micronutrients: [],
  }

  const merged = applyAdditivePhotoRefine(current, incoming)

  expect(merged.title).toBe('Рецепт шашлыка из свинины в духовке')
  expect(merged.meal).toBe('Обед')
  expect(merged.portionItems.map((item) => item.label)).toEqual([
    'Свинина ~120 г',
    'Лук репчатый ~80 г',
    'Шаурма ~200 г',
  ])
  expect(merged.kcal).toBe(1115)
  expect(merged.protein).toBe(63)
  expect(merged.ingredients).toBe(excerptFromPortionItems(merged.portionItems))
})

test('photo refine keeps the model card when it already contains the current foods', () => {
  const current = {
    title: 'Овсянка',
    ingredients: 'Овсянка',
    category: 'Завтрак' as const,
    meal: 'Завтрак' as const,
    kcal: 300,
    protein: 20,
    fat: 8,
    carbs: 40,
    portionItems: [{ label: 'Овсянка ~40 г', kcal: 180, protein: 8, fat: 3, carbs: 30 }],
    clientComment: '',
    assumptions: [] as string[],
    micronutrients: [] as never[],
  }
  const incoming = {
    ...current,
    title: 'Овсянка и банан',
    ingredients: 'Овсянка, банан',
    kcal: 390,
    protein: 21,
    carbs: 63,
    portionItems: [
      { label: 'Овсянка ~40 г', kcal: 180, protein: 8, fat: 3, carbs: 30 },
      { label: 'Банан ~80 г', kcal: 90, protein: 1, fat: 0, carbs: 23 },
    ],
  }

  expect(applyAdditivePhotoRefine(current, incoming)).toEqual(incoming)
})
