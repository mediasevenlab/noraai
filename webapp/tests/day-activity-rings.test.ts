import { describe, expect, test } from 'bun:test'

import {
  ACTIVITY_RING_DIALOG_SIZE,
  ACTIVITY_RING_MARK_SIZE,
  DAY_ACTIVITY_MEAL_SLOTS,
  dayActivityRings,
  mealsInMondayWeek,
  currentActivityDayKey,
  mealsOnActivityDay,
  mondayWeekPlanDays,
  activityRingHoleRadius,
  activityRingLayout,
  ringStroke,
  sumDiaryDayStats,
  WEEK_ACTIVITY_DAYS,
  weekActivityRings,
} from '../src/features/diary/day-activity-rings'
import { RATION_DIARY_SOURCE_MARK } from '../src/features/diary/ration-import'

const totals = { kcal: 800, protein: 40, fat: 20, carbs: 70, count: 2 }

function planned(id: string) {
  return {
    id,
    title: `План ${id}`,
    assumptions: [RATION_DIARY_SOURCE_MARK],
    fromApi: true as const,
  }
}

describe('day activity rings', () => {
  test('keeps a center hole and uses wider strokes', () => {
    const mark = activityRingLayout(ACTIVITY_RING_MARK_SIZE)
    const dialog = activityRingLayout(ACTIVITY_RING_DIALOG_SIZE)
    expect(mark[0]!.width).toBeLessThan(2.2)
    expect(activityRingHoleRadius(ACTIVITY_RING_MARK_SIZE)).toBeGreaterThanOrEqual(5)
    expect(mark[0]!.radius - mark[1]!.radius).toBeGreaterThan(mark[0]!.width)
    expect(dialog[0]!.width).toBeGreaterThanOrEqual(14)
    expect(activityRingHoleRadius(ACTIVITY_RING_DIALOG_SIZE)).toBeGreaterThanOrEqual(48)
    expect(dialog[0]!.radius - dialog[1]!.radius).toBeGreaterThan(dialog[0]!.width)
  })

  test('calories, plan completion, and typical meal slots become three rings', () => {
    const rings = dayActivityRings({
      dailyCalories: 1600,
      totals,
      meals: [planned('a'), planned('b')],
      completedIds: new Set(['a']),
    })
    expect(rings.map((ring) => ring.key)).toEqual(['kcal', 'done', 'meals'])
    expect(rings[0]).toMatchObject({ value: 800, target: 1600, progress: 0.5 })
    expect(rings[1]).toMatchObject({ value: 1, target: 2, progress: 0.5 })
    expect(rings[2]).toMatchObject({
      value: 2,
      target: DAY_ACTIVITY_MEAL_SLOTS,
      progress: 2 / DAY_ACTIVITY_MEAL_SLOTS,
    })
  })

  test('own meals count as already done and empty days stay at zero', () => {
    const own = { id: 'own', title: 'Свой ужин', fromApi: true as const }
    expect(
      dayActivityRings({
        dailyCalories: 1600,
        totals: { ...totals, count: 1 },
        meals: [own],
        completedIds: new Set(),
      })[1],
    ).toMatchObject({ value: 1, target: 1, progress: 1 })
    expect(
      dayActivityRings({
        dailyCalories: 1600,
        totals: { kcal: 0, protein: 0, fat: 0, carbs: 0, count: 0 },
        meals: [],
        completedIds: new Set(),
      }).every((ring) => ring.progress === 0),
    ).toBe(true)
  })

  test('overflow is kept in the numbers but the stroke stays a full circle', () => {
    const rings = dayActivityRings({
      dailyCalories: 1600,
      totals: { kcal: 2000, protein: 80, fat: 40, carbs: 160, count: 6 },
      meals: [planned('a')],
      completedIds: new Set(['a']),
    })
    expect(rings[0]?.progress).toBe(1.25)
    const stroke = ringStroke(rings[0]!.progress, 70)
    expect(stroke.dash).toBe(stroke.circumference)
    expect(stroke.gap).toBe(0)
  })
})

describe('week activity rings', () => {
  const saturday = new Date(2026, 7, 22, 12)

  test('lists Monday-first weekdays and filters a single day', () => {
    const days = mondayWeekPlanDays(saturday)
    expect(days.map((day) => day.short)).toEqual(['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'])
    expect(days[0]?.dayKey).toBe('2026-08-17')
    expect(days[5]?.isToday).toBe(true)
    expect(currentActivityDayKey(saturday)).toBe('2026-08-22')
    const meals = [
      { id: 'mon', at: new Date(2026, 7, 17, 8, 0).toISOString() },
      { id: 'sat', at: new Date(2026, 7, 22, 8, 30).toISOString() },
    ]
    expect(mealsOnActivityDay(meals, '2026-08-22').map((meal) => meal.id)).toEqual(['sat'])
  })

  test('keeps only meals from the current Monday week', () => {
    const meals = [
      { id: 'prev', at: new Date(2026, 7, 16, 19, 0).toISOString() },
      { id: 'mon', at: new Date(2026, 7, 17, 8, 0).toISOString() },
      { id: 'sat', at: new Date(2026, 7, 22, 8, 30).toISOString() },
      { id: 'next', at: new Date(2026, 7, 24, 9, 0).toISOString() },
    ]
    expect(mealsInMondayWeek(meals, saturday).map((meal) => meal.id)).toEqual(['mon', 'sat'])
  })

  test('scales calorie and meal targets across the week', () => {
    const rings = weekActivityRings({
      dailyCalories: 1600,
      totals: { kcal: 3200, protein: 80, fat: 40, carbs: 140, count: 2 },
      meals: [planned('a'), planned('b')],
      completedIds: new Set(['a']),
    })
    expect(rings[0]).toMatchObject({
      value: 3200,
      target: 1600 * WEEK_ACTIVITY_DAYS,
      progress: 3200 / (1600 * WEEK_ACTIVITY_DAYS),
    })
    expect(rings[1]).toMatchObject({ value: 1, target: 2, progress: 0.5 })
    expect(rings[2]).toMatchObject({
      value: 2,
      target: DAY_ACTIVITY_MEAL_SLOTS * WEEK_ACTIVITY_DAYS,
      progress: 2 / (DAY_ACTIVITY_MEAL_SLOTS * WEEK_ACTIVITY_DAYS),
    })
  })

  test('planned meals count in the day total but not in KBJU until completed', () => {
    const pending = { ...planned('plan'), kcal: 500, protein: 20, fat: 10, carbs: 40 }
    const own = { id: 'own', title: 'Свой ужин', fromApi: true as const, kcal: 200, protein: 10, fat: 5, carbs: 15 }
    expect(sumDiaryDayStats([pending, own], new Set())).toEqual({
      kcal: 200,
      protein: 10,
      fat: 5,
      carbs: 15,
      count: 2,
    })
    expect(sumDiaryDayStats([pending], new Set(['plan']))).toEqual({
      kcal: 500,
      protein: 20,
      fat: 10,
      carbs: 40,
      count: 1,
    })
  })
})
