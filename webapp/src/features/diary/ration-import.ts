import {
  FEED_DIARY_SOURCE_MARK,
  FEED_SOURCE_ID_PREFIX,
  isFeedImportedMeal,
} from './feed-import'
import {
  CATALOG_FAVORITE_ID_PREFIX,
  CATALOG_FAVORITE_SOURCE_MARK,
  isCatalogFavoriteMeal,
} from './catalog-favorite'
import { localCalendarDayKey, localDayKey } from './diary-feed'
import type { MealEntry } from './meals-catalog'

export { isFeedImportedMeal } from './feed-import'

/** Persisted on meals created from a ration day. Hidden in the assumptions list. */
export const RATION_DIARY_SOURCE_MARK = 'Добавлено из рациона'
/** Hidden stamp after the user marks a planned meal as eaten. */
export const RATION_DIARY_DONE_MARK = 'Выполнено по плану'
/** Hidden stamp that keeps planner state after titles change or cards are re-added. */
export const RATION_PLAN_ID_PREFIX = 'Рацион:'
/** Hidden stamp so a ration day belongs to a named week plan. */
export const WEEK_PLAN_ID_PREFIX = 'План:'
/** Live current-week plan ids look like `week:YYYY-MM-DD`. */
export const WEEK_PLAN_LIVE_ID_PREFIX = 'week:'
/** Hidden stamp that keeps the original diary meal id after a copy is added to a plan. */
export const DIARY_PLAN_SOURCE_PREFIX = 'Дневник:'
/** Hidden stamp after the owner attached their own photo to a derived card. */
export const MEAL_AUTHOR_PHOTO_MARK = 'Добавлено своё фото'

export function rationPlanAssumption(rationId: string) {
  return `${RATION_PLAN_ID_PREFIX}${rationId}`
}

export function rationIdFromAssumptions(
  assumptions: readonly string[] | undefined,
): string | null {
  const hit = assumptions?.find((item) => item.startsWith(RATION_PLAN_ID_PREFIX))
  if (!hit) return null
  const id = hit.slice(RATION_PLAN_ID_PREFIX.length).trim()
  return id || null
}

export function weekPlanAssumption(planId: string) {
  return `${WEEK_PLAN_ID_PREFIX}${planId}`
}

export function weekPlanIdFromAssumptions(
  assumptions: readonly string[] | undefined,
): string | null {
  const hit = assumptions?.find((item) => item.startsWith(WEEK_PLAN_ID_PREFIX))
  if (!hit) return null
  const id = hit.slice(WEEK_PLAN_ID_PREFIX.length).trim()
  return id || null
}

/** Unstamped ration meals still belong to the current week plan. */
export function mealBelongsToWeekPlan(
  meal: { assumptions?: readonly string[] },
  planId: string,
  fallbackPlanId: string,
): boolean {
  const stamped = weekPlanIdFromAssumptions(meal.assumptions)
  if (stamped) {
    if (stamped === planId) return true
    return (
      planId === fallbackPlanId &&
      planId.startsWith(WEEK_PLAN_LIVE_ID_PREFIX) &&
      stamped.startsWith(WEEK_PLAN_LIVE_ID_PREFIX)
    )
  }
  return planId === fallbackPlanId
}

export function mealsForWeekPlan<T extends { assumptions?: readonly string[] }>(
  meals: readonly T[],
  planId: string,
  fallbackPlanId: string,
): T[] {
  return meals.filter((meal) => mealBelongsToWeekPlan(meal, planId, fallbackPlanId))
}

/** Same `week:YYYY-MM-DD` id as the current-week plan option. */
export function currentWeekPlanStampId(now = new Date()): string {
  const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const weekday = monday.getDay()
  monday.setDate(monday.getDate() + (weekday === 0 ? -6 : 1 - weekday))
  const key = [
    monday.getFullYear(),
    String(monday.getMonth() + 1).padStart(2, '0'),
    String(monday.getDate()).padStart(2, '0'),
  ].join('-')
  return `week:${key}`
}

/** Kept so catalog covers can still register titles; planned chrome uses stamps only. */
export function setRationImportedMealTitles(_titles: Iterable<string>) {}

export function visibleMealAssumptions(assumptions: string[] | undefined): string[] {
  return (
    assumptions?.filter(
      (item) =>
        item !== RATION_DIARY_SOURCE_MARK
        && item !== RATION_DIARY_DONE_MARK
        && item !== FEED_DIARY_SOURCE_MARK
        && item !== CATALOG_FAVORITE_SOURCE_MARK
        && item !== MEAL_AUTHOR_PHOTO_MARK
        && !item.startsWith(RATION_PLAN_ID_PREFIX)
        && !item.startsWith(WEEK_PLAN_ID_PREFIX)
        && !item.startsWith(FEED_SOURCE_ID_PREFIX)
        && !item.startsWith(CATALOG_FAVORITE_ID_PREFIX)
        && !item.startsWith(DIARY_PLAN_SOURCE_PREFIX),
    ) ?? []
  )
}

/** True only when the meal was actually added from a ration, not by a matching title. */
export function isStampedRationPlanMeal(meal: { assumptions?: readonly string[] }): boolean {
  return Boolean(
    meal.assumptions?.includes(RATION_DIARY_SOURCE_MARK) || rationIdFromAssumptions(meal.assumptions),
  )
}

/** Which section a diary card came from, so mixed feeds stay scannable. */
export function mealCardOrigin(
  meal: Pick<MealEntry, 'id' | 'title' | 'assumptions' | 'fromApi'>,
): 'diary' | 'feed' | 'rations' | 'mentor-rations' {
  if (isFeedImportedMeal(meal)) return 'feed'
  return 'diary'
}

export function isRationImportedMeal(
  meal: {
    id?: string
    fromApi?: boolean
    title?: string
    assumptions?: readonly string[]
  },
): boolean {
  if (isFeedImportedMeal(meal)) return false
  if (meal.assumptions?.includes(RATION_DIARY_SOURCE_MARK)) return true
  if (rationIdFromAssumptions(meal.assumptions)) return true
  return false
}

/** Ration or feed import that still uses the planned/complete chrome. */
export function isPlannedDiaryMeal(
  meal: {
    id?: string
    fromApi?: boolean
    title?: string
    assumptions?: readonly string[]
  },
): boolean {
  return isFeedImportedMeal(meal) || isRationImportedMeal(meal)
}

/** Own diary meals can go to the public feed. Catalog, plan, and feed copies need an owner photo. */
export function mealHasAuthorPhoto(meal: {
  assumptions?: readonly string[]
  extraImages?: readonly string[]
}): boolean {
  if (meal.assumptions?.includes(MEAL_AUTHOR_PHOTO_MARK)) return true
  return Boolean(meal.extraImages?.some((src) => src.trim().length > 0))
}

export function mealCanShareToFeed(meal: {
  id?: string
  fromApi?: boolean
  title?: string
  assumptions?: readonly string[]
  extraImages?: readonly string[]
}): boolean {
  if (!isPlannedDiaryMeal(meal) && !isCatalogFavoriteMeal(meal)) return true
  return mealHasAuthorPhoto(meal)
}

export function mealShareBlockedMessage(meal: {
  id?: string
  fromApi?: boolean
  title?: string
  assumptions?: readonly string[]
}): string {
  if (isPlannedDiaryMeal(meal) || isCatalogFavoriteMeal(meal)) {
    return 'Копию из каталога, плана или ленты можно отправить только после своего фото в карточке'
  }
  return 'В ленту можно отправить только свой приём'
}

/** Planned ration meal that is still waiting to be marked done. */
export function isRationPlanPending(
  meal: {
    id?: string
    fromApi?: boolean
    title?: string
    assumptions?: readonly string[]
  },
  completedIds?: ReadonlySet<string>,
): boolean {
  if (!isPlannedDiaryMeal(meal)) return false
  if (meal.assumptions?.includes(RATION_DIARY_DONE_MARK)) return false
  if (meal.id && completedIds?.has(meal.id)) return false
  return true
}

export function isRationPlanDone(
  meal: {
    id?: string
    fromApi?: boolean
    title?: string
    assumptions?: readonly string[]
  },
  completedIds?: ReadonlySet<string>,
): boolean {
  return isPlannedDiaryMeal(meal) && !isRationPlanPending(meal, completedIds)
}

/**
 * Pending unmodified copies leave the diary with the ration.
 * Completed meals and meals the user has edited stay.
 */
export function mealRemovedWithRation(
  meal: {
    assumptions?: readonly string[]
    versions?: readonly unknown[]
    extraImages?: readonly string[]
  },
  planId: string,
): boolean {
  const assumptions = meal.assumptions ?? []
  const belongs =
    assumptions.includes(weekPlanAssumption(planId))
    || assumptions.includes(rationPlanAssumption(planId))
  if (!belongs) return false
  if (assumptions.includes(RATION_DIARY_DONE_MARK)) return false
  if (mealHasAuthorPhoto(meal)) return false
  if ((meal.versions?.length ?? 0) > 1) return false
  return (
    assumptions.includes(RATION_DIARY_SOURCE_MARK)
    || assumptions.some((item) => item.startsWith(RATION_PLAN_ID_PREFIX))
  )
}

type DiaryVisibilityMeal = Pick<MealEntry, 'id' | 'fromApi'> & {
  title?: string
  assumptions?: readonly string[]
  at?: string
}

/**
 * Pending ration meals from a plan only appear while that plan is selected.
 * Date-windowing for the diary lives in `isDiaryFeedMealVisible`.
 */
export function isPendingPlanMealShownInDiary(
  meal: DiaryVisibilityMeal,
  selectedPlanIds: string | null | ReadonlySet<string>,
  completedIds?: ReadonlySet<string>,
  now = new Date(),
): boolean {
  if (!isRationImportedMeal(meal)) return true
  if (!isRationPlanPending(meal, completedIds)) return true
  const ids = selectedPlanIdSet(selectedPlanIds)
  if (ids.size === 0) return false
  const fallback = currentWeekPlanStampId(now)
  for (const planId of ids) {
    if (mealBelongsToWeekPlan(meal, planId, fallback)) return true
  }
  return false
}

/** Diary feed shows logged meals on past days and today, never future calendar days. */
export function isDiaryMealInVisibleDay(meal: { at: string }, now = new Date()) {
  return localDayKey(meal.at) <= localCalendarDayKey(now)
}

/** Planned meals on a day that has not started yet — view only from the diary. */
export function isDiaryMealOnFutureDay(meal: { at: string }, now = new Date()) {
  return localDayKey(meal.at) > localCalendarDayKey(now)
}

/** «Выполнить» is only for the calendar day that is already underway. */
export function isDiaryMealOnCurrentDay(meal: { at: string }, now = new Date()) {
  return localDayKey(meal.at) === localCalendarDayKey(now)
}

export function isDiaryFeedMealVisible(
  meal: DiaryVisibilityMeal & { at: string },
  selectedPlanIds: string | null | ReadonlySet<string>,
  completedIds?: ReadonlySet<string>,
  now = new Date(),
  showWholePlan = false,
): boolean {
  const pendingPlan =
    isRationImportedMeal(meal) && isRationPlanPending(meal, completedIds)
  const dayKey = localDayKey(meal.at)
  const todayKey = localCalendarDayKey(now)
  if (pendingPlan && dayKey < todayKey) return false
  if (!pendingPlan && !isDiaryMealInVisibleDay(meal, now)) return false
  if (!showWholePlan && pendingPlan && dayKey > todayKey) return false
  return isPendingPlanMealShownInDiary(meal, selectedPlanIds, completedIds, now)
}

function selectedPlanIdSet(
  value: string | null | ReadonlySet<string> | undefined,
): ReadonlySet<string> {
  if (!value) return new Set()
  if (typeof value === 'string') return new Set([value])
  return value
}
