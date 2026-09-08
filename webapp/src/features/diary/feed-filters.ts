import type { MealEntry } from './meals-catalog'

export const FEED_TABS = ['Все', 'Мои лайки'] as const
export type SharedMealsFeedTab = (typeof FEED_TABS)[number]

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

export function filterSharedMeals(
  meals: readonly MealEntry[],
  input: {
    tab: SharedMealsFeedTab
    goal: FeedGoal | null
    query: string
  },
) {
  return meals.filter((meal) => {
    if (input.tab === 'Мои лайки' && !meal.liked) return false
    if (input.goal && !mealMatchesFeedGoal(meal.kcal, input.goal)) return false
    return matchesSharedMealQuery(meal, input.query)
  })
}
