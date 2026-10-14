import { describe, expect, test } from 'bun:test'

import {
  mealNumbersMissing,
  noraModelKind,
  normalizeGeneratedMealCard,
  portionLabelsNeedWeight,
  readMealCardJson,
  withEstimatedPortionWeights,
  withRolledUpNutrition,
} from './nora-meal'

describe('nora meal routing', () => {
  test('a photo uses the vision model and a description uses the text model', () => {
    expect(noraModelKind(1)).toBe('vision')
    expect(noraModelKind(3)).toBe('vision')
    expect(noraModelKind(0)).toBe('text')
  })

  test('a fenced card becomes the same meal fields the diary stores', () => {
    const card = normalizeGeneratedMealCard(
      readMealCardJson(
        '```json\n{"title":"Овсянка","excerpt":"овсянка, ягоды","nutrition":{"kcal":320,"protein":12,"fat":8,"carbs":48},"composition":[{"label":"Овсянка ~200 г","kcal":280,"protein":10,"fat":6,"carbs":42}]}\n```',
      ),
    )
    expect(card.title).toBe('Овсянка')
    expect(card.nutrition.kcal).toBe(320)
    expect(card.composition[0]?.label).toBe('Овсянка ~200 г')
    expect(card.assumptions).not.toContain('Оценка, не весы')
    expect(
      normalizeGeneratedMealCard({ assumptions: ['На пару', 'Оценка, не весы'] }).assumptions,
    ).toEqual(['На пару'])
    expect(card.body).toBe('')
  })

  test('a weight sent beside the name is written into the composition line', () => {
    const card = normalizeGeneratedMealCard({
      title: 'Салат',
      composition: [
        { label: 'Морковь', grams: 40, kcal: 16 },
        { label: 'Чай', ml: 200, kcal: 2 },
        { label: 'Овсянка ~200 г', kcal: 280 },
      ],
    })
    expect(card.composition.map((item) => item.label)).toEqual([
      'Морковь ~40 г',
      'Чай ~200 мл',
      'Овсянка ~200 г',
    ])
  })

  test('a composition line without a measure still needs a weight', () => {
    expect(portionLabelsNeedWeight([{ label: 'Морковь' }, { label: 'Перец ~30 г' }])).toBe(true)
    expect(portionLabelsNeedWeight([{ label: 'Морковь ~40 г' }, { label: 'Чай ~200 мл' }])).toBe(false)
    expect(portionLabelsNeedWeight([])).toBe(false)
  })

  test('zero totals take the sum of the composition lines', () => {
    const meal = withRolledUpNutrition({
      nutrition: { kcal: 0, protein: 0, fat: 0, carbs: 0 },
      composition: [
        { label: 'Рис ~180 г', kcal: 200, protein: 4, fat: 1, carbs: 40 },
        { label: 'Мясо ~100 г', kcal: 180, protein: 20, fat: 10, carbs: 0 },
      ],
    })
    expect(meal.nutrition).toEqual({ kcal: 380, protein: 24, fat: 11, carbs: 40 })
  })

  test('a named line without a measure gets an estimated weight', () => {
    expect(withEstimatedPortionWeights([
      { label: 'Брокколи', kcal: 40 },
      { label: 'Курица', kcal: 0 },
      { label: 'Чай', kcal: 2 },
      { label: 'Рис ~150 г', kcal: 180 },
    ]).map((item) => item.label)).toEqual([
      'Брокколи ~110 г',
      'Курица ~120 г',
      'Чай ~200 мл',
      'Рис ~150 г',
    ])
  })

  test('a card with no numbers is empty', () => {
    expect(mealNumbersMissing({
      nutrition: { kcal: 0, protein: 0, fat: 0, carbs: 0 },
      composition: [{ kcal: 0, protein: 0, fat: 0, carbs: 0 }],
    })).toBe(true)
    expect(mealNumbersMissing({
      nutrition: { kcal: 0, protein: 0, fat: 0, carbs: 0 },
      composition: [{ kcal: 200, protein: 0, fat: 0, carbs: 0 }],
    })).toBe(false)
  })
})
