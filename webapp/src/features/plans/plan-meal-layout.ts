import type { MealEntry } from '@/features/diary'
import {
  extraPlanSlotTime,
  planSlotTimesForCount,
  type PlanMealLayout,
} from '@/platform/plan-meal-layout'

import type { WeekPlanDay } from './week-plan'

export type { PlanMealLayout }
export { readPlanMealLayout, writePlanMealLayout } from '@/platform/plan-meal-layout'

export function planLayoutDayCount(
  layout: PlanMealLayout | null,
  weekDayKeys: readonly string[],
) {
  if (!layout || weekDayKeys.length === 0) return 0
  let last = -1
  for (const [index, dayKey] of weekDayKeys.entries()) {
    const ids = layout[dayKey]
    if (ids && ids.length > 0) last = index
  }
  return last + 1
}

function restampDay(meals: MealEntry[], slotTimes: string[], dayIso: string): MealEntry[] {
  const day = new Date(dayIso)
  const times = planSlotTimesForCount(slotTimes, meals.length)
  return meals.map((meal, index) => {
    const source = new Date(times[index] ?? extraPlanSlotTime(times.at(-1)))
    const stamped = new Date(day)
    stamped.setHours(source.getHours(), source.getMinutes(), source.getSeconds(), 0)
    return { ...meal, at: stamped.toISOString() }
  })
}

function withDayTotals(day: WeekPlanDay, meals: MealEntry[]): WeekPlanDay {
  return {
    ...day,
    meals,
    mealsCount: meals.length,
    kcal: meals.reduce((sum, meal) => sum + meal.kcal, 0),
    filled: meals.length > 0,
  }
}

export function layoutFromDays(
  days: ReadonlyArray<Pick<WeekPlanDay, 'dayKey' | 'meals'>>,
): PlanMealLayout {
  const layout: PlanMealLayout = {}
  for (const day of days) {
    layout[day.dayKey] = day.meals.map((meal) => meal.id)
  }
  return layout
}

export function movePlanMeal(
  days: readonly WeekPlanDay[],
  mealId: string,
  toDayKey: string,
  toIndex: number,
): WeekPlanDay[] {
  const sourceIndex = days.findIndex((day) => day.meals.some((meal) => meal.id === mealId))
  const targetIndex = days.findIndex((day) => day.dayKey === toDayKey)
  if (sourceIndex < 0 || targetIndex < 0) return days.map((day) => ({ ...day, meals: [...day.meals] }))

  const source = days[sourceIndex]!
  const target = days[targetIndex]!
  const meal = source.meals.find((item) => item.id === mealId)
  if (!meal) return days.map((day) => ({ ...day, meals: [...day.meals] }))

  const sourceTimes = source.meals.map((item) => item.at)
  const targetTimes = target.meals.map((item) => item.at)
  const fromIndex = source.meals.findIndex((item) => item.id === mealId)

  const next = days.map((day) => ({ ...day, meals: day.meals.filter((item) => item.id !== mealId) }))
  const nextTarget = next[targetIndex]!
  const insertAt = Math.max(0, Math.min(toIndex, nextTarget.meals.length))
  if (sourceIndex === targetIndex && insertAt === fromIndex) {
    return days.map((day) => ({ ...day, meals: [...day.meals] }))
  }
  nextTarget.meals.splice(insertAt, 0, meal)

  return next.map((day, index) => {
    const slotTimes =
      index === targetIndex
        ? targetTimes
        : index === sourceIndex
          ? sourceTimes.filter((_, slot) => slot !== fromIndex)
          : day.meals.map((item) => item.at)
    return withDayTotals(day, restampDay(day.meals, slotTimes, day.dayIso))
  })
}

export function reorderPlanDays(
  days: readonly WeekPlanDay[],
  fromIndex: number,
  toIndex: number,
): WeekPlanDay[] {
  if (
    fromIndex === toIndex ||
    fromIndex < 0 ||
    toIndex < 0 ||
    fromIndex >= days.length ||
    toIndex >= days.length
  ) {
    return days.map((day) => ({ ...day, meals: [...day.meals] }))
  }
  const groups = days.map((day) => day.meals.slice())
  const [moved] = groups.splice(fromIndex, 1)
  groups.splice(toIndex, 0, moved!)
  return days.map((day, index) =>
    withDayTotals(
      day,
      restampDay(groups[index]!, day.meals.map((item) => item.at), day.dayIso),
    ),
  )
}

export function movePlanMeals(
  days: readonly WeekPlanDay[],
  mealIds: readonly string[],
  toDayKey: string,
): WeekPlanDay[] {
  const seen = new Set<string>()
  let next = days.map((day) => ({ ...day, meals: [...day.meals] }))
  for (const mealId of mealIds) {
    if (!mealId || seen.has(mealId)) continue
    seen.add(mealId)
    next = movePlanMeal(next, mealId, toDayKey, 999)
  }
  return next
}

export function applyPlanMealLayout(
  days: readonly WeekPlanDay[],
  layout: PlanMealLayout | null,
): WeekPlanDay[] {
  if (!layout) return days.map((day) => ({ ...day, meals: [...day.meals] }))
  const byId = new Map<string, MealEntry>()
  const originalDay = new Map<string, string>()
  for (const day of days) {
    for (const meal of day.meals) {
      byId.set(meal.id, meal)
      originalDay.set(meal.id, day.dayKey)
    }
  }
  const used = new Set<string>()
  const next = days.map((day) => {
    const ordered = (layout[day.dayKey] ?? [])
      .map((id) => byId.get(id))
      .filter((meal): meal is MealEntry => Boolean(meal))
    for (const meal of ordered) used.add(meal.id)
    return withDayTotals(day, restampDay(ordered, day.meals.map((item) => item.at), day.dayIso))
  })
  for (const [id, meal] of byId) {
    if (used.has(id)) continue
    const dayKey = originalDay.get(id)
    const day = next.find((item) => item.dayKey === dayKey)
    if (!day) continue
    day.meals = restampDay(
      [...day.meals, meal],
      [...day.meals.map((item) => item.at), meal.at],
      day.dayIso,
    )
    Object.assign(day, withDayTotals(day, day.meals))
  }
  return next
}

