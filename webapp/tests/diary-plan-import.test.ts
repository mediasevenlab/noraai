import { describe, expect, test } from 'bun:test'

import {
  DIARY_NEW_PLAN_ID,
  diaryCreatePlanFromMeals,
  diaryDefaultPlanId,
  diaryMealAlreadyInWeekPlan,
  diaryMealCanCopyToPlan,
  diaryMealCreatePlanDraft,
  diaryMealOnPlanDay,
  diaryMealsFreshForPlanDay,
  diaryMealStampOnDay,
  diaryNewPlanDayCount,
  diaryNewPlanDays,
  diaryNewPlanTitle,
  diaryPlanCopiesOnDay,
  diaryPlanDayOccupancy,
  diaryPlanDraftClientKey,
  diaryPlanPickerItems,
  diaryPlanSourceAssumption,
  diaryPlanSourceId,
  diaryWeekPlanOptions,
  isDiaryNewPlanId,
} from '../src/features/diary/diary-plan-import'
import {
  currentWeekPlanStampId,
  DIARY_PLAN_SOURCE_PREFIX,
  isRationImportedMeal,
  isRationPlanPending,
  RATION_DIARY_DONE_MARK,
  RATION_DIARY_SOURCE_MARK,
  visibleMealAssumptions,
  weekPlanAssumption,
} from '../src/features/diary/ration-import'

const SOURCE = {
  id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  title: 'Рыба с овощным рагу',
  ingredients: 'Треска, цукини, перец',
  category: 'Рыба' as const,
  meal: 'Ужин' as const,
  kcal: 420,
  protein: 38,
  fat: 12,
  carbs: 28,
  portionItems: [{ label: 'Треска ~160 г', kcal: 220, protein: 32, fat: 4, carbs: 0 }],
  micronutrients: [],
  assumptions: ['Вес по фото'],
}

describe('diary meals copied into a weekly plan', () => {
  test('stamps a planned copy for the chosen plan without replacing a ration', async () => {
    const planId = 'week:2026-08-31'
    const now = new Date(2026, 8, 3, 19, 30, 0)
    const draft = await diaryMealCreatePlanDraft(SOURCE, planId, now)

    expect(draft.title).toBe(SOURCE.title)
    expect(draft.ingredients).toBe(SOURCE.ingredients)
    expect(draft.meal).toBe('Ужин')
    expect(draft.recordedAt).toBe(now.toISOString())
    expect(draft.portionItems).toEqual(SOURCE.portionItems)
    expect(draft.assumptions).toEqual([
      RATION_DIARY_SOURCE_MARK,
      weekPlanAssumption(planId),
      diaryPlanSourceAssumption(SOURCE.id),
      'Вес по фото',
    ])
    expect(draft.clientKey).toBe(diaryPlanDraftClientKey(SOURCE.id, planId, now))
    expect(draft.clientKey!.length).toBeLessThanOrEqual(64)
    expect(isRationImportedMeal({ assumptions: draft.assumptions, fromApi: true })).toBe(true)
    expect(isRationPlanPending({ assumptions: draft.assumptions, fromApi: true })).toBe(true)
    expect(
      visibleMealAssumptions([
        RATION_DIARY_SOURCE_MARK,
        weekPlanAssumption(planId),
        `${DIARY_PLAN_SOURCE_PREFIX}${SOURCE.id}`,
        'Вес по фото',
      ]),
    ).toEqual(['Вес по фото'])
  })

  test('retries use one durable key per source, plan and day slot', async () => {
    const day = new Date(2026, 8, 3, 19)
    const first = await diaryMealCreatePlanDraft(SOURCE, 'plan_one', day)
    const nextWeek = await diaryMealCreatePlanDraft(SOURCE, 'plan_one', new Date(2026, 8, 10, 8))
    const copy = await diaryMealCreatePlanDraft(
      { ...SOURCE, id: 'copy', assumptions: [diaryPlanSourceAssumption(SOURCE.id)] },
      'plan_one',
      day,
    )
    expect(first.clientKey).toBe(nextWeek.clientKey)
    expect(copy.clientKey).toBe(first.clientKey)
    expect((await diaryMealCreatePlanDraft(SOURCE, 'plan_two', day)).clientKey).not.toBe(first.clientKey)
    expect((await diaryMealCreatePlanDraft(SOURCE, 'plan_one', new Date(2026, 8, 4))).clientKey).not.toBe(
      first.clientKey,
    )
    const samePrefix = { ...SOURCE, id: 'aaaaaaaa-aaaa-4aaa-8aaa-bbbbbbbbbbbb' }
    expect((await diaryMealCreatePlanDraft(samePrefix, 'plan_one', day)).clientKey).not.toBe(first.clientKey)
  })

  test('finds an existing copy on the same plan slot after the calendar week changes', () => {
    const existing = {
      recordedAt: new Date(2026, 8, 3, 19).toISOString(),
      assumptions: [weekPlanAssumption('plan_one'), diaryPlanSourceAssumption(SOURCE.id)],
    }
    expect(diaryMealOnPlanDay([existing], SOURCE.id, new Date(2026, 8, 3), 'plan_one', 'week:2026-09-07')).toBe(
      true,
    )
    expect(diaryMealOnPlanDay([existing], SOURCE.id, new Date(2026, 8, 10), 'plan_one', 'week:2026-09-07')).toBe(
      true,
    )
    expect(diaryMealOnPlanDay([existing], SOURCE.id, new Date(2026, 8, 4), 'plan_one', 'week:2026-09-07')).toBe(
      false,
    )
  })

  test('keeps the source clock on the chosen weekday and refuses a duplicate on that plan day', () => {
    const wednesday = new Date(2026, 8, 2, 12, 0, 0)
    const sourceAt = new Date(2026, 8, 1, 19, 30, 0)
    const stamped = diaryMealStampOnDay(wednesday, sourceAt)
    expect(stamped.getFullYear()).toBe(2026)
    expect(stamped.getMonth()).toBe(8)
    expect(stamped.getDate()).toBe(2)
    expect(stamped.getHours()).toBe(19)
    expect(stamped.getMinutes()).toBe(30)

    const planId = currentWeekPlanStampId(wednesday)
    const copied = {
      at: stamped.toISOString(),
      assumptions: [
        RATION_DIARY_SOURCE_MARK,
        weekPlanAssumption(planId),
        diaryPlanSourceAssumption(SOURCE.id),
      ],
    }
    expect(diaryMealOnPlanDay([copied], SOURCE.id, wednesday, planId, planId)).toBe(true)
    expect(
      diaryMealOnPlanDay([copied], SOURCE.id, new Date(2026, 8, 3, 12, 0, 0), planId, planId),
    ).toBe(false)
    expect(
      diaryMealOnPlanDay([copied], SOURCE.id, wednesday, 'plan_other', planId),
    ).toBe(false)
    expect(diaryMealOnPlanDay([copied], 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', wednesday, planId, planId)).toBe(
      false,
    )

    const originalOnWednesday = {
      id: SOURCE.id,
      at: stamped.toISOString(),
      assumptions: ['Вес по фото'],
    }
    expect(diaryMealOnPlanDay([originalOnWednesday], SOURCE.id, wednesday, planId, planId)).toBe(false)
    expect(
      diaryPlanCopiesOnDay([originalOnWednesday], SOURCE.id, wednesday, planId, planId),
    ).toEqual([])

    const copyWithId = {
      id: 'plan-copy-1',
      at: stamped.toISOString(),
      assumptions: copied.assumptions,
    }
    expect(diaryPlanCopiesOnDay([copyWithId], SOURCE.id, wednesday, planId, planId).map((meal) => meal.id)).toEqual([
      'plan-copy-1',
    ])
    expect(diaryMealOnPlanDay([copyWithId], SOURCE.id, wednesday, planId, planId)).toBe(true)

    const copyOfCopy = {
      id: 'copy-2',
      assumptions: [diaryPlanSourceAssumption(SOURCE.id)],
    }
    expect(diaryPlanSourceId(copyOfCopy)).toBe(SOURCE.id)
    expect(diaryPlanSourceId({ id: SOURCE.id })).toBe(SOURCE.id)
  })

  test('lists the current week first, then authored plans, and prefers the selected plan', () => {
    const now = new Date(2026, 8, 2, 9, 0, 0)
    const authored = [{ id: 'plan_office', title: 'Офис без срывов' }]
    const options = diaryWeekPlanOptions(authored, now)
    expect(options[0]).toEqual({
      id: currentWeekPlanStampId(now),
      title: 'План на неделю',
    })
    expect(options[1]).toEqual({ id: 'plan_office', title: 'Офис без срывов' })
    expect(diaryDefaultPlanId(options, 'plan_office')).toBe('plan_office')
    expect(diaryDefaultPlanId(options, 'missing')).toBe(currentWeekPlanStampId(now))
  })

  test('bulk copy skips meals already standing on that plan day', () => {
    const day = new Date(2026, 8, 3, 12, 0, 0)
    const planId = 'plan_office'
    const other = {
      id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
      title: 'Омлет',
      assumptions: [] as string[],
    }
    const existing = [
      {
        recordedAt: new Date(2026, 8, 3, 9).toISOString(),
        assumptions: [weekPlanAssumption(planId), diaryPlanSourceAssumption(SOURCE.id)],
      },
    ]
    const occupancy = diaryPlanDayOccupancy(
      [SOURCE, other],
      existing,
      day,
      planId,
      'week:2026-08-31',
    )
    expect(occupancy).toEqual({ total: 2, already: 1, fresh: 1 })
    expect(
      diaryMealsFreshForPlanDay([SOURCE, other], existing, day, planId, 'week:2026-08-31').map(
        (meal) => meal.id,
      ),
    ).toEqual([other.id])
    expect(
      diaryMealsFreshForPlanDay([SOURCE], existing, day, planId, 'week:2026-08-31'),
    ).toEqual([])
  })

  test('refuses pending meals and copies from a plan back into that same plan', () => {
    const day = new Date(2026, 8, 3, 12, 0, 0)
    const planId = 'plan_office'
    const otherPlan = 'plan_home'
    const pendingFromPlan = {
      id: 'pending-office',
      assumptions: [
        RATION_DIARY_SOURCE_MARK,
        weekPlanAssumption(planId),
        diaryPlanSourceAssumption(SOURCE.id),
      ],
    }
    const pendingFromOther = {
      id: 'pending-home',
      assumptions: [
        RATION_DIARY_SOURCE_MARK,
        weekPlanAssumption(otherPlan),
        diaryPlanSourceAssumption('cccccccc-cccc-4ccc-8ccc-cccccccccccc'),
      ],
    }
    const doneFromPlan = {
      id: 'done-office',
      assumptions: [
        RATION_DIARY_SOURCE_MARK,
        RATION_DIARY_DONE_MARK,
        weekPlanAssumption(planId),
        diaryPlanSourceAssumption(SOURCE.id),
      ],
    }

    expect(diaryMealCanCopyToPlan(pendingFromPlan)).toBe(false)
    expect(diaryMealCanCopyToPlan(pendingFromOther)).toBe(false)
    expect(diaryMealCanCopyToPlan(doneFromPlan)).toBe(true)
    expect(diaryMealCanCopyToPlan(SOURCE)).toBe(true)

    expect(diaryMealAlreadyInWeekPlan(pendingFromPlan, planId, 'week:2026-08-31')).toBe(true)
    expect(diaryMealAlreadyInWeekPlan(doneFromPlan, planId, 'week:2026-08-31')).toBe(true)
    expect(diaryMealAlreadyInWeekPlan(doneFromPlan, otherPlan, 'week:2026-08-31')).toBe(false)
    expect(diaryMealAlreadyInWeekPlan(SOURCE, planId, 'week:2026-08-31')).toBe(false)

    expect(
      diaryMealsFreshForPlanDay(
        [pendingFromOther, doneFromPlan, SOURCE],
        [],
        day,
        planId,
        'week:2026-08-31',
      ).map((meal) => meal.id),
    ).toEqual([doneFromPlan.id])
    expect(
      diaryMealsFreshForPlanDay([SOURCE], [], day, planId, 'week:2026-08-31').map((meal) => meal.id),
    ).toEqual([SOURCE.id])
    expect(
      diaryMealsFreshForPlanDay([doneFromPlan], [], day, otherPlan, 'week:2026-08-31').map(
        (meal) => meal.id,
      ),
    ).toEqual([doneFromPlan.id])
    expect(
      diaryPlanDayOccupancy([doneFromPlan], [], day, planId, 'week:2026-08-31'),
    ).toEqual({ total: 1, already: 0, fresh: 1 })
  })

  test('a completed plan meal is already only on the calendar day it occupies', () => {
    const monday = new Date(2026, 8, 7, 12, 0, 0)
    const tuesday = new Date(2026, 8, 8, 12, 0, 0)
    const planId = 'plan_office'
    const doneFromPlan = {
      id: 'done-office',
      assumptions: [
        RATION_DIARY_SOURCE_MARK,
        RATION_DIARY_DONE_MARK,
        weekPlanAssumption(planId),
        diaryPlanSourceAssumption(SOURCE.id),
      ],
    }
    const existing = [
      {
        at: monday.toISOString(),
        assumptions: doneFromPlan.assumptions,
      },
    ]
    expect(diaryPlanDayOccupancy([doneFromPlan], existing, monday, planId, 'week:2026-08-31')).toEqual({
      total: 1,
      already: 1,
      fresh: 0,
    })
    expect(diaryPlanDayOccupancy([doneFromPlan], existing, tuesday, planId, 'week:2026-08-31')).toEqual({
      total: 1,
      already: 0,
      fresh: 1,
    })
    expect(
      diaryMealsFreshForPlanDay([doneFromPlan], existing, tuesday, planId, 'week:2026-08-31').map(
        (meal) => meal.id,
      ),
    ).toEqual([doneFromPlan.id])
    expect(diaryMealsFreshForPlanDay([doneFromPlan], existing, monday, planId, 'week:2026-08-31')).toEqual(
      [],
    )
  })

  test('pending meals do not mark every picker day as already in the plan', () => {
    const monday = new Date(2026, 8, 7, 12, 0, 0)
    const tuesday = new Date(2026, 8, 8, 12, 0, 0)
    const planId = 'plan_office'
    const pendingFromPlan = {
      id: 'pending-office',
      assumptions: [
        RATION_DIARY_SOURCE_MARK,
        weekPlanAssumption(planId),
        diaryPlanSourceAssumption(SOURCE.id),
      ],
    }
    expect(diaryPlanDayOccupancy([pendingFromPlan], [], monday, planId, 'week:2026-08-31')).toEqual({
      total: 0,
      already: 0,
      fresh: 0,
    })
    expect(diaryPlanDayOccupancy([pendingFromPlan], [], tuesday, planId, 'week:2026-08-31')).toEqual({
      total: 0,
      already: 0,
      fresh: 0,
    })
  })

  test('a locally completed plan meal occupies only the calendar day it stands on', () => {
    const monday = new Date(2026, 8, 7, 12, 0, 0)
    const tuesday = new Date(2026, 8, 8, 12, 0, 0)
    const planId = 'plan_office'
    const meal = {
      id: 'done-local',
      assumptions: [RATION_DIARY_SOURCE_MARK, weekPlanAssumption(planId), diaryPlanSourceAssumption(SOURCE.id)],
    }
    const completed = new Set(['done-local'])
    const existing = [{ at: monday.toISOString(), assumptions: meal.assumptions }]
    expect(diaryPlanDayOccupancy([meal], existing, monday, planId, 'week:2026-08-31')).toEqual({
      total: 0,
      already: 0,
      fresh: 0,
    })
    expect(
      diaryPlanDayOccupancy([meal], existing, monday, planId, 'week:2026-08-31', completed),
    ).toEqual({ total: 1, already: 1, fresh: 0 })
    expect(
      diaryPlanDayOccupancy([meal], existing, tuesday, planId, 'week:2026-08-31', completed),
    ).toEqual({ total: 1, already: 0, fresh: 1 })
  })

  test('a ration meal occupies its plan slot by id so copies cannot land twice on that day', () => {
    const monday = new Date(2026, 8, 7, 18, 30, 0)
    const tuesday = new Date(2026, 8, 8, 18, 30, 0)
    const wednesday = new Date(2026, 8, 9, 12, 0, 0)
    const planId = 'plan_office'
    const originalId = 'chicken-original'
    const candidate = {
      id: 'chicken-done-copy',
      assumptions: [
        RATION_DIARY_SOURCE_MARK,
        RATION_DIARY_DONE_MARK,
        weekPlanAssumption(planId),
        diaryPlanSourceAssumption(originalId),
      ],
    }
    const existing = [
      {
        id: originalId,
        at: tuesday.toISOString(),
        assumptions: [RATION_DIARY_SOURCE_MARK, weekPlanAssumption(planId)],
      },
      {
        id: 'chicken-copy-1',
        at: monday.toISOString(),
        assumptions: [
          RATION_DIARY_SOURCE_MARK,
          weekPlanAssumption(planId),
          diaryPlanSourceAssumption(originalId),
        ],
      },
      {
        id: 'chicken-copy-2',
        at: monday.toISOString(),
        assumptions: [
          RATION_DIARY_SOURCE_MARK,
          weekPlanAssumption(planId),
          diaryPlanSourceAssumption(originalId),
        ],
      },
    ]
    expect(diaryMealCanCopyToPlan(candidate)).toBe(true)
    expect(diaryPlanDayOccupancy([candidate], existing, monday, planId, 'week:2026-08-31')).toEqual({
      total: 1,
      already: 1,
      fresh: 0,
    })
    expect(diaryPlanDayOccupancy([candidate], existing, tuesday, planId, 'week:2026-08-31')).toEqual({
      total: 1,
      already: 1,
      fresh: 0,
    })
    expect(diaryPlanDayOccupancy([candidate], existing, wednesday, planId, 'week:2026-08-31')).toEqual({
      total: 1,
      already: 0,
      fresh: 1,
    })
    expect(diaryMealsFreshForPlanDay([candidate], existing, monday, planId, 'week:2026-08-31')).toEqual([])
    expect(diaryMealsFreshForPlanDay([candidate], existing, tuesday, planId, 'week:2026-08-31')).toEqual([])
  })

  test('lists planned copies on a day without deleting the original meal', () => {
    const monday = new Date(2026, 8, 7, 18, 30, 0)
    const tuesday = new Date(2026, 8, 8, 18, 30, 0)
    const wednesday = new Date(2026, 8, 9, 12, 0, 0)
    const planId = 'plan_office'
    const originalId = 'chicken-original'
    const existing = [
      {
        id: originalId,
        at: tuesday.toISOString(),
        assumptions: [RATION_DIARY_SOURCE_MARK, weekPlanAssumption(planId)],
      },
      {
        id: 'chicken-copy-1',
        at: monday.toISOString(),
        assumptions: [
          RATION_DIARY_SOURCE_MARK,
          weekPlanAssumption(planId),
          diaryPlanSourceAssumption(originalId),
        ],
      },
      {
        id: 'chicken-copy-2',
        at: monday.toISOString(),
        assumptions: [
          RATION_DIARY_SOURCE_MARK,
          weekPlanAssumption(planId),
          diaryPlanSourceAssumption(originalId),
        ],
      },
      {
        id: 'other-copy',
        at: monday.toISOString(),
        assumptions: [
          RATION_DIARY_SOURCE_MARK,
          weekPlanAssumption(planId),
          diaryPlanSourceAssumption('other-source'),
        ],
      },
    ]
    expect(
      diaryPlanCopiesOnDay(existing, originalId, monday, planId, 'week:2026-08-31').map(
        (meal) => meal.id,
      ),
    ).toEqual(['chicken-copy-1', 'chicken-copy-2'])
    expect(
      diaryPlanCopiesOnDay(existing, originalId, tuesday, planId, 'week:2026-08-31').map(
        (meal) => meal.id,
      ),
    ).toEqual([originalId])
    expect(diaryPlanCopiesOnDay(existing, originalId, wednesday, planId, 'week:2026-08-31')).toEqual(
      [],
    )
  })

  test('picker can start a new authored plan and stamp the meal into it', () => {
    const items = diaryPlanPickerItems([{ id: 'plan_office', title: 'Офис без срывов' }])
    expect(items[0]).toEqual({ value: DIARY_NEW_PLAN_ID, label: 'Новый план' })
    expect(items[1]).toEqual({ value: 'plan_office', label: 'Офис без срывов' })
    expect(isDiaryNewPlanId(DIARY_NEW_PLAN_ID)).toBe(true)
    expect(isDiaryNewPlanId('plan_office')).toBe(false)
    expect(diaryNewPlanTitle('  Офис  ', [SOURCE])).toBe('Офис')
    expect(diaryNewPlanTitle('   ', [SOURCE])).toBe(SOURCE.title)
    expect(diaryNewPlanTitle('', [])).toBe('')
    expect(diaryCreatePlanFromMeals({ title: '   ' })).toBeNull()
    const created = diaryCreatePlanFromMeals({
      title: 'Офис без срывов',
      description: '  Коротко, что в плане  ',
      meals: [{ image: '/meals/turkey.jpg' }],
    })
    expect(created?.title).toBe('Офис без срывов')
    expect(created?.description).toBe('Коротко, что в плане')
    expect(created?.coverImage).toBe('/meals/turkey.jpg')
    expect(created?.id.startsWith('plan_')).toBe(true)
    expect(diaryNewPlanDayCount(0)).toBe(1)
    expect(diaryNewPlanDayCount(Number.NaN)).toBe(1)
    expect(diaryNewPlanDayCount(8)).toBe(7)
    expect(diaryNewPlanDays(['a', 'b', 'c'], 1)).toEqual(['a'])
    expect(diaryNewPlanDays(['a', 'b'], 5)).toEqual(['a', 'b'])
    expect(
      diaryPlanDayOccupancy([SOURCE], [], new Date(2026, 8, 8, 12), DIARY_NEW_PLAN_ID, 'week:2026-08-31'),
    ).toEqual({ total: 1, already: 0, fresh: 1 })
  })
})
