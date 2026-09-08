import {
  mealAssumptionsAreCatalogCopy,
  mealAssumptionsArePlanCopy,
  mealAssumptionsBlockShare,
  RATION_DIARY_DONE_MARK,
} from './meal-share'

export function isPlannedMealPending(assumptions: readonly string[]): boolean {
  return mealAssumptionsArePlanCopy(assumptions) && !assumptions.includes(RATION_DIARY_DONE_MARK)
}

export function applyMealPlanDoneMark(assumptions: readonly string[], done: boolean): string[] {
  const withoutDone = assumptions.filter((item) => item !== RATION_DIARY_DONE_MARK)
  if (!done) return withoutDone
  return [...withoutDone, RATION_DIARY_DONE_MARK]
}

export function mentorUnreadEventAt(meal: {
  assumptions: readonly string[]
  createdAt: Date
  updatedAt: Date
}): Date | null {
  if (mealAssumptionsAreCatalogCopy(meal.assumptions)) return null
  if (isPlannedMealPending(meal.assumptions)) return null
  if (mealAssumptionsBlockShare(meal.assumptions)) return meal.updatedAt
  return meal.createdAt
}

export function isMentorUnreadMeal(
  meal: { id: string; assumptions: readonly string[]; createdAt: Date; updatedAt: Date },
  viewedMealIds: ReadonlySet<string>,
): boolean {
  if (viewedMealIds.has(meal.id)) return false
  return mentorUnreadEventAt(meal) != null
}

export function countUnreadMealsByMentee(
  meals: Array<{
    id: string
    userId: string
    assumptions: readonly string[]
    createdAt: Date
    updatedAt: Date
  }>,
  viewedMealIds: ReadonlySet<string>,
  menteeIds: readonly string[],
): Array<{ userId: string; unreadCount: number }> {
  const counts = new Map(menteeIds.map((id) => [id, 0]))
  for (const meal of meals) {
    if (!isMentorUnreadMeal(meal, viewedMealIds)) continue
    counts.set(meal.userId, (counts.get(meal.userId) ?? 0) + 1)
  }
  return menteeIds.map((userId) => ({
    userId,
    unreadCount: counts.get(userId) ?? 0,
  }))
}
