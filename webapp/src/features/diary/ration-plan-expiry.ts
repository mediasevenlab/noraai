import { activityDayKey, startOfMondayWeek } from './day-activity-rings'
import { isFeedImportedMeal } from './feed-import'
import { isRationPlanPending, isStampedRationPlanMeal, weekPlanIdFromAssumptions } from './ration-import'

export type RationPlanExpiryMeal = {
  id: string
  title?: string
  assumptions?: string[]
  at?: string
  recordedAt?: string
  fromApi?: boolean
}

/** Previous-week ration/feed plan cards that were never marked eaten. */
export function expiredPendingRationMealIds(
  meals: readonly RationPlanExpiryMeal[],
  input: { now?: Date; completedIds?: ReadonlySet<string> } = {},
): string[] {
  const weekStart = activityDayKey(startOfMondayWeek(input.now ?? new Date()))
  const ids: string[] = []
  for (const meal of meals) {
    const stamp = meal.at ?? meal.recordedAt
    if (!stamp) continue
    if (activityDayKey(stamp) >= weekStart) continue
    if (!isStampedRationPlanMeal(meal) && !isFeedImportedMeal(meal)) continue
    if (weekPlanIdFromAssumptions(meal.assumptions)) continue
    if (!isRationPlanPending(meal, input.completedIds)) continue
    ids.push(meal.id)
  }
  return ids
}

export async function purgeExpiredPendingRationMeals<T extends RationPlanExpiryMeal>(
  meals: readonly T[],
  deleteMeal: (mealId: string) => Promise<unknown>,
  input: { now?: Date; completedIds?: ReadonlySet<string> } = {},
): Promise<T[]> {
  const expired = expiredPendingRationMealIds(meals, input)
  if (expired.length === 0) return meals as T[]
  const results = await Promise.allSettled(expired.map((mealId) => deleteMeal(mealId)))
  const removed = new Set(
    expired.filter((_, index) => results[index]?.status === 'fulfilled'),
  )
  if (removed.size === 0) return meals.slice()
  return meals.filter((meal) => !removed.has(meal.id))
}
