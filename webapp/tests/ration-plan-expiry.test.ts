import { readFileSync } from 'node:fs'

import { describe, expect, test } from 'bun:test'

import {
  RATION_DIARY_DONE_MARK,
  RATION_DIARY_SOURCE_MARK,
  rationPlanAssumption,
  weekPlanAssumption,
} from '../src/features/diary/ration-import'
import { FEED_DIARY_SOURCE_MARK } from '../src/features/diary/feed-import'
import {
  expiredPendingRationMealIds,
  purgeExpiredPendingRationMeals,
} from '../src/features/diary/ration-plan-expiry'

const NOW = new Date(2026, 7, 24, 12, 0, 0)

function stamp(year: number, month: number, day: number, hour = 8) {
  return new Date(year, month - 1, day, hour, 0, 0).toISOString()
}

function planned(input: {
  id: string
  day: string
  title?: string
  assumptions?: string[]
  recordedAt?: string
}) {
  return {
    id: input.id,
    title: input.title ?? 'Треска и брокколи',
    assumptions: input.assumptions ?? [RATION_DIARY_SOURCE_MARK, rationPlanAssumption('ration-01')],
    recordedAt: input.recordedAt ?? `${input.day}T08:00:00.000Z`,
    fromApi: true as const,
  }
}

describe('expired pending ration meals', () => {
  test('drops last week’s unfinished ration cards and keeps this week', () => {
    const lastSunday = planned({
      id: '11111111-1111-4111-8111-111111111111',
      recordedAt: stamp(2026, 8, 23),
      day: '2026-08-23',
    })
    const thisMonday = planned({
      id: '22222222-2222-4222-8222-222222222222',
      recordedAt: stamp(2026, 8, 24),
      day: '2026-08-24',
    })
    expect(expiredPendingRationMealIds([lastSunday, thisMonday], { now: NOW })).toEqual([
      lastSunday.id,
    ])
  })

  test('keeps unfinished ration cards from earlier days in the current week', () => {
    const tuesdayEvening = new Date(2026, 8, 1, 18, 0, 0)
    const lastSunday = planned({
      id: '13131313-1313-4131-8131-131313131313',
      recordedAt: stamp(2026, 8, 30),
      day: '2026-08-30',
    })
    const thisMonday = planned({
      id: '14141414-1414-4141-8141-141414141414',
      recordedAt: stamp(2026, 8, 31),
      day: '2026-08-31',
    })
    const today = planned({
      id: '15151515-1515-4151-8151-151515151515',
      recordedAt: stamp(2026, 9, 1),
      day: '2026-09-01',
    })
    expect(
      expiredPendingRationMealIds([lastSunday, thisMonday, today], { now: tuesdayEvening }),
    ).toEqual([lastSunday.id])
  })

  test('drops last week’s unfinished feed cards and keeps this week', () => {
    const yesterday = {
      id: '10101010-1010-4101-8101-101010101010',
      title: 'Плов с шашлыком',
      assumptions: [FEED_DIARY_SOURCE_MARK],
      recordedAt: stamp(2026, 8, 23),
      fromApi: true as const,
    }
    const today = {
      id: '12121212-1212-4121-8121-121212121212',
      title: 'Плов с шашлыком',
      assumptions: [FEED_DIARY_SOURCE_MARK],
      recordedAt: stamp(2026, 8, 24),
      fromApi: true as const,
    }
    expect(expiredPendingRationMealIds([yesterday, today], { now: NOW })).toEqual([yesterday.id])
  })

  test('keeps last week’s unfinished meals that belong to a weekly plan template', () => {
    const lastSunday = planned({
      id: '16161616-1616-4161-8161-161616161616',
      recordedAt: stamp(2026, 8, 23),
      day: '2026-08-23',
      assumptions: [
        RATION_DIARY_SOURCE_MARK,
        rationPlanAssumption('ration-01'),
        weekPlanAssumption('week:2026-08-17'),
      ],
    })
    expect(expiredPendingRationMealIds([lastSunday], { now: NOW })).toEqual([])
  })

  test('keeps finished ration cards and meals the user added themselves', () => {
    const doneByMark = planned({
      id: '33333333-3333-4333-8333-333333333333',
      recordedAt: stamp(2026, 8, 23),
      day: '2026-08-23',
      assumptions: [RATION_DIARY_SOURCE_MARK, RATION_DIARY_DONE_MARK],
    })
    const doneByToggle = planned({
      id: '44444444-4444-4444-8444-444444444444',
      recordedAt: stamp(2026, 8, 22),
      day: '2026-08-22',
    })
    const ownMeal = {
      id: '55555555-5555-4555-8555-555555555555',
      title: 'Треска и брокколи',
      recordedAt: stamp(2026, 8, 23),
      fromApi: true as const,
    }
    const pending = planned({
      id: '66666666-6666-4666-8666-666666666666',
      recordedAt: stamp(2026, 8, 22),
      day: '2026-08-22',
    })

    expect(
      expiredPendingRationMealIds([doneByMark, doneByToggle, ownMeal, pending], {
        now: NOW,
        completedIds: new Set([doneByToggle.id]),
      }),
    ).toEqual([pending.id])
  })

  test('deletes only the expired pending cards from the list', async () => {
    const pending = planned({
      id: '77777777-7777-4777-8777-777777777777',
      recordedAt: stamp(2026, 8, 23),
      day: '2026-08-23',
    })
    const kept = planned({
      id: '88888888-8888-4888-8888-888888888888',
      recordedAt: stamp(2026, 8, 24),
      day: '2026-08-24',
    })
    const deleted: string[] = []
    const next = await purgeExpiredPendingRationMeals(
      [pending, kept],
      async (id) => {
        deleted.push(id)
      },
      { now: NOW },
    )
    expect(deleted).toEqual([pending.id])
    expect(next.map((meal) => meal.id)).toEqual([kept.id])
  })

  test('leaves a card in the list if delete fails', async () => {
    const pending = planned({
      id: '99999999-9999-4999-8999-999999999999',
      recordedAt: stamp(2026, 8, 23),
      day: '2026-08-23',
    })
    const next = await purgeExpiredPendingRationMeals(
      [pending],
      async () => {
        throw new Error('offline')
      },
      { now: NOW },
    )
    expect(next).toEqual([pending])
  })
})

test('own diary meal load purges expired pending ration cards', () => {
  const source = readFileSync(new URL('../src/features/diary/queries.ts', import.meta.url), 'utf8')
  expect(source).toContain('purgeExpiredPendingRationMeals')
  expect(source).toContain('readCompletedRationMealIds')
  expect(source).toContain('listMentorUserMeals')
})
