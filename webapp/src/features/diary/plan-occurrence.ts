import { readPlanStartDate } from '@/platform/plan-start'
import { addLocalDays, planSlotIndex, startOfLocalDay } from '@/platform/plan-slots'
import { readSavedIdSet, writeSavedIdSet, type SavedAccountScope } from '@/platform/saved-ids'

import { feedMealStampOnDay } from './feed-import'
import {
  currentWeekPlanStampId,
  isRationImportedMeal,
  isRationPlanDone,
  isRationPlanPending,
  mealBelongsToWeekPlan,
  RATION_DIARY_DONE_MARK,
} from './ration-import'
import type { MealEntry } from './meals-catalog'

const SKIP_PREFIX = 'nora:plan-diary-skip:v1:'
const DETACH_PREFIX = 'nora:plan-detached:v1:'

function skipPrefix(weekId: string) {
  return `${SKIP_PREFIX}${weekId}:`
}

export function readSkippedPlanMealIds(
  scope: SavedAccountScope | string,
  weekId = currentWeekPlanStampId(),
): Set<string> {
  return readSavedIdSet(skipPrefix(weekId), scope)
}

export function writeSkippedPlanMealIds(
  scope: SavedAccountScope | string,
  ids: ReadonlySet<string>,
  weekId = currentWeekPlanStampId(),
) {
  writeSavedIdSet(skipPrefix(weekId), scope, ids)
}

/** Selecting a plan again brings pending skipped cards back into the diary. */
export function clearSkippedPlanMealIds(
  scope: SavedAccountScope | string,
  weekId = currentWeekPlanStampId(),
) {
  writeSkippedPlanMealIds(scope, new Set(), weekId)
}

export function readDetachedPlanMealIds(scope: SavedAccountScope | string): Set<string> {
  return readSavedIdSet(DETACH_PREFIX, scope)
}

export function writeDetachedPlanMealIds(
  scope: SavedAccountScope | string,
  ids: ReadonlySet<string>,
) {
  writeSavedIdSet(DETACH_PREFIX, scope, ids)
}

/** Plan-sourced meals stay in the weekly plan when the diary card is removed. */
export function keepsWeeklyPlanOnDiaryDelete(
  meal: Pick<MealEntry, 'id' | 'fromApi'> & {
    title?: string
    assumptions?: readonly string[]
  },
) {
  return isRationImportedMeal(meal)
}

/**
 * Plan meals land on the selected start date plus their slot
 * (Day 1 = start, Day 2 = start + 1, …). Without a start, Day 1 is today.
 *
 * Completed meals keep stored `at` so they do not drift as "today" advances.
 * Persist `planOccurrenceStampWhilePending` on "Выполнить" first, or the card
 * jumps from the shown day back onto the template stamp.
 */
export function planOccurrenceDiaryAt(
  meal: Pick<MealEntry, 'at'> & {
    id?: string
    fromApi?: boolean
    title?: string
    assumptions?: readonly string[]
  },
  completedIds?: ReadonlySet<string>,
  now = new Date(),
  planStart: Date | null = null,
) {
  if (!isRationImportedMeal(meal)) return meal.at
  if (planStart == null && isRationPlanDone(meal, completedIds)) return meal.at
  if (planStart == null && !isRationPlanPending(meal, completedIds)) return meal.at
  const stamp = new Date(meal.at)
  const start = startOfLocalDay(planStart ?? now)
  const target = addLocalDays(start, planSlotIndex(stamp))
  return feedMealStampOnDay(target, stamp).toISOString()
}

/** Day the pending card currently occupies — freeze this when marking done. */
export function planOccurrenceStampWhilePending(
  meal: Pick<MealEntry, 'at'> & {
    id?: string
    fromApi?: boolean
    title?: string
    assumptions?: readonly string[]
  },
  now = new Date(),
  planStart: Date | null = null,
) {
  return planOccurrenceDiaryAt(meal, undefined, now, planStart)
}

/** Start date of the selected plan that owns this diary meal. */
export function diaryPlanStartForMeal(
  meal: { assumptions?: readonly string[] },
  scope: SavedAccountScope,
  selectedPlanIds: ReadonlySet<string>,
  now = new Date(),
): Date | null {
  const fallback = currentWeekPlanStampId(now)
  for (const planId of selectedPlanIds) {
    if (mealBelongsToWeekPlan(meal, planId, fallback)) {
      return readPlanStartDate(scope, planId)
    }
  }
  return null
}

/** Optimistic list patch for «Выполнить»: never assume `assumptions` is present. */
export function mealListAfterPlanDone<
  T extends { id: string; recordedAt?: string; assumptions?: readonly string[] },
>(
  items: readonly T[],
  mealId: string,
  input: { done: boolean; recordedAt?: string },
): T[] {
  return items.map((item) => {
    if (item.id !== mealId) return item
    const marks = [...(item.assumptions ?? [])]
    const assumptions = input.done
      ? marks.includes(RATION_DIARY_DONE_MARK)
        ? marks
        : [...marks, RATION_DIARY_DONE_MARK]
      : marks.filter((mark) => mark !== RATION_DIARY_DONE_MARK)
    return {
      ...item,
      assumptions,
      ...(input.recordedAt ? { recordedAt: input.recordedAt } : {}),
    }
  })
}
