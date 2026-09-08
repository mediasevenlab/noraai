import { isRationPlanPending } from './ration-import'

export const DAY_ACTIVITY_MEAL_SLOTS = 4
export const WEEK_ACTIVITY_DAYS = 7

export type DayActivityTotals = {
  kcal: number
  protein: number
  fat: number
  carbs: number
  count: number
}

export type DayActivityMeal = {
  id: string
  title: string
  assumptions?: string[]
  fromApi?: boolean
}

export type DayActivityRingKey = 'kcal' | 'done' | 'meals'

export type DayActivityRing = {
  key: DayActivityRingKey
  label: string
  value: number
  target: number
  progress: number
}

export function ringProgress(value: number, target: number) {
  if (target <= 0) return value > 0 ? 1 : 0
  return Math.max(0, value / target)
}

export const ACTIVITY_RING_MARK_SIZE = 28
export const ACTIVITY_RING_DIALOG_SIZE = 268

export function activityRingLayout(size: number) {
  const large = size >= 160
  const stroke = large ? 15 : Math.max(1.65, size * 0.058)
  const gap = large ? 11 : Math.max(1, size * 0.036)
  const inset = large ? 8 : 1
  const budget = size / 2 - inset
  const hole = Math.max(large ? 50 : 5, budget - 3 * stroke - 2 * gap)
  const outer = budget - stroke / 2
  const inner = hole + stroke / 2
  const step = (outer - inner) / 2
  return [
    { radius: outer, width: stroke },
    { radius: outer - step, width: stroke },
    { radius: inner, width: stroke },
  ] as const
}

export function activityRingHoleRadius(size: number) {
  const inner = activityRingLayout(size)[2]
  return inner.radius - inner.width / 2
}

export function ringStroke(progress: number, radius: number) {
  const circumference = 2 * Math.PI * radius
  const clamped = Math.min(1, Math.max(0, progress))
  return {
    circumference,
    dash: clamped * circumference,
    gap: (1 - clamped) * circumference,
  }
}

function closedMealCount(
  meals: readonly DayActivityMeal[],
  completedIds: ReadonlySet<string>,
) {
  return meals.filter((meal) => !isRationPlanPending(meal, completedIds)).length
}

export function dayActivityRings({
  dailyCalories,
  totals,
  meals,
  completedIds,
}: {
  dailyCalories: number
  totals: DayActivityTotals
  meals: readonly DayActivityMeal[]
  completedIds: ReadonlySet<string>
}): DayActivityRing[] {
  const done = closedMealCount(meals, completedIds)
  return [
    {
      key: 'kcal',
      label: 'Калории',
      value: totals.kcal,
      target: dailyCalories,
      progress: ringProgress(totals.kcal, dailyCalories),
    },
    {
      key: 'done',
      label: 'Выполнение',
      value: done,
      target: meals.length,
      progress: ringProgress(done, meals.length),
    },
    {
      key: 'meals',
      label: 'Приёмы',
      value: totals.count,
      target: DAY_ACTIVITY_MEAL_SLOTS,
      progress: ringProgress(totals.count, DAY_ACTIVITY_MEAL_SLOTS),
    },
  ]
}

export function closedDayRings(rings: readonly DayActivityRing[]) {
  return rings.filter((ring) => ring.target > 0 && ring.progress >= 1).length
}

export function activityDayKey(value: Date | string) {
  const day = value instanceof Date ? value : new Date(value)
  const year = day.getFullYear()
  const month = String(day.getMonth() + 1).padStart(2, '0')
  const date = String(day.getDate()).padStart(2, '0')
  return `${year}-${month}-${date}`
}

export function startOfMondayWeek(now = new Date()) {
  const date = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const weekday = date.getDay()
  date.setDate(date.getDate() + (weekday === 0 ? -6 : 1 - weekday))
  return date
}

export function isStampInMondayWeek(iso: string, now = new Date()) {
  const start = startOfMondayWeek(now)
  const end = new Date(start)
  end.setDate(start.getDate() + WEEK_ACTIVITY_DAYS)
  const key = activityDayKey(iso)
  return key >= activityDayKey(start) && key < activityDayKey(end)
}

export function mealsInMondayWeek<T extends { at?: string; recordedAt?: string }>(
  meals: readonly T[],
  now = new Date(),
): T[] {
  return meals.filter((meal) => {
    const stamp = meal.at ?? meal.recordedAt
    return Boolean(stamp && isStampInMondayWeek(stamp, now))
  })
}

const WEEKDAY_SHORT = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'] as const

export type MondayWeekDay = {
  date: Date
  dayKey: string
  short: (typeof WEEKDAY_SHORT)[number]
  isToday: boolean
}

export function currentActivityDayKey(now = new Date()) {
  return mondayWeekPlanDays(now).find((day) => day.isToday)?.dayKey ?? activityDayKey(now)
}

export function mondayWeekPlanDays(now = new Date()): MondayWeekDay[] {
  const start = startOfMondayWeek(now)
  const todayKey = activityDayKey(now)
  return WEEKDAY_SHORT.map((short, index) => {
    const date = new Date(start)
    date.setDate(start.getDate() + index)
    return {
      date,
      dayKey: activityDayKey(date),
      short,
      isToday: activityDayKey(date) === todayKey,
    }
  })
}

export function mealsOnActivityDay<T extends { at?: string; recordedAt?: string }>(
  meals: readonly T[],
  dayKey: string,
): T[] {
  return meals.filter((meal) => {
    const stamp = meal.at ?? meal.recordedAt
    return Boolean(stamp && activityDayKey(stamp) === dayKey)
  })
}

export function sumActivityMeals(
  meals: readonly { kcal: number; protein: number; fat: number; carbs: number }[],
): DayActivityTotals {
  const initial: DayActivityTotals = { kcal: 0, protein: 0, fat: 0, carbs: 0, count: 0 }
  return meals.reduce<DayActivityTotals>(
    (acc, meal) => ({
      kcal: acc.kcal + meal.kcal,
      protein: acc.protein + meal.protein,
      fat: acc.fat + meal.fat,
      carbs: acc.carbs + meal.carbs,
      count: acc.count + 1,
    }),
    initial,
  )
}

export function weekActivityRings({
  dailyCalories,
  totals,
  meals,
  completedIds,
}: {
  dailyCalories: number
  totals: DayActivityTotals
  meals: readonly DayActivityMeal[]
  completedIds: ReadonlySet<string>
}): DayActivityRing[] {
  const done = closedMealCount(meals, completedIds)
  const calorieTarget = dailyCalories * WEEK_ACTIVITY_DAYS
  const mealTarget = DAY_ACTIVITY_MEAL_SLOTS * WEEK_ACTIVITY_DAYS
  return [
    {
      key: 'kcal',
      label: 'Калории',
      value: totals.kcal,
      target: calorieTarget,
      progress: ringProgress(totals.kcal, calorieTarget),
    },
    {
      key: 'done',
      label: 'Выполнение',
      value: done,
      target: meals.length,
      progress: ringProgress(done, meals.length),
    },
    {
      key: 'meals',
      label: 'Приёмы',
      value: totals.count,
      target: mealTarget,
      progress: ringProgress(totals.count, mealTarget),
    },
  ]
}
