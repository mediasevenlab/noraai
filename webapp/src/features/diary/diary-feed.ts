import { format } from 'date-fns'
import { ru as dateFnsRu } from 'date-fns/locale'

import type { MealEntry } from './meals-catalog'

const WEEKDAY_SHORT = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'] as const

export function formatDailyCalories(kcal: number) {
  return `${kcal.toLocaleString('ru-RU')} ккал`
}

export function formatDailyCalorieChip(kcal: number) {
  return formatDailyCalories(kcal)
}

export function formatCount(n: number) {
  return n.toLocaleString('ru-RU')
}

export function localCalendarDayKey(day: Date) {
  const year = day.getFullYear()
  const month = String(day.getMonth() + 1).padStart(2, '0')
  const date = String(day.getDate()).padStart(2, '0')
  return `${year}-${month}-${date}`
}

export function localDayKey(iso: string) {
  return localCalendarDayKey(new Date(iso))
}

export function feedDayHeading(iso: string) {
  const day = new Date(iso)
  const weekday = WEEKDAY_SHORT[day.getDay()]
  const dayMonth = format(day, 'd MMM', { locale: dateFnsRu })
  return `${weekday}. ${dayMonth}`
}

export function formatWeekdayMealStamp(iso: string) {
  const date = new Date(iso)
  const weekday = WEEKDAY_SHORT[date.getDay()] ?? ''
  const time = date.toLocaleTimeString('ru-RU', {
    hour: '2-digit',
    minute: '2-digit',
  })
  return `${weekday}, ${time}`
}

export function mealsCountLabel(count: number) {
  const mod10 = count % 10
  const mod100 = count % 100
  if (mod10 === 1 && mod100 !== 11) return `${count} приём`
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) {
    return `${count} приёма`
  }
  return `${count} приёмов`
}

/** Whole meals per day, same wording as the ration card subtitle. */
export function mealsPerDayLabel(mealsCount: number, daysCount: number) {
  const perDay = daysCount > 0 ? Math.round(mealsCount / daysCount) : 0
  return `${mealsCountLabel(perDay)} в день`
}

export function daysCountLabel(count: number) {
  const mod10 = count % 10
  const mod100 = count % 100
  if (mod10 === 1 && mod100 !== 11) return `${count} день`
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) {
    return `${count} дня`
  }
  return `${count} дней`
}

export function rationsCountLabel(count: number) {
  const mod10 = count % 10
  const mod100 = count % 100
  if (mod10 === 1 && mod100 !== 11) return `${count} рацион`
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) {
    return `${count} рациона`
  }
  return `${count} рационов`
}

export function sumMeals(meals: readonly MealEntry[]) {
  return meals.reduce(
    (acc, meal) => ({
      kcal: acc.kcal + meal.kcal,
      protein: acc.protein + meal.protein,
      fat: acc.fat + meal.fat,
      carbs: acc.carbs + meal.carbs,
      count: acc.count + 1,
    }),
    { kcal: 0, protein: 0, fat: 0, carbs: 0, count: 0 },
  )
}

export function groupMealsByDay(meals: readonly MealEntry[]) {
  const groups = new Map<string, MealEntry[]>()
  for (const meal of meals) {
    const key = localDayKey(meal.at)
    const bucket = groups.get(key)
    if (bucket) bucket.push(meal)
    else groups.set(key, [meal])
  }
  return [...groups.entries()]
    .sort(([left], [right]) => (left < right ? 1 : left > right ? -1 : 0))
    .map(([dayKey, dayMeals]) => ({
      dayKey,
      dayIso: dayMeals[0]!.at,
      meals: dayMeals,
      totals: sumMeals(dayMeals),
    }))
}

export function formatMealStamp(iso: string) {
  const date = new Date(iso)
  const dayMonth = date.toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'short',
  })
  const time = date.toLocaleTimeString('ru-RU', {
    hour: '2-digit',
    minute: '2-digit',
  })
  return `${dayMonth}, ${time}`
}

export function isApiMealId(id: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
}

/** Account favorites API only stores persisted meal UUIDs. */
export function favoriteMealIdsForSync(ids: Iterable<string>): string[] {
  const out: string[] = []
  const seen = new Set<string>()
  for (const id of ids) {
    if (!isApiMealId(id) || seen.has(id)) continue
    seen.add(id)
    out.push(id)
  }
  return out
}

/** Keep preview/demo bookmarks locally; replace API ids with what the server stored. */
export function reconcileLocalFavoriteIds(
  local: Iterable<string>,
  remoteMealIds: readonly string[],
): Set<string> {
  const next = new Set<string>()
  for (const id of local) {
    if (!isApiMealId(id)) next.add(id)
  }
  for (const id of remoteMealIds) next.add(id)
  return next
}

export type CalorieBalanceTone = 'yellow' | 'red' | 'green'

/** Same yellow / red / green rule as the diary day chips. */
export function calorieBalanceTone(kcal: number, dailyCalories: number): CalorieBalanceTone {
  if (kcal < dailyCalories) return 'yellow'
  if (kcal > dailyCalories) return 'red'
  return 'green'
}

export const CALORIE_BALANCE_CHIP_CLASS = {
  yellow: 'bg-[var(--nora-badge-yellow-bg)] text-[var(--nora-badge-yellow-text)]',
  red: 'bg-[var(--nora-badge-red-bg)] text-[var(--nora-badge-red-text)]',
  green: 'bg-[var(--nora-badge-green-bg)] text-[var(--nora-badge-green-text)]',
} as const satisfies Record<CalorieBalanceTone, string>
