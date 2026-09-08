import { describe, expect, test } from 'bun:test'

import { FEED_DIARY_SOURCE_MARK } from '../src/features/diary/feed-import'
import { writePlanStartDate } from '../src/platform/plan-start'
import {
  clearSkippedPlanMealIds,
  diaryPlanStartForMeal,
  keepsWeeklyPlanOnDiaryDelete,
  mealListAfterPlanDone,
  planOccurrenceDiaryAt,
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
})
