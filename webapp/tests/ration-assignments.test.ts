import { describe, expect, test } from 'bun:test'

import { RATION_DIARY_SOURCE_MARK, rationPlanAssumption } from '../src/features/diary/ration-import'
import { FEED_DIARY_SOURCE_MARK } from '../src/features/diary/feed-import'
import {
  assignedRationOnDay,
  plannedMealIdsOnDay,
  rationDayPlanState,
  rationIdsUsedInDiary,
  rationIdsUsedOnDay,
  rationMealCreateDrafts,
  rationPlanWeekDays,
  weekPlanOptions,
} from '../src/features/mentor/ration-assignments'
import { SAMPLE_RATIONS } from './sample-ration'

describe('weekly plan days', () => {
  test('lists Monday–Sunday of the local week with dates', () => {
    const saturday = new Date(2026, 7, 22, 18, 0, 0)
    const days = rationPlanWeekDays(saturday)
    expect(days.map((day) => day.short)).toEqual([
      'День 1',
      'День 2',
      'День 3',
      'День 4',
      'День 5',
      'День 6',
      'День 7',
    ])
    expect(days.map((day) => day.dayKey)).toEqual([
      '2026-08-17',
      '2026-08-18',
      '2026-08-19',
      '2026-08-20',
      '2026-08-21',
      '2026-08-22',
      '2026-08-23',
    ])
    expect(days[5]).toMatchObject({ short: 'День 6', isToday: true })
    expect(days[0]!.isToday).toBe(false)
  })

  test('stamps drafts onto the chosen weekday, not today', () => {
    const ration = SAMPLE_RATIONS[0]!
    const monday = new Date(2026, 7, 17, 12, 0, 0)
    const drafts = rationMealCreateDrafts(ration, monday)
    expect(drafts[0]?.clientKey).toMatch(/^rp:sample-ration-01:2026-08-17:0:/)
    const recorded = new Date(drafts[0]!.recordedAt!)
    expect(recorded.getFullYear()).toBe(2026)
    expect(recorded.getMonth()).toBe(7)
    expect(recorded.getDate()).toBe(17)
    expect(recorded.getHours()).toBe(8)
  })

  test('re-adding after the diary day was cleared still marks the planner as filled', () => {
    const ration = SAMPLE_RATIONS[0]!
    const saturday = new Date(2026, 7, 22, 12, 0, 0)
    expect(rationDayPlanState([ration], [], saturday, ration.id)).toEqual({ kind: 'free' })
    const first = rationMealCreateDrafts(ration, saturday)
    const second = rationMealCreateDrafts(ration, saturday)
    expect(new Set(first.map((draft) => draft.clientKey)).size).toBe(first.length)
    expect(first.map((draft) => draft.clientKey)).not.toEqual(second.map((draft) => draft.clientKey))
    expect(first.every((draft) => draft.assumptions?.includes(`Рацион:${ration.id}`))).toBe(true)
    const afterDeleteAndAdd = second.map((draft, index) => ({
      id: `again-${index}`,
      title: `${draft.title} · правка`,
      assumptions: draft.assumptions,
      recordedAt: draft.recordedAt!,
    }))
    expect(rationDayPlanState([ration], afterDeleteAndAdd, saturday, ration.id)).toEqual({
      kind: 'same',
      rationId: ration.id,
      title: ration.title,
    })
  })

  test('same day can occupy several weekdays while another day replaces a slot', () => {
    const first = SAMPLE_RATIONS[0]!
    const second = SAMPLE_RATIONS[1]!
    const monday = new Date(2026, 7, 17, 12, 0, 0)
    const tuesday = new Date(2026, 7, 18, 12, 0, 0)
    const mondayMeals = first.meals.map((meal, index) => ({
      id: `mon-${index}`,
      title: meal.title,
      assumptions: [RATION_DIARY_SOURCE_MARK],
      recordedAt: new Date(2026, 7, 17, 8 + index, 0, 0).toISOString(),
    }))
    const ownSnack = {
      id: 'own-1',
      title: 'Мой перекус',
      recordedAt: new Date(2026, 7, 17, 16, 0, 0).toISOString(),
    }
    expect(assignedRationOnDay([first, second], mondayMeals, monday)?.id).toBe(first.id)
    expect(assignedRationOnDay([first, second], mondayMeals, tuesday)).toBeNull()
    expect(rationDayPlanState([first, second], mondayMeals, monday, first.id)).toEqual({
      kind: 'same',
      rationId: first.id,
      title: first.title,
    })
    expect(rationDayPlanState([first, second], mondayMeals, monday, second.id)).toEqual({
      kind: 'replace',
      rationId: first.id,
      title: first.title,
    })
    expect(rationDayPlanState([first, second], mondayMeals, tuesday, first.id)).toEqual({
      kind: 'free',
    })
    expect(plannedMealIdsOnDay([...mondayMeals, ownSnack], monday)).toEqual(
      mondayMeals.map((meal) => meal.id),
    )
    const feedMeal = {
      id: 'feed-1',
      title: first.meals[0]!.title,
      assumptions: [FEED_DIARY_SOURCE_MARK],
      recordedAt: new Date(2026, 7, 17, 12, 0, 0).toISOString(),
    }
    expect(plannedMealIdsOnDay([...mondayMeals, ownSnack, feedMeal], monday)).toEqual(
      mondayMeals.map((meal) => meal.id),
    )
  })
})

describe('days already in the diary', () => {
  test('marks a day used only when every meal title is on that local day', () => {
    const ration = SAMPLE_RATIONS[0]!
    const now = new Date(2026, 7, 22, 12, 0, 0)
    const todayMeals = ration.meals.map((meal, index) => ({
      title: meal.title,
      recordedAt: new Date(2026, 7, 22, 8 + index, 0, 0).toISOString(),
    }))
    expect([...rationIdsUsedOnDay([ration], todayMeals, now)]).toEqual([ration.id])
    expect(
      rationIdsUsedOnDay([ration], todayMeals.slice(0, 1), now).has(ration.id),
    ).toBe(false)
    expect(
      rationIdsUsedOnDay(
        [ration],
        [{ title: ration.meals[0]!.title, recordedAt: new Date(2026, 7, 21, 12, 0, 0).toISOString() }],
        now,
      ).has(ration.id),
    ).toBe(false)
  })

  test('marks a day used when any stamped meal is still in the diary', () => {
    const ration = SAMPLE_RATIONS[0]!
    const other = SAMPLE_RATIONS[1]!
    expect(
      [...rationIdsUsedInDiary([
        {
          assumptions: [RATION_DIARY_SOURCE_MARK, rationPlanAssumption(ration.id)],
        },
        {
          assumptions: [RATION_DIARY_SOURCE_MARK, rationPlanAssumption(ration.id)],
        },
        { assumptions: [FEED_DIARY_SOURCE_MARK] },
        { title: other.meals[0]!.title },
      ])],
    ).toEqual([ration.id])
    expect(rationIdsUsedInDiary([]).size).toBe(0)
  })

  test('scopes used days to the chosen week plan and keeps unstamped meals on the current week', () => {
    const ration = SAMPLE_RATIONS[0]!
    const now = new Date(2026, 7, 22, 12, 0, 0)
    const currentId = weekPlanOptions(now)[0]!.id
    const otherId = 'mine_other'
    expect(currentId).toBe('week:2026-08-17')
    expect(
      rationIdsUsedInDiary(
        [
          {
            assumptions: [RATION_DIARY_SOURCE_MARK, rationPlanAssumption(ration.id)],
          },
        ],
        { id: currentId, fallbackId: currentId },
      ).has(ration.id),
    ).toBe(true)
    expect(
      rationIdsUsedInDiary(
        [
          {
            assumptions: [
              RATION_DIARY_SOURCE_MARK,
              rationPlanAssumption(ration.id),
              `План:${otherId}`,
            ],
          },
        ],
        { id: currentId, fallbackId: currentId },
      ).has(ration.id),
    ).toBe(false)
  })
})

describe('plan diary drafts', () => {
  test('stamps each meal on the local day with an idempotency key', () => {
    const ration = SAMPLE_RATIONS[0]!
    const now = new Date(2026, 7, 22, 12, 0, 0)
    const drafts = rationMealCreateDrafts(ration, now)
    expect(drafts).toHaveLength(ration.meals.length)
    expect(drafts[0]).toMatchObject({
      title: ration.meals[0]!.title,
      meal: ration.meals[0]!.slot,
      source: 'manual',
      assumptions: ['Добавлено из рациона', 'Рацион:sample-ration-01', 'План:week:2026-08-17'],
    })
    const recorded = new Date(drafts[0]!.recordedAt!)
    expect(recorded.getHours()).toBe(8)
    expect(recorded.getMinutes()).toBe(30)
    expect(drafts.find((draft) => draft.meal === 'Обед')?.category).toBe('Мясо')
  })
})
