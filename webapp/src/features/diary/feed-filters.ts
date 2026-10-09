import type { SharedRation } from '@web-app-demo/contracts'

import { isMealInLocalDayRange, type DiaryPeriodFilter } from './DiaryPeriodPicker'
import type { MealEntry } from './meals-catalog'

export function feedStampInPeriod(
  iso: string | null | undefined,
  period: DiaryPeriodFilter | null,
) {
  if (!period) return true
  if (!iso) return false
  return isMealInLocalDayRange(iso, period.from, period.to)
}

export const FEED_KINDS = ['Приёмы', 'Рационы'] as const
export type FeedKind = (typeof FEED_KINDS)[number]

export const FEED_GOALS = ['Похудение', 'Набор', 'Поддержание', 'Здоровье'] as const
export type FeedGoal = (typeof FEED_GOALS)[number]

/**
 * Per-meal kcal windows for the feed goal filter.
 * A feed card is one meal, not a full day: windows follow catalog meal extrema
 * for that goal, with Набор open-ended so large plates still match.
 */
export const FEED_GOAL_KCAL_RANGE = {
  Похудение: [0, 550],
  Здоровье: [0, 525],
  Поддержание: [350, 620],
  Набор: [550, Number.POSITIVE_INFINITY],
} as const satisfies Record<FeedGoal, readonly [number, number]>

export function mealMatchesFeedGoal(kcal: number, goal: FeedGoal) {
  const [min, max] = FEED_GOAL_KCAL_RANGE[goal]
  return kcal >= min && kcal <= max
}

export function goalsForMealKcal(kcal: number): FeedGoal[] {
  return FEED_GOALS.filter((goal) => mealMatchesFeedGoal(kcal, goal))
}

export function matchesSharedMealQuery(meal: MealEntry, query: string) {
  const needle = query.trim().toLowerCase()
  if (!needle) return true
  const haystack = [meal.title, meal.ingredients, meal.authorName, meal.meal, meal.category]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
  return haystack.includes(needle)
}

/** Newest like first. Cards without a like stamp stay after the dated ones. */
export function orderByLikedAt<T extends { likedAt?: string | null }>(items: readonly T[]): T[] {
  return [...items].sort((left, right) => {
    const leftAt = left.likedAt ?? ''
    const rightAt = right.likedAt ?? ''
    if (leftAt === rightAt) return 0
    return leftAt < rightAt ? 1 : -1
  })
}

export function filterSharedMeals(
  meals: readonly MealEntry[],
  input: {
    likedOnly: boolean
    goal: FeedGoal | null
    query: string
    period?: DiaryPeriodFilter | null
  },
) {
  return meals.filter((meal) => {
    if (input.likedOnly && !meal.liked) return false
    if (input.goal && !mealMatchesFeedGoal(meal.kcal, input.goal)) return false
    if (!feedStampInPeriod(meal.at, input.period ?? null)) return false
    return matchesSharedMealQuery(meal, input.query)
  })
}

export function matchesSharedRationQuery(ration: SharedRation, query: string) {
  const needle = query.trim().toLowerCase()
  if (!needle) return true
  const haystack = [
    ration.title,
    ration.description,
    ration.authorName,
    ration.goal,
    ...ration.meals.map((meal) => meal.title),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
  return haystack.includes(needle)
}

export function filterSharedRations(
  rations: readonly SharedRation[],
  input: {
    likedOnly: boolean
    goal: FeedGoal | null
    query: string
    period?: DiaryPeriodFilter | null
  },
) {
  return rations.filter((ration) => {
    if (input.likedOnly && !ration.liked) return false
    if (input.goal && ration.goal !== input.goal) return false
    if (!feedStampInPeriod(ration.sharedAt ?? ration.createdAt, input.period ?? null)) return false
    return matchesSharedRationQuery(ration, input.query)
  })
}
