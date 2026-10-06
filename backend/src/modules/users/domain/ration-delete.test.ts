import { describe, expect, test } from 'bun:test'

import {
  MEAL_AUTHOR_PHOTO_MARK,
  RATION_DIARY_DONE_MARK,
  RATION_DIARY_SOURCE_MARK,
  authoredPlansWithoutRation,
  mealRemovedWithRation,
  rationIdsRemovedWith,
} from './ration-delete'

const planId = '11111111-1111-4111-8111-111111111111'

function meal(assumptions: string[], extras?: { versionCount?: number; hasAuthorPhoto?: boolean }) {
  return mealRemovedWithRation({
    assumptions,
    hasAuthorPhoto: extras?.hasAuthorPhoto ?? false,
    planIds: new Set([planId]),
    versionCount: extras?.versionCount ?? 1,
  })
}

describe('mealRemovedWithRation', () => {
  test('drops a pending unmodified copy of the ration', () => {
    expect(
      meal([
        RATION_DIARY_SOURCE_MARK,
        `Рацион:${planId}`,
        `План:${planId}`,
      ]),
    ).toBe(true)
  })

  test('keeps a completed copy', () => {
    expect(
      meal([
        RATION_DIARY_SOURCE_MARK,
        `План:${planId}`,
        RATION_DIARY_DONE_MARK,
      ]),
    ).toBe(false)
  })

  test('keeps a copy the user edited', () => {
    expect(
      meal([RATION_DIARY_SOURCE_MARK, `План:${planId}`], { versionCount: 2 }),
    ).toBe(false)
    expect(
      meal(
        [RATION_DIARY_SOURCE_MARK, `План:${planId}`, MEAL_AUTHOR_PHOTO_MARK],
      ),
    ).toBe(false)
  })

  test('keeps the user\'s own diary meal that was only placed on the plan', () => {
    expect(meal([`План:${planId}`, 'Дневник:meal-1'])).toBe(false)
  })

  test('ignores meals from another ration', () => {
    expect(meal([RATION_DIARY_SOURCE_MARK, 'План:week:2026-10-05'])).toBe(false)
  })
})

describe('ration ids removed with a catalog plan', () => {
  test('includes the user\'s clone of that catalog plan', () => {
    const ids = rationIdsRemovedWith('catalog_loss', [
      { id: 'plan_clone', sourceCatalogId: 'catalog_loss' },
      { id: 'plan_other', sourceCatalogId: 'catalog_gain' },
    ])
    expect([...ids].sort()).toEqual(['catalog_loss', 'plan_clone'])
    expect(
      authoredPlansWithoutRation(
        [
          { id: 'plan_clone', sourceCatalogId: 'catalog_loss' },
          { id: 'plan_other' },
        ],
        ids,
      ),
    ).toEqual([{ id: 'plan_other' }])
  })
})
