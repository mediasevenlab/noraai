import { expect, test } from 'bun:test'

import {
  applyAdditivePhotoRefine,
  applyTextPortionEdit,
  excerptFromPortionItems,
  mergeAdditivePortionItems,
  photoAttachKeepsCurrentMeal,
  portionItemKey,
  portionItemsShownOnCard,
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

const plate = {
  title: 'Жареный творог на сковороде с яйцом',
  ingredients: 'Творог, яйцо, сыр, масло',
  category: 'Завтрак' as const,
  meal: 'Завтрак' as const,
  kcal: 300,
  protein: 20,
  fat: 19,
  carbs: 13,
  portionItems: [
    { label: 'Творог – 70 г ~120 г', kcal: 127, protein: 8, fat: 8, carbs: 6 },
    { label: 'Яйцо куриное – 2 шт. Размер С0 ~80 г', kcal: 146, protein: 10, fat: 9, carbs: 7 },
    { label: 'Сыр твердый – 10 г ~60 г', kcal: 18, protein: 1, fat: 1, carbs: 1 },
    { label: 'Масло сливочное – 5 г ~40 г', kcal: 9, protein: 1, fat: 1, carbs: 0 },
  ],
  clientComment: '',
  assumptions: [] as string[],
  micronutrients: [] as never[],
}

test('adding a food keeps every other line and adds only its calories', () => {
  const incoming = {
    ...plate,
    title: 'Творог с хлебом',
    kcal: 999,
    portionItems: [
      { label: 'Творог ~200 г', kcal: 200, protein: 20, fat: 10, carbs: 8 },
      { label: 'Яйцо ~100 г', kcal: 160, protein: 12, fat: 11, carbs: 1 },
      { label: 'Сыр ~80 г', kcal: 40, protein: 3, fat: 3, carbs: 1 },
      { label: 'Масло ~20 г', kcal: 40, protein: 0, fat: 4, carbs: 0 },
      { label: 'Хлеб ~30 г', kcal: 80, protein: 3, fat: 1, carbs: 15 },
    ],
  }
  const edited = applyTextPortionEdit(plate, incoming, 'добавь хлеб')
  expect(edited?.portionItems.map((item) => item.label)).toEqual([
    'Творог – 70 г ~120 г',
    'Яйцо куриное – 2 шт. Размер С0 ~80 г',
    'Сыр твердый – 10 г ~60 г',
    'Масло сливочное – 5 г ~40 г',
    'Хлеб ~30 г',
  ])
  expect(edited?.portionItems[0]).toEqual(plate.portionItems[0])
  expect(edited?.kcal).toBe(300 + 80)
  expect(edited?.title).toBe(plate.title)
})

test('removing one food leaves the other lines and their calories untouched', () => {
  const incoming = {
    ...plate,
    kcal: 250,
    portionItems: [
      { label: 'Творог ~100 г', kcal: 100, protein: 10, fat: 5, carbs: 4 },
      { label: 'Яйцо ~50 г', kcal: 80, protein: 6, fat: 5, carbs: 1 },
      { label: 'Сыр ~40 г', kcal: 30, protein: 2, fat: 2, carbs: 0 },
    ],
  }
  const edited = applyTextPortionEdit(plate, incoming, 'убери масло из приема')
  expect(edited?.portionItems).toEqual(plate.portionItems.slice(0, 3))
  expect(edited?.kcal).toBe(127 + 146 + 18)
})

test('reducing one food changes only that line', () => {
  const incoming = {
    ...plate,
    portionItems: [
      { label: 'Творог ~80 г', kcal: 90, protein: 6, fat: 4, carbs: 3 },
      { label: 'Сыр твердый ~30 г', kcal: 9, protein: 1, fat: 1, carbs: 0 },
      { label: 'Яйцо ~40 г', kcal: 70, protein: 5, fat: 4, carbs: 1 },
      { label: 'Масло ~10 г', kcal: 20, protein: 0, fat: 2, carbs: 0 },
    ],
  }
  const edited = applyTextPortionEdit(plate, incoming, 'убавь сыр')
  expect(edited?.portionItems.map((item) => item.label)).toEqual([
    'Творог – 70 г ~120 г',
    'Яйцо куриное – 2 шт. Размер С0 ~80 г',
    'Сыр твердый ~30 г',
    'Масло сливочное – 5 г ~40 г',
  ])
  expect(edited?.portionItems[0]).toEqual(plate.portionItems[0])
  expect(edited?.portionItems[2]?.kcal).toBe(9)
  expect(edited?.kcal).toBe(127 + 146 + 9 + 9)
})

const mackerelList =
  'Скумбрия – 700 г, Зелень – 20 г, Масло оливковое – 35 г, Чеснок – 1 зуб., Сок лимонный – 1 ч.л., Смесь перцев – 2 щепотка (-и), Соль – 3 г по вкусу'

test('a ration list without portion rows is the same plate the diary shows', () => {
  const shown = portionItemsShownOnCard({
    ingredients: mackerelList,
    portionItems: [],
    kcal: 879,
    protein: 67,
    fat: 67,
    carbs: 2,
  })
  expect(shown.map((item) => item.label)).toEqual([
    'Скумбрия – 700 г ~120 г',
    'Зелень – 20 г ~80 г',
    'Масло оливковое – 35 г ~60 г',
    'Чеснок – 1 зуб ~40 г',
    'Сок лимонный – 1 ч.л ~30 г',
    'Смесь перцев – 2 щепотка (-и) ~20 г',
    'Соль – 3 г по вкусу ~25 г',
  ])
  expect(shown[0]).toMatchObject({ kcal: 726, protein: 55, fat: 55, carbs: 2 })
  expect(shown[1]).toMatchObject({ kcal: 21, protein: 2, fat: 2, carbs: 0 })
})

test('removing greens drops only that line when the model rewrites the plate', () => {
  const current = {
    title: 'Скумбрия на сковороде-гриль',
    ingredients: mackerelList,
    category: 'Рыба' as const,
    meal: 'Ужин' as const,
    kcal: 879,
    protein: 67,
    fat: 67,
    carbs: 2,
    portionItems: portionItemsShownOnCard({
      ingredients: mackerelList,
      portionItems: [],
      kcal: 879,
      protein: 67,
      fat: 67,
      carbs: 2,
    }),
    clientComment: '',
    assumptions: [] as string[],
    micronutrients: [] as never[],
  }
  const incoming = {
    ...current,
    kcal: 45,
    protein: 0,
    fat: 0,
    carbs: 11,
    ingredients: 'Скумбрия, лук, чай',
    portionItems: [
      { label: 'Скумбрия ~200 г', kcal: 40, protein: 0, fat: 0, carbs: 10 },
      { label: 'Лук ~10 г', kcal: 4, protein: 0, fat: 0, carbs: 1 },
      { label: 'Чай ~200 мл', kcal: 1, protein: 0, fat: 0, carbs: 0 },
    ],
  }
  const edited = applyTextPortionEdit(current, incoming, 'убери зелень и состава')
  expect(edited?.portionItems.map((item) => item.label)).toEqual([
    'Скумбрия – 700 г ~120 г',
    'Масло оливковое – 35 г ~60 г',
    'Чеснок – 1 зуб ~40 г',
    'Сок лимонный – 1 ч.л ~30 г',
    'Смесь перцев – 2 щепотка (-и) ~20 г',
    'Соль – 3 г по вкусу ~25 г',
  ])
  expect(edited?.portionItems[0]).toEqual(current.portionItems[0])
  expect(edited?.kcal).toBe(879 - 21)
  expect(edited?.protein).toBe(67 - 2)
  expect(edited?.fat).toBe(67 - 2)
  expect(edited?.carbs).toBe(2)
})

test('a fresh description is not forced back onto the old plate', () => {
  expect(applyTextPortionEdit(plate, plate, 'на завтрак была гречка с молоком')).toBeNull()
})

test('replacing one food removes it and keeps the rest of the plate', () => {
  const incoming = {
    ...plate,
    portionItems: [
      { label: 'Гречка ~150 г', kcal: 150, protein: 6, fat: 2, carbs: 30 },
      { label: 'Творог ~90 г', kcal: 80, protein: 8, fat: 3, carbs: 4 },
    ],
  }
  const edited = applyTextPortionEdit(plate, incoming, 'замени творог на гречку')
  expect(edited?.portionItems.map((item) => item.label)).toEqual([
    'Яйцо куриное – 2 шт. Размер С0 ~80 г',
    'Сыр твердый – 10 г ~60 г',
    'Масло сливочное – 5 г ~40 г',
    'Гречка ~150 г',
  ])
  expect(edited?.portionItems[0]).toEqual(plate.portionItems[1])
  expect(edited?.kcal).toBe(146 + 18 + 9 + 150)
})

test('«убери ветчину» drops the ham line even when the model keeps it', () => {
  const croissant = {
    ...plate,
    title: 'Горячий круассан с ветчиной и сыром',
    kcal: 880,
    protein: 40,
    fat: 51,
    carbs: 63,
    portionItems: [
      { label: 'Круассан ~150 г (3 шт.)', kcal: 255, protein: 12, fat: 30, carbs: 60 },
      { label: 'Ветчина ~120 г', kcal: 174, protein: 10, fat: 11, carbs: 1 },
      { label: 'Сыр твердый ~40 г', kcal: 140, protein: 10, fat: 10, carbs: 0 },
      { label: 'Салат листовой ~30 г', kcal: 3, protein: 0, fat: 0, carbs: 0 },
      { label: 'Огурец ~50 г', kcal: 8, protein: 0, fat: 0, carbs: 2 },
    ],
  }
  const edited = applyTextPortionEdit(croissant, croissant, 'убери ветчину')
  expect(edited?.portionItems.map((item) => item.label)).toEqual([
    'Круассан ~150 г (3 шт.)',
    'Сыр твердый ~40 г',
    'Салат листовой ~30 г',
    'Огурец ~50 г',
  ])
  expect(edited?.portionItems[0]).toEqual(croissant.portionItems[0])
  expect(edited?.kcal).toBe(255 + 140 + 3 + 8)
  expect(edited?.title).toBe(croissant.title)
})
