import { describe, expect, test } from 'bun:test'

import {
  mealNumbersMissing,
  noraExtractPrompt,
  noraModelKind,
  noraRefineImages,
  noraRefinePrompt,
  noraRefineSource,
  normalizeGeneratedMealCard,
  portionLabelsNeedWeight,
  readMealCardJson,
  withCompositionNutrition,
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

  test('a correction total follows the new lines instead of the old header', () => {
    const meal = withCompositionNutrition({
      nutrition: { kcal: 500, protein: 30, fat: 20, carbs: 40 },
      composition: [
        { label: 'Рис ~180 г', kcal: 230, protein: 5, fat: 1, carbs: 48 },
        { label: 'Курица ~120 г', kcal: 200, protein: 30, fat: 8, carbs: 0 },
        { label: 'Хлеб ~30 г', kcal: 80, protein: 3, fat: 1, carbs: 14 },
      ],
    })
    expect(meal.nutrition).toEqual({ kcal: 510, protein: 38, fat: 10, carbs: 62 })
  })

  test('adding a photo to the current meal does not send the saved cover', () => {
    const images = noraRefineImages({
      photoMode: 'augment',
      coverBase64: 'cover',
      coverMime: 'image/webp',
      attached: [{ base64: 'carrot', mime: 'image/jpeg' }],
    })
    expect(images).toEqual([{ base64: 'carrot', mime: 'image/jpeg' }])
    expect(noraRefinePrompt('augment')).toContain('Состав сейчас')
    expect(noraRefinePrompt('augment')).not.toContain('vitaminB12')
    expect(noraRefinePrompt('augment').length).toBeLessThan(900)
  })

  test('several photos share one short card prompt', () => {
    const prompt = noraExtractPrompt(2)
    expect(prompt).toContain('2 кадра')
    expect(prompt).not.toContain('vitaminB12')
    expect(prompt.length).toBeLessThan(900)
  })

  test('a replacement photo is the only frame Nora sees', () => {
    expect(
      noraRefineImages({
        photoMode: 'replace',
        coverBase64: 'cover',
        attached: [{ base64: 'plate', mime: 'image/jpeg' }],
      }),
    ).toEqual([{ base64: 'plate', mime: 'image/jpeg' }])
    expect(noraRefinePrompt('replace')).toContain('новый приём')
  })

  test('a correction sent to Nora keeps names and drops the old calories', () => {
    expect(noraRefineSource({
      title: 'Рис с курицей',
      mealType: 'Обед',
      nutrition: { kcal: 500, protein: 30, fat: 20, carbs: 40 },
      composition: [
        { label: 'Рис ~180 г', kcal: 230, protein: 5, fat: 1, carbs: 48 },
        { label: 'Курица ~120 г', kcal: 200, protein: 30, fat: 8, carbs: 0 },
      ],
    })).toEqual({
      title: 'Рис с курицей',
      mealType: 'Обед',
      composition: [{ label: 'Рис ~180 г' }, { label: 'Курица ~120 г' }],
    })
    expect(noraRefineSource({ title: 'Рис', mealType: 'Обед', nutrition: { kcal: 500 } }, 'replace')).toEqual({
      title: 'Рис',
      mealType: 'Обед',
    })
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
