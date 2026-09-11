import { describe, expect, test } from 'bun:test'

import { FEED_DIARY_SOURCE_MARK } from '../src/features/diary/feed-import'
import { writePlanStartDate } from '../src/platform/plan-start'
import {
  clearSkippedPlanMealIds,
  diaryPlanIdForMeal,
  diaryPlanStartForMeal,
  keepsWeeklyPlanOnDiaryDelete,
  mealListAfterPlanDone,
  orderDiaryDayByPlanLayout,
  planLayoutSlotIndex,
  planOccurrenceDiaryAt,
  planOccurrenceDiaryAtWithLayout,
  planOccurrenceStampWhilePending,
  readSkippedPlanMealIds,
  writeSkippedPlanMealIds,
} from '../src/features/diary/plan-occurrence'
import { readDiaryPlanAtById, writeDiaryPlanAtById } from '../src/features/diary/ration-done'
import {
  isDiaryFeedMealVisible,
  RATION_DIARY_DONE_MARK,
  RATION_DIARY_SOURCE_MARK,
  weekPlanAssumption,
} from '../src/features/diary/ration-import'

const PLAN_ID = 'week:2026-08-31'
const TUESDAY_LAST_WEEK = new Date(2026, 7, 25, 8, 30, 0)
const TUESDAY_THIS_WEEK = new Date(2026, 8, 1, 12, 0, 0)

const pendingPlanMeal = {
  id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  title: 'Творог с ягодами и хлебцем',
  at: TUESDAY_LAST_WEEK.toISOString(),
  assumptions: [RATION_DIARY_SOURCE_MARK, weekPlanAssumption(PLAN_ID)],
  fromApi: true as const,
}

describe('diary vs weekly plan occurrences', () => {
  test('removing a planned diary card keeps the weekly plan meal', () => {
    expect(keepsWeeklyPlanOnDiaryDelete(pendingPlanMeal)).toBe(true)
    expect(
      keepsWeeklyPlanOnDiaryDelete({
        id: 'self',
        title: 'Омлет',
        fromApi: true,
      }),
    ).toBe(false)
  })

  test('pending plan meals land on the selected start date plus their slot', () => {
    const start = new Date(2026, 8, 3, 12, 0, 0)
    const at = planOccurrenceDiaryAt(pendingPlanMeal, undefined, TUESDAY_THIS_WEEK, start)
    expect(new Date(at).getFullYear()).toBe(2026)
    expect(new Date(at).getMonth()).toBe(8)
    expect(new Date(at).getDate()).toBe(4)
    expect(new Date(at).getHours()).toBe(8)
    expect(new Date(at).getMinutes()).toBe(30)
    expect(
      isDiaryFeedMealVisible(
        { ...pendingPlanMeal, at },
        PLAN_ID,
        undefined,
        new Date(2026, 8, 4, 12, 0, 0),
      ),
    ).toBe(true)
  })

  test('completed plan meals keep stored day only when no plan start is set', () => {
    const eaten = {
      ...pendingPlanMeal,
      assumptions: [...pendingPlanMeal.assumptions, RATION_DIARY_DONE_MARK],
    }
    expect(planOccurrenceDiaryAt(eaten, undefined, TUESDAY_THIS_WEEK)).toBe(eaten.at)
  })

  test('completing freezes the currently shown occurrence instead of the template stamp', () => {
    const shown = planOccurrenceStampWhilePending(pendingPlanMeal, TUESDAY_THIS_WEEK)
    expect(new Date(shown).toDateString()).not.toBe(new Date(pendingPlanMeal.at).toDateString())
    const frozen = {
      ...pendingPlanMeal,
      at: shown,
      assumptions: [...pendingPlanMeal.assumptions, RATION_DIARY_DONE_MARK],
    }
    expect(planOccurrenceDiaryAt(frozen, undefined, TUESDAY_THIS_WEEK)).toBe(shown)
    expect(isDiaryFeedMealVisible(frozen, PLAN_ID, undefined, new Date(shown))).toBe(true)
  })

  test('without a frozen stamp, complete jumps off the shown day', () => {
    const shown = planOccurrenceStampWhilePending(pendingPlanMeal, TUESDAY_THIS_WEEK)
    const jumped = planOccurrenceDiaryAt(
      pendingPlanMeal,
      new Set([pendingPlanMeal.id]),
      TUESDAY_THIS_WEEK,
    )
    expect(new Date(jumped).toDateString()).not.toBe(new Date(shown).toDateString())
  })

  test('plan-done cache patch works when assumptions are missing', () => {
    const items = [{ id: pendingPlanMeal.id, recordedAt: pendingPlanMeal.at }]
    const patched = mealListAfterPlanDone(items, pendingPlanMeal.id, {
      done: true,
      recordedAt: TUESDAY_THIS_WEEK.toISOString(),
    })
    expect(patched[0]?.assumptions).toContain(RATION_DIARY_DONE_MARK)
    expect(patched[0]?.recordedAt).toBe(TUESDAY_THIS_WEEK.toISOString())
  })

  test('completed plan meals stay on the occurrence day when a plan start is set', () => {
    const start = new Date(2026, 8, 3, 12, 0, 0)
    const eaten = {
      ...pendingPlanMeal,
      assumptions: [...pendingPlanMeal.assumptions, RATION_DIARY_DONE_MARK],
    }
    const at = planOccurrenceDiaryAt(eaten, undefined, TUESDAY_THIS_WEEK, start)
    expect(new Date(at).getFullYear()).toBe(2026)
    expect(new Date(at).getMonth()).toBe(8)
    expect(new Date(at).getDate()).toBe(4)
    expect(new Date(at).getHours()).toBe(8)
    expect(new Date(at).getMinutes()).toBe(30)
  })

  test('local complete via completedIds still remaps when a plan start is set', () => {
    const start = new Date(2026, 8, 3, 12, 0, 0)
    const completed = new Set([pendingPlanMeal.id])
    const at = planOccurrenceDiaryAt(pendingPlanMeal, completed, TUESDAY_THIS_WEEK, start)
    expect(new Date(at).getDate()).toBe(4)
  })

  test('feed copies without a week plan are not treated as a plan template', () => {
    expect(
      keepsWeeklyPlanOnDiaryDelete({
        id: 'feed',
        assumptions: [FEED_DIARY_SOURCE_MARK],
        fromApi: true,
      }),
    ).toBe(false)
  })

  test('selecting a plan again restores skipped pending diary cards', () => {
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
      const scope = { userId: 'user-1', email: 'plan@example.com' }
      writeSkippedPlanMealIds(scope, new Set(['kefir-apple']), PLAN_ID)
      expect(readSkippedPlanMealIds(scope, PLAN_ID).has('kefir-apple')).toBe(true)
      clearSkippedPlanMealIds(scope, PLAN_ID)
      expect(readSkippedPlanMealIds(scope, PLAN_ID).size).toBe(0)
      const shown = planOccurrenceStampWhilePending(pendingPlanMeal, TUESDAY_THIS_WEEK)
      writeDiaryPlanAtById(scope, { [pendingPlanMeal.id]: shown })
      expect(readDiaryPlanAtById(scope)[pendingPlanMeal.id]).toBe(shown)
      const reloaded = {
        ...pendingPlanMeal,
        at: pendingPlanMeal.at,
        assumptions: [...pendingPlanMeal.assumptions, RATION_DIARY_DONE_MARK],
      }
      expect(
        isDiaryFeedMealVisible(
          { ...reloaded, at: readDiaryPlanAtById(scope)[pendingPlanMeal.id]! },
          PLAN_ID,
          undefined,
          new Date(shown),
        ),
      ).toBe(true)
    } finally {
      Object.defineProperty(globalThis, 'localStorage', {
        configurable: true,
        value: originalStorage,
      })
    }
  })

  test('diary meal start follows the selected plan that owns it', () => {
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
      const scope = { userId: 'user-1', email: 'plan@example.com' }
      writePlanStartDate(scope, PLAN_ID, new Date(2026, 8, 3))
      writePlanStartDate(scope, 'plan_office', new Date(2026, 8, 10))
      const start = diaryPlanStartForMeal(
        pendingPlanMeal,
        scope,
        new Set([PLAN_ID, 'plan_office']),
      )
      expect(start?.getFullYear()).toBe(2026)
      expect(start?.getMonth()).toBe(8)
      expect(start?.getDate()).toBe(3)
      const officeMeal = {
        ...pendingPlanMeal,
        assumptions: [RATION_DIARY_SOURCE_MARK, weekPlanAssumption('plan_office')],
      }
      const officeStart = diaryPlanStartForMeal(
        officeMeal,
        scope,
        new Set([PLAN_ID, 'plan_office']),
      )
      expect(officeStart?.getDate()).toBe(10)
    } finally {
      Object.defineProperty(globalThis, 'localStorage', {
        configurable: true,
        value: originalStorage,
      })
    }
  })

  test('pending meals follow a same-day plan layout reorder', () => {
    const turkey = {
      ...pendingPlanMeal,
      id: 'turkey',
      at: new Date(2026, 8, 1, 8, 30, 0).toISOString(),
    }
    const apple = {
      ...pendingPlanMeal,
      id: 'apple',
      at: new Date(2026, 8, 1, 13, 0, 0).toISOString(),
    }
    const fish = {
      ...pendingPlanMeal,
      id: 'fish',
      at: new Date(2026, 8, 1, 19, 0, 0).toISOString(),
    }
    const planMeals = [turkey, apple, fish]
    const start = new Date(2026, 8, 3, 12, 0, 0)
    const layout = { '2026-09-01': ['apple', 'turkey', 'fish'] }
    const appleAt = planOccurrenceDiaryAtWithLayout(apple, {
      now: TUESDAY_THIS_WEEK,
      planStart: start,
      layout,
      planMeals,
    })
    const turkeyAt = planOccurrenceDiaryAtWithLayout(turkey, {
      now: TUESDAY_THIS_WEEK,
      planStart: start,
      layout,
      planMeals,
    })
    const fishAt = planOccurrenceDiaryAtWithLayout(fish, {
      now: TUESDAY_THIS_WEEK,
      planStart: start,
      layout,
      planMeals,
    })
    expect(new Date(appleAt).getDate()).toBe(4)
    expect(new Date(appleAt).getHours()).toBe(8)
    expect(new Date(appleAt).getMinutes()).toBe(30)
    expect(new Date(turkeyAt).getHours()).toBe(13)
    expect(new Date(fishAt).getHours()).toBe(19)
    expect(appleAt < turkeyAt && turkeyAt < fishAt).toBe(true)
  })

  test('pending meals follow a layout move onto another plan day', () => {
    const turkey = {
      ...pendingPlanMeal,
      id: 'turkey',
      at: new Date(2026, 8, 1, 8, 30, 0).toISOString(),
    }
    const apple = {
      ...pendingPlanMeal,
      id: 'apple',
      at: new Date(2026, 8, 1, 13, 0, 0).toISOString(),
    }
    const start = new Date(2026, 8, 3, 12, 0, 0)
    const appleAt = planOccurrenceDiaryAtWithLayout(apple, {
      now: TUESDAY_THIS_WEEK,
      planStart: start,
      layout: { '2026-09-01': ['turkey'], '2026-09-02': ['apple'] },
      planMeals: [turkey, apple],
    })
    expect(new Date(appleAt).getDate()).toBe(5)
    expect(
      planOccurrenceDiaryAtWithLayout(turkey, {
        now: TUESDAY_THIS_WEEK,
        planStart: start,
        layout: { '2026-09-01': ['turkey'], '2026-09-02': ['apple'] },
        planMeals: [turkey, apple],
      }),
    ).toBe(planOccurrenceDiaryAt(turkey, undefined, TUESDAY_THIS_WEEK, start))
  })

  test('completed plan meals ignore layout and keep their occurrence', () => {
    const turkey = {
      ...pendingPlanMeal,
      id: 'turkey',
      at: new Date(2026, 8, 1, 8, 30, 0).toISOString(),
      assumptions: [...pendingPlanMeal.assumptions, RATION_DIARY_DONE_MARK],
    }
    const apple = {
      ...pendingPlanMeal,
      id: 'apple',
      at: new Date(2026, 8, 1, 13, 0, 0).toISOString(),
    }
    const start = new Date(2026, 8, 3, 12, 0, 0)
    const layout = { '2026-09-01': ['apple', 'turkey'] }
    const planMeals = [turkey, apple]
    const turkeyAt = planOccurrenceDiaryAtWithLayout(turkey, {
      now: TUESDAY_THIS_WEEK,
      planStart: start,
      layout,
      planMeals,
    })
    const appleAt = planOccurrenceDiaryAtWithLayout(apple, {
      now: TUESDAY_THIS_WEEK,
      planStart: start,
      layout,
      planMeals,
    })
    expect(turkeyAt).toBe(planOccurrenceDiaryAt(turkey, undefined, TUESDAY_THIS_WEEK, start))
    expect(new Date(turkeyAt).getHours()).toBe(8)
    expect(new Date(appleAt).getHours()).toBe(8)
    expect(new Date(appleAt).getMinutes()).toBe(30)
  })

  test('frozen diary stamps win over a later plan layout', () => {
    const frozenAt = new Date(2026, 8, 10, 10, 0, 0).toISOString()
    const layout = { '2026-09-02': [pendingPlanMeal.id] }
    expect(
      planOccurrenceDiaryAtWithLayout(pendingPlanMeal, {
        frozenAt,
        now: TUESDAY_THIS_WEEK,
        planStart: new Date(2026, 8, 3, 12, 0, 0),
        layout,
        planMeals: [pendingPlanMeal],
      }),
    ).toBe(frozenAt)
  })

  test('meals missing from the layout keep the occurrence stamp', () => {
    const start = new Date(2026, 8, 3, 12, 0, 0)
    expect(
      planOccurrenceDiaryAtWithLayout(pendingPlanMeal, {
        now: TUESDAY_THIS_WEEK,
        planStart: start,
        layout: { '2026-09-01': ['other-meal'] },
        planMeals: [pendingPlanMeal],
      }),
    ).toBe(planOccurrenceDiaryAt(pendingPlanMeal, undefined, TUESDAY_THIS_WEEK, start))
  })

  test('diary meal plan id follows the selected plan that owns it', () => {
    expect(diaryPlanIdForMeal(pendingPlanMeal, new Set([PLAN_ID, 'plan_office']))).toBe(PLAN_ID)
  })

  test('a diary day shows pending plan meals in board order, not newest-first', () => {
    const turkey = { id: 'turkey' }
    const apple = { id: 'apple' }
    const fish = { id: 'fish' }
    const croissant = { id: 'croissant' }
    const layout = { '2026-09-01': ['apple', 'fish', 'turkey'] }
    const ordered = orderDiaryDayByPlanLayout(
      [turkey, fish, apple, croissant],
      (meal) => planLayoutSlotIndex(meal.id, layout),
    )
    expect(ordered.map((meal) => meal.id)).toEqual(['apple', 'fish', 'turkey', 'croissant'])
  })

  test('completed diary cards stay put while pending plan meals follow the board', () => {
    const turkey = { id: 'turkey', pinned: true }
    const apple = { id: 'apple', pinned: false }
    const fish = { id: 'fish', pinned: false }
    const layout = { '2026-09-01': ['apple', 'fish', 'turkey'] }
    const ordered = orderDiaryDayByPlanLayout(
      [turkey, fish, apple],
      (meal) => (meal.pinned ? null : planLayoutSlotIndex(meal.id, layout)),
    )
    expect(ordered.map((meal) => meal.id)).toEqual(['turkey', 'apple', 'fish'])
  })
})
