import { describe, expect, test } from 'bun:test'

import {
  appendMealVersion,
  canRefineMeal,
  ensureMealVersions,
  MAX_MEAL_VERSIONS,
  sanitizeAssumptions,
  selectMealVersion,
  type MealWithVersions,
} from './meal-versions'

function baseMeal(overrides: Partial<MealWithVersions> = {}): MealWithVersions {
  return {
    title: 'Овсянка',
    ingredients: 'Овсянка, банан',
    category: 'Завтрак',
    mealSlot: 'Завтрак',
    kcal: 300,
    protein: 12,
    fat: 6,
    carbs: 50,
    portionItems: [{ label: 'Овсянка ~40 г', kcal: 0, protein: 0, fat: 0, carbs: 0 }],
    clientComment: 'Завтрак',
    assumptions: ['На воде'],
    micronutrients: [],
    createdAt: new Date('2026-08-04T08:00:00.000Z'),
    versions: [],
    activeVersionId: null,
    ...overrides,
  }
}

describe('meal versions', () => {
  test('ensureMealVersions seeds vers. 1.0', () => {
    const ensured = ensureMealVersions(baseMeal())
    expect(ensured.versions).toHaveLength(1)
    expect(ensured.versions[0]?.label).toBe('vers. 1.0')
    expect(ensured.activeVersionId).toBe(ensured.versions[0]?.id)
    expect(ensured.versions[0]?.snapshot.title).toBe('Овсянка')
  })

  test('appendMealVersion labels version N.0 and switches active', () => {
    const original = ensureMealVersions(baseMeal())
    const refined = appendMealVersion(
      {
        ...original,
        title: 'Овсянка с бананом',
        kcal: 340,
      },
      'банан 80г',
    )
    expect(refined.versions).toHaveLength(2)
    expect(refined.versions[1]?.label).toBe('vers. 2.0')
    expect(refined.versions[1]?.note).toBe('банан 80г')
    expect(refined.activeVersionId).toBe(refined.versions[1]?.id)
    expect(refined.versions[1]?.snapshot.kcal).toBe(340)
  })

  test('appendMealVersion stores extra image keys on the new version only', () => {
    const original = ensureMealVersions(baseMeal())
    const refined = appendMealVersion(
      { ...original, extraImageKeys: ['meals/extra-shawarma.jpg'] },
      'фото',
    )
    expect(refined.versions[0]?.extraImageKeys).toEqual([])
    expect(refined.versions[1]?.extraImageKeys).toEqual(['meals/extra-shawarma.jpg'])
    expect(selectMealVersion(refined, original.versions[0]!.id)?.extraImageKeys).toEqual([])
    expect(selectMealVersion(refined, refined.versions[1]!.id)?.extraImageKeys).toEqual([
      'meals/extra-shawarma.jpg',
    ])
  })

  test('selectMealVersion restores snapshot fields', () => {
    const original = ensureMealVersions(baseMeal())
    const refined = appendMealVersion(
      { ...original, title: 'Уточнённая', kcal: 400 },
      'уточнение',
    )
    const selected = selectMealVersion(refined, original.versions[0]!.id)
    expect(selected?.title).toBe('Овсянка')
    expect(selected?.kcal).toBe(300)
    expect(selected?.activeVersionId).toBe(original.versions[0]?.id)
  })

  test('canRefineMeal caps at original + 5 edits', () => {
    let meal = ensureMealVersions(baseMeal())
    for (let index = 0; index < MAX_MEAL_VERSIONS - 1; index += 1) {
      expect(canRefineMeal(meal)).toBe(true)
      meal = appendMealVersion({ ...meal, kcal: meal.kcal + 1 }, `edit ${index + 1}`)
    }
    expect(meal.versions).toHaveLength(MAX_MEAL_VERSIONS)
    expect(canRefineMeal(meal)).toBe(false)
  })

  test('sanitizeAssumptions drops chat clarifications from assumptions', () => {
    expect(
      sanitizeAssumptions([
        'На воде',
        'Уточнение в чате: тройной прием пищи',
        'Учтён состав по фото из чата',
      ]),
    ).toEqual(['На воде'])
  })

  test('sanitizeAssumptions drops added-food echoes and recipe dumps', () => {
    expect(
      sanitizeAssumptions(
        [
          'Брокколи отварная или приготовленная на пару.',
          'Запеканка приготовлена с использованием куриного фарша, яиц и помидоров.',
          'Использовано небольшое количество растительного масла для приготовления запеканки.',
          'Вес продуктов оценен по фото.',
          'К приему пищи добавлена шаурма с курицей, весом около 300 г.',
        ],
        [{ label: 'Шаурма с курицей ~300 г', kcal: 650, protein: 35, fat: 35, carbs: 60 }],
      ),
    ).toEqual([
      'Брокколи отварная или приготовленная на пару.',
      'Вес продуктов оценен по фото.',
    ])
  })
})
