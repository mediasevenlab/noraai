import { describe, expect, test } from 'bun:test'

import {
  appendMealVersion,
  canRefineMeal,
  ensureMealVersions,
  mealCorrectionCount,
  replaceMealPlate,
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

  test('selectMealVersion keeps the ration stamp an older snapshot does not have', () => {
    const original = ensureMealVersions(baseMeal())
    const refined = appendMealVersion(
      {
        ...original,
        assumptions: ['На воде', 'Добавлено из рациона', 'План:week:2026-10-19'],
        kcal: 880,
      },
      'добавь огурец',
    )
    const selected = selectMealVersion(refined, original.versions[0]!.id)
    expect(selected?.kcal).toBe(300)
    expect(selected?.assumptions).toContain('План:week:2026-10-19')
    expect(selected?.assumptions).toContain('Добавлено из рациона')
  })

  test('selectMealVersion does not mark a pending ration meal done from an older snapshot', () => {
    const original = ensureMealVersions(
      baseMeal({
        assumptions: ['Добавлено из рациона', 'План:week:2026-09-07', 'Выполнено по плану'],
      }),
    )
    const refined = appendMealVersion(
      {
        ...original,
        assumptions: ['Добавлено из рациона', 'План:week:2026-09-07'],
        kcal: 880,
      },
      'огурец',
    )
    const selected = selectMealVersion(refined, original.versions[0]!.id)
    expect(selected?.kcal).toBe(300)
    expect(selected?.assumptions).toContain('План:week:2026-09-07')
    expect(selected?.assumptions).not.toContain('Выполнено по плану')
  })

  test('replaceMealPlate keeps one current plate and the ration stamp', () => {
    const original = ensureMealVersions(
      baseMeal({ assumptions: ['Добавлено из рациона', 'План:authored-1'] }),
    )
    const refined = appendMealVersion({ ...original, title: 'С огурцом' }, 'огурец')
    const replaced = replaceMealPlate(refined, {
      title: 'Круассан',
      ingredients: 'Круассан',
      category: 'Завтрак',
      mealSlot: 'Завтрак',
      kcal: 400,
      protein: 10,
      fat: 20,
      carbs: 40,
      portionItems: [{ label: 'Круассан 80 г', kcal: 400, protein: 10, fat: 20, carbs: 40 }],
      clientComment: 'Подогреть',
    })
    expect(replaced.versions).toHaveLength(1)
    expect(replaced.versions[0]?.label).toBe('vers. 1.0')
    expect(replaced.title).toBe('Круассан')
    expect(replaced.assumptions).toContain('План:authored-1')
    expect(replaced.activeVersionId).toBe(replaced.versions[0]?.id)
  })

  test('user and mentor each get two corrections on the same card', () => {
    let meal = ensureMealVersions(baseMeal())
    expect(canRefineMeal(meal, 'user')).toBe(true)
    expect(canRefineMeal(meal, 'mentor')).toBe(true)
    meal = appendMealVersion(meal, 'user 1', 'user')
    meal = appendMealVersion(meal, 'user 2', 'user')
    expect(canRefineMeal(meal, 'user')).toBe(false)
    expect(canRefineMeal(meal, 'mentor')).toBe(true)
    meal = appendMealVersion(meal, 'mentor 1', 'mentor')
    meal = appendMealVersion(meal, 'mentor 2', 'mentor')
    expect(mealCorrectionCount(meal.versions, 'user')).toBe(2)
    expect(mealCorrectionCount(meal.versions, 'mentor')).toBe(2)
    expect(canRefineMeal(meal, 'mentor')).toBe(false)
    expect(meal.versions).toHaveLength(5)
  })

  test('older refinements without an author count toward the user', () => {
    const meal = ensureMealVersions(baseMeal())
    meal.versions.push({
      ...meal.versions[0]!,
      id: 'legacy',
      label: 'vers. 2.0',
    })
    expect(mealCorrectionCount(meal.versions, 'user')).toBe(1)
    expect(mealCorrectionCount(meal.versions, 'mentor')).toBe(0)
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
