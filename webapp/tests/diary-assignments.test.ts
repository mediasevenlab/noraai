import { describe, expect, test } from 'bun:test'

import {
  assignMealIdsForUser,
  ensureDiaryState,
  filterDiaryMeals,
  hashUserId,
  isCatalogDemoAssignment,
  readSavedMealIds,
  resolveMealsFromIds,
  seededShuffle,
  writeSavedMealIds,
} from '../src/features/diary/diary-assignments'
import { MEAL_CATALOG } from '../src/features/diary/meals-catalog'
import { RATION_DIARY_DONE_MARK, RATION_DIARY_SOURCE_MARK } from '../src/features/diary/ration-import'

describe('diary meal assignment', () => {
  test('assigns between 4 and 8 meals per user', () => {
    const ids = [
      '11111111-1111-7111-8111-111111111111',
      '22222222-2222-7222-8222-222222222222',
      '33333333-3333-7333-8333-333333333333',
      'aaaaaaaa-aaaa-7aaa-8aaa-aaaaaaaaaaaa',
      'bbbbbbbb-bbbb-7bbb-8bbb-bbbbbbbbbbbb',
    ]
    for (const userId of ids) {
      const mealIds = assignMealIdsForUser(userId)
      expect(mealIds.length).toBeGreaterThanOrEqual(4)
      expect(mealIds.length).toBeLessThanOrEqual(8)
      expect(new Set(mealIds).size).toBe(mealIds.length)
      for (const id of mealIds) {
        expect(MEAL_CATALOG.some((meal) => meal.id === id)).toBe(true)
      }
    }
  })

  test('is deterministic for the same user', () => {
    const userId = 'user-stable-id-42'
    expect(assignMealIdsForUser(userId)).toEqual(assignMealIdsForUser(userId))
    expect(hashUserId(userId)).toBe(hashUserId(userId))
  })

  test('gives different orders or sets to different users', () => {
    const a = assignMealIdsForUser('user-a')
    const b = assignMealIdsForUser('user-b')
    const c = assignMealIdsForUser('user-c')
    const serialized = [a, b, c].map((ids) => ids.join('|'))
    expect(new Set(serialized).size).toBeGreaterThan(1)
  })

  test('seeded shuffle preserves membership', () => {
    const source = MEAL_CATALOG.map((meal) => meal.id)
    const shuffled = seededShuffle(source, 42)
    expect(shuffled.slice().sort()).toEqual(source.slice().sort())
  })

  test('resolveMealsFromIds keeps assignment order', () => {
    const ids = ['meal-05', 'meal-01', 'meal-19']
    expect(resolveMealsFromIds(ids).map((meal) => meal.id)).toEqual(ids)
  })

  test('catalog demo assignment detects catalog-only meal ids', () => {
    expect(isCatalogDemoAssignment(assignMealIdsForUser('user-demo'))).toBe(true)
    expect(isCatalogDemoAssignment([])).toBe(true)
    expect(isCatalogDemoAssignment(['not-a-catalog-id'])).toBe(false)
  })

  test('ensureDiaryState defaults to skeleton and clears catalog demos', () => {
    const memory = new Map<string, string>()
    const originalStorage = globalThis.localStorage
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      value: {
        getItem: (key: string) => memory.get(key) ?? null,
        setItem: (key: string, value: string) => {
          memory.set(key, value)
        },
        removeItem: (key: string) => {
          memory.delete(key)
        },
      },
    })

    try {
      const userId = 'new-user-no-demos'
      expect(ensureDiaryState(userId)).toEqual({
        kind: 'skeleton',
        dailyCalories: 2200,
      })

      memory.set(
        `nora:diary:v1:${userId}`,
        JSON.stringify({
          kind: 'meals',
          mealIds: assignMealIdsForUser(userId),
          dailyCalories: 2000,
        }),
      )
      expect(ensureDiaryState(userId)).toEqual({
        kind: 'skeleton',
        dailyCalories: 2000,
      })
    } finally {
      Object.defineProperty(globalThis, 'localStorage', {
        configurable: true,
        value: originalStorage,
      })
    }
  })
})

describe('diary feed search and saved meals', () => {
  test('search matches title, category, slot and portion labels', () => {
    const meals = [
      MEAL_CATALOG[0]!,
      MEAL_CATALOG[1]!,
    ]
    expect(
      filterDiaryMeals(meals, {
        tab: 'Все',
        savedIds: new Set(),
        query: 'ролл',
      }).map((meal) => meal.id),
    ).toEqual(['meal-01'])
    expect(
      filterDiaryMeals(meals, {
        tab: 'Все',
        savedIds: new Set(),
        query: 'завтрак',
      }).map((meal) => meal.id),
    ).toEqual(['meal-02'])
    expect(
      filterDiaryMeals(meals, {
        tab: 'Все',
        savedIds: new Set(),
        query: 'лаваш тонкий',
      }).map((meal) => meal.id),
    ).toEqual(['meal-01'])
  })

  test('favorites keep saved meals and drop pending plan copies', () => {
    const own = MEAL_CATALOG[0]!
    const pending = {
      ...MEAL_CATALOG[1]!,
      assumptions: [RATION_DIARY_SOURCE_MARK],
    }
    const done = {
      ...MEAL_CATALOG[2]!,
      assumptions: [RATION_DIARY_SOURCE_MARK, RATION_DIARY_DONE_MARK],
    }
    expect(
      filterDiaryMeals([own, pending, done], {
        tab: 'Избранное',
        savedIds: new Set([own.id, pending.id, done.id]),
        query: '',
      }).map((meal) => meal.id),
    ).toEqual([own.id, done.id])
  })

  test('does not merge guest bookmarks onto a signed-in account', () => {
    const memory = new Map<string, string>()
    const originalStorage = globalThis.localStorage
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      value: {
        getItem: (key: string) => memory.get(key) ?? null,
        setItem: (key: string, value: string) => {
          memory.set(key, value)
        },
        removeItem: (key: string) => {
          memory.delete(key)
        },
      },
    })
    try {
      writeSavedMealIds('guest', new Set(['meal-01']))
      writeSavedMealIds('user@nora.com', new Set(['meal-02']))
      const merged = readSavedMealIds({
        userId: 'new-user-id',
        email: 'User@Nora.com',
      })
      expect([...merged].sort()).toEqual(['meal-02'])
      writeSavedMealIds({ userId: 'new-user-id', email: 'User@Nora.com' }, new Set(['meal-01', 'meal-07']))
      expect([...readSavedMealIds({ userId: 'new-user-id', email: 'user@nora.com' })].sort()).toEqual([
        'meal-01',
        'meal-07',
      ])
    } finally {
      Object.defineProperty(globalThis, 'localStorage', {
        configurable: true,
        value: originalStorage,
      })
    }
  })
})
