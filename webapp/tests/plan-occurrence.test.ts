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
  pendingDiarySlotKey,
  planLayoutSlotIndex,
  openPlanDiaryCards,
  openPlanDiarySourceId,
  planOccurrenceDiaryAt,
  planOccurrenceDiaryAtWithLayout,
  planOccurrenceStampWhilePending,
  readSkippedPlanMealIds,
  writeSkippedPlanMealIds,
} from '../src/features/diary/plan-occurrence'
import { readDiaryPlanAtById, writeDiaryPlanAtById } from '../src/features/diary/ration-done'
import { diaryPlanSourceAssumption } from '../src/features/diary/diary-plan-import'
import { rationDiaryLogAssumption } from '../src/features/diary/ration-import'
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

  test('day 1 of a ration lands on the selected start date', () => {
    const start = new Date(2026, 8, 3, 12, 0, 0)
    const at = planOccurrenceDiaryAt(pendingPlanMeal, undefined, TUESDAY_THIS_WEEK, start)
    expect(new Date(at).getFullYear()).toBe(2026)
    expect(new Date(at).getMonth()).toBe(8)
    expect(new Date(at).getDate()).toBe(3)
    expect(new Date(at).getHours()).toBe(8)
    expect(new Date(at).getMinutes()).toBe(30)
    expect(
      isDiaryFeedMealVisible(
        { ...pendingPlanMeal, at },
        PLAN_ID,
        undefined,
        start,
      ),
    ).toBe(true)
  })

  test('day 8 stays a week after the start instead of joining day 1', () => {
    const start = new Date(2026, 9, 12, 9, 0, 0)
    const day1At = new Date(2026, 9, 12, 8, 30, 0).toISOString()
    const day8At = new Date(2026, 9, 19, 8, 30, 0).toISOString()
    const day1 = { ...pendingPlanMeal, id: 'day-1', title: 'Первый прием', at: day1At }
    const day8 = { ...pendingPlanMeal, id: 'day-8', title: '8', at: day8At }
    const planMeals = [day1, day8]
    const first = planOccurrenceDiaryAtWithLayout(day1, {
      now: start,
      planStart: start,
      planMeals,
    })
    const last = planOccurrenceDiaryAtWithLayout(day8, {
      now: start,
      planStart: start,
      planMeals,
    })
    expect(new Date(first).getDate()).toBe(12)
    expect(new Date(last).getDate()).toBe(19)
    expect(new Date(last).getMonth()).toBe(9)
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

  test('completed plan meals stay on the day they were eaten when a plan starts again', () => {
    const start = new Date(2026, 9, 5, 12, 0, 0)
    const eaten = {
      ...pendingPlanMeal,
      at: new Date(2026, 9, 1, 8, 30, 0).toISOString(),
      assumptions: [...pendingPlanMeal.assumptions, RATION_DIARY_DONE_MARK],
    }
    const now = new Date(2026, 9, 8, 12, 0, 0)
    const at = planOccurrenceDiaryAt(eaten, undefined, now, start)
    expect(at).toBe(eaten.at)
    const opened = openPlanDiaryCards([eaten], {
      now,
      selectedPlanIds: new Set([PLAN_ID]),
      planStartFor: () => start,
    })
    expect(opened).toHaveLength(0)
  })

  test('a completion on the assigned day does not open a second card', () => {
    const start = new Date(2026, 9, 5, 12, 0, 0)
    const eaten = {
      ...pendingPlanMeal,
      at: new Date(2026, 9, 8, 8, 30, 0).toISOString(),
      assumptions: [...pendingPlanMeal.assumptions, RATION_DIARY_DONE_MARK],
    }
    const opened = openPlanDiaryCards([eaten], {
      now: new Date(2026, 9, 8, 12, 0, 0),
      selectedPlanIds: new Set([PLAN_ID]),
      planStartFor: () => start,
    })
    expect(opened).toHaveLength(0)
  })

  test('an earlier completion stays history when this assignment is already logged', () => {
    const start = new Date(2026, 9, 5, 12, 0, 0)
    const eaten = {
      ...pendingPlanMeal,
      at: new Date(2026, 9, 1, 8, 30, 0).toISOString(),
      assumptions: [...pendingPlanMeal.assumptions, RATION_DIARY_DONE_MARK],
    }
    const todayCopy = {
      ...eaten,
      id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
      at: new Date(2026, 9, 8, 8, 30, 0).toISOString(),
      assumptions: [...eaten.assumptions, diaryPlanSourceAssumption(eaten.id)],
    }
    const opened = openPlanDiaryCards([eaten, todayCopy], {
      now: new Date(2026, 9, 8, 12, 0, 0),
      selectedPlanIds: new Set([PLAN_ID]),
      planStartFor: () => start,
    })
    expect(opened).toHaveLength(0)
  })

  test('a diary completion stays out of the ration board', () => {
    const start = new Date(2026, 9, 5, 12, 0, 0)
    const eaten = {
      ...pendingPlanMeal,
      at: new Date(2026, 9, 1, 8, 30, 0).toISOString(),
      assumptions: [...pendingPlanMeal.assumptions, RATION_DIARY_DONE_MARK],
    }
    const log = {
      ...eaten,
      id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
      at: new Date(2026, 9, 8, 8, 30, 0).toISOString(),
      assumptions: [...eaten.assumptions, rationDiaryLogAssumption(eaten.id)],
    }
    const opened = openPlanDiaryCards([eaten, log], {
      now: new Date(2026, 9, 8, 12, 0, 0),
      selectedPlanIds: new Set([PLAN_ID]),
      planStartFor: () => start,
    })
    expect(opened).toHaveLength(0)
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
    expect(new Date(
      planOccurrenceDiaryAtWithLayout(turkey, {
        now: TUESDAY_THIS_WEEK,
        planStart: start,
        layout: { '2026-09-01': ['turkey'], '2026-09-02': ['apple'] },
        planMeals: [turkey, apple],
      }),
    ).getDate()).toBe(4)
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

  test('a stale diary stamp does not keep a pending meal on the old plan', () => {
    const frozenAt = new Date(2026, 8, 28, 10, 0, 0).toISOString()
    const start = new Date(2026, 9, 5, 12, 0, 0)
    const now = new Date(2026, 9, 5, 12, 0, 0)
    const at = planOccurrenceDiaryAtWithLayout(pendingPlanMeal, {
      frozenAt,
      now,
      planStart: start,
      planMeals: [pendingPlanMeal],
    })
    expect(new Date(at).getMonth()).toBe(9)
    expect(new Date(at).getDate()).toBe(6)
  })

  test('completed meals keep the eaten day when the ration is started again', () => {
    const eatenAt = new Date(2026, 8, 28, 10, 0, 0).toISOString()
    const done = {
      ...pendingPlanMeal,
      at: eatenAt,
      assumptions: [...pendingPlanMeal.assumptions, RATION_DIARY_DONE_MARK],
    }
    const start = new Date(2026, 9, 5, 12, 0, 0)
    expect(
      planOccurrenceDiaryAtWithLayout(done, {
        frozenAt: eatenAt,
        now: start,
        planStart: start,
        layout: { '2026-10-05': [done.id] },
        planMeals: [done],
      }),
    ).toBe(eatenAt)
    expect(
      isDiaryFeedMealVisible({ ...done, at: eatenAt }, PLAN_ID, undefined, start),
    ).toBe(true)
    expect(
      isDiaryFeedMealVisible({ ...pendingPlanMeal, at: eatenAt }, PLAN_ID, undefined, start),
    ).toBe(false)
  })

  test('meals missing from the layout keep the occurrence stamp', () => {
    const start = new Date(2026, 8, 3, 12, 0, 0)
    expect(new Date(
      planOccurrenceDiaryAtWithLayout(pendingPlanMeal, {
        now: TUESDAY_THIS_WEEK,
        planStart: start,
        layout: { '2026-09-01': ['other-meal'] },
        planMeals: [pendingPlanMeal],
      }),
    ).getDate()).toBe(4)
  })

  test('diary meal plan id follows the selected plan that owns it', () => {
    expect(diaryPlanIdForMeal(pendingPlanMeal, new Set([PLAN_ID, 'plan_office']))).toBe(PLAN_ID)
  })

  test('a meal stamped on an older week follows the current selected week plan', () => {
    const now = new Date(2026, 9, 14, 12, 0, 0)
    const croissant = {
      ...pendingPlanMeal,
      id: 'croissant',
      title: 'Горячий круассан с ветчиной и сыром',
      at: new Date(2026, 8, 13, 18, 30, 0).toISOString(),
      assumptions: [RATION_DIARY_SOURCE_MARK, weekPlanAssumption('week:2026-09-07')],
    }
    const selected = new Set(['week:2026-09-07', 'week:2026-10-12'])
    expect(diaryPlanIdForMeal(croissant, selected, now)).toBe('week:2026-10-12')
    const shown = planOccurrenceDiaryAtWithLayout(croissant, {
      now,
      planStart: now,
      layout: { '2026-10-12': ['croissant'] },
      planMeals: [croissant],
    })
    expect(new Date(shown).getFullYear()).toBe(2026)
    expect(new Date(shown).getMonth()).toBe(9)
    expect(new Date(shown).getDate()).toBe(14)
    expect(isDiaryFeedMealVisible({ ...croissant, at: shown }, 'week:2026-10-12', undefined, now)).toBe(
      true,
    )
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

  test('meals the user added stay after the plan even when their time falls in between', () => {
    const done = { id: 'turkey', own: false }
    const photo = { id: 'photo', own: true }
    const later = { id: 'snack', own: true }
    const apple = { id: 'apple', own: false }
    const fish = { id: 'fish', own: false }
    const layout = { '2026-09-01': ['apple', 'fish', 'turkey'] }
    const ordered = orderDiaryDayByPlanLayout(
      [done, photo, fish, apple, later],
      (meal) =>
        meal.own || meal.id === 'turkey' ? null : planLayoutSlotIndex(meal.id, layout),
      (meal) => meal.own,
    )
    expect(ordered.map((meal) => meal.id)).toEqual(['turkey', 'apple', 'fish', 'photo', 'snack'])
  })

  test('board day 1 lands on the start date even when the meal was saved on an older weekday', () => {
    const lunch = {
      ...pendingPlanMeal,
      id: 'lunch',
      title: 'День один обед',
      at: new Date(2026, 9, 4, 23, 0, 0).toISOString(),
    }
    const breakfast = {
      ...pendingPlanMeal,
      id: 'breakfast',
      title: 'День один завтрак',
      at: new Date(2026, 9, 4, 18, 30, 0).toISOString(),
    }
    const start = new Date(2026, 9, 14, 12, 0, 0)
    const layout = {
      '2026-09-07': ['older'],
      '2026-10-12': ['lunch'],
      '2026-10-13': ['breakfast'],
    }
    const planMeals = [lunch, breakfast]
    const lunchAt = planOccurrenceDiaryAtWithLayout(lunch, {
      now: start,
      planStart: start,
      layout,
      planMeals,
    })
    const breakfastAt = planOccurrenceDiaryAtWithLayout(breakfast, {
      now: start,
      planStart: start,
      layout,
      planMeals,
    })
    expect(new Date(lunchAt).getFullYear()).toBe(2026)
    expect(new Date(lunchAt).getMonth()).toBe(9)
    expect(new Date(lunchAt).getDate()).toBe(14)
    expect(new Date(breakfastAt).getDate()).toBe(15)
  })

  test('without a saved layout, plans stay in selection order and an added meal stays last', () => {
    const own = { id: 'own', plan: -1, at: '2026-10-14T10:00:00.000Z' }
    const ordered = orderDiaryDayByPlanLayout(
      [
        own,
        { id: 'second-late', plan: 1, at: '2026-10-14T15:00:00.000Z' },
        { id: 'first-late', plan: 0, at: '2026-10-14T12:00:00.000Z' },
        { id: 'second-early', plan: 1, at: '2026-10-14T08:00:00.000Z' },
        { id: 'first-early', plan: 0, at: '2026-10-14T07:00:00.000Z' },
      ],
      (meal) => (meal.id === 'own' ? null : pendingDiarySlotKey(null, meal.at)),
      (meal) => meal.id === 'own',
      (meal) => meal.plan,
    )
    expect(ordered.map((meal) => meal.id)).toEqual([
      'first-early',
      'first-late',
      'second-early',
      'second-late',
      'own',
    ])
  })

  test('a completed ration meal moves to the end and returns when cleared', () => {
    const meals = [
      { id: 'done-sticks', plan: 1, at: '2026-10-14T12:45:00.000Z', done: true },
      { id: 'spaghetti', plan: 1, at: '2026-10-14T12:30:00.000Z', done: false },
      { id: 'tuna', plan: 1, at: '2026-10-14T06:00:00.000Z', done: false },
      { id: 'croissant', plan: 0, at: '2026-10-14T01:30:00.000Z', done: false },
      { id: 'own', plan: -1, at: '2026-10-14T12:40:00.000Z', done: false },
    ]
    const slot = (meal: (typeof meals)[number]) =>
      meal.id === 'own'
        ? null
        : pendingDiarySlotKey(
            null,
            meal.id === 'done-sticks' ? '2026-10-14T01:30:00.000Z' : meal.at,
          )
    const done = orderDiaryDayByPlanLayout(
      meals,
      slot,
      (meal) => meal.id === 'own',
      (meal) => meal.plan,
      (meal) => meal.done,
    )
    expect(done.map((meal) => meal.id)).toEqual([
      'croissant',
      'tuna',
      'spaghetti',
      'done-sticks',
      'own',
    ])
    const restored = orderDiaryDayByPlanLayout(
      meals.map((meal) => ({ ...meal, done: false })),
      slot,
      (meal) => meal.id === 'own',
      (meal) => meal.plan,
      (meal) => meal.done,
    )
    expect(restored.map((meal) => meal.id)).toEqual([
      'croissant',
      'done-sticks',
      'tuna',
      'spaghetti',
      'own',
    ])
  })

  test('a saved layout slot stays ahead of the meal clock', () => {
    expect(pendingDiarySlotKey(1, '2026-10-14T18:00:00.000Z')).toBe(1)
  })

  test('two selected plans on the same day stay one after another in selection order', () => {
    const ordered = orderDiaryDayByPlanLayout(
      [
        { id: 'second-first', plan: 1 },
        { id: 'first-second', plan: 0 },
        { id: 'first-first', plan: 0 },
        { id: 'second-second', plan: 1 },
      ],
      (meal) => (meal.id.endsWith('first') ? 0 : 1),
      undefined,
      (meal) => meal.plan,
    )
    expect(ordered.map((meal) => meal.id)).toEqual([
      'first-first',
      'first-second',
      'second-first',
      'second-second',
    ])
  })

  test('the current board day lands on the plan start while older weeks stay history', () => {
    const olderMonday = {
      ...pendingPlanMeal,
      id: 'older-monday',
      title: 'Старый понедельник',
      at: new Date(2026, 7, 31, 8, 30, 0).toISOString(),
    }
    const croissant = {
      ...pendingPlanMeal,
      id: 'croissant',
      title: 'Горячий круассан с ветчиной и сыром',
      at: new Date(2026, 9, 12, 8, 30, 0).toISOString(),
    }
    const turkey = {
      ...pendingPlanMeal,
      id: 'turkey',
      title: 'Индейка, булгур и овощи',
      at: new Date(2026, 9, 13, 13, 0, 0).toISOString(),
    }
    const start = new Date(2026, 9, 14, 12, 0, 0)
    const planMeals = [olderMonday, croissant, turkey]
    const today = planOccurrenceDiaryAt(croissant, undefined, start, start, planMeals)
    const tomorrow = planOccurrenceDiaryAt(turkey, undefined, start, start, planMeals)
    const history = planOccurrenceDiaryAt(olderMonday, undefined, start, start, planMeals)
    expect(new Date(today).getFullYear()).toBe(2026)
    expect(new Date(today).getMonth()).toBe(9)
    expect(new Date(today).getDate()).toBe(14)
    expect(new Date(tomorrow).getDate()).toBe(15)
    expect(new Date(history).getTime()).toBeLessThan(start.getTime())
    expect(
      isDiaryFeedMealVisible(
        { ...croissant, at: today },
        PLAN_ID,
        undefined,
        start,
      ),
    ).toBe(true)
  })

  test('a meal the person already ate does not take the ration day', () => {
    const start = new Date(2026, 9, 14, 12, 0, 0)
    const croissant = {
      ...pendingPlanMeal,
      id: 'croissant',
      title: 'Горячий круассан с ветчиной и сыром',
      at: new Date(2026, 8, 14, 8, 30, 0).toISOString(),
    }
    const eaten = {
      id: 'oatmeal',
      title: 'Овсянка с ягодами',
      at: new Date(2026, 9, 12, 9, 0, 0).toISOString(),
      assumptions: ['Оценка, не весы'],
      fromApi: true as const,
    }
    const shown = planOccurrenceDiaryAt(croissant, undefined, start, start, [croissant, eaten])
    expect(new Date(shown).getDate()).toBe(14)
    expect(planOccurrenceDiaryAt(eaten, undefined, start, start, [croissant, eaten])).toBe(eaten.at)
  })
})
