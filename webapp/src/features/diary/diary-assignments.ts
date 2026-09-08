import { readSavedIdSet, writeSavedIdSet, type SavedAccountScope } from '@/platform/saved-ids'

import {
  MEAL_BY_ID,
  MEAL_CATALOG,
  type MealEntry,
} from './meals-catalog'
import { isRationPlanPending } from './ration-import'

const STORAGE_PREFIX = 'nora:diary:v1:'
const MIN_MEALS = 4
const MAX_MEALS = 8

export type DiaryFeedState =
  | { kind: 'meals'; mealIds: string[]; dailyCalories: number }
  | { kind: 'skeleton'; dailyCalories: number }

const DEFAULT_DAILY_CALORIES = 2200

function storageKey(userId: string) {
  return `${STORAGE_PREFIX}${userId}`
}

/** FNV-1a 32-bit — stable across sessions for the same user id. */
export function hashUserId(userId: string): number {
  let hash = 0x811c9dc5
  for (let index = 0; index < userId.length; index += 1) {
    hash ^= userId.charCodeAt(index)
    hash = Math.imul(hash, 0x01000193)
  }
  return hash >>> 0
}

function mulberry32(seed: number) {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let next = state
    next = Math.imul(next ^ (next >>> 15), next | 1)
    next ^= next + Math.imul(next ^ (next >>> 7), next | 61)
    return ((next ^ (next >>> 14)) >>> 0) / 4294967296
  }
}

export function seededShuffle<T>(items: readonly T[], seed: number): T[] {
  const result = items.slice()
  const random = mulberry32(seed)
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1))
    const current = result[index]!
    result[index] = result[swapIndex]!
    result[swapIndex] = current
  }
  return result
}

/** 4–8 catalog meal ids in a user-specific order. */
export function assignMealIdsForUser(userId: string): string[] {
  const seed = hashUserId(userId)
  const count = MIN_MEALS + (seed % (MAX_MEALS - MIN_MEALS + 1))
  const shuffled = seededShuffle(
    MEAL_CATALOG.map((meal) => meal.id),
    seed ^ 0x9e3779b9,
  )
  return shuffled.slice(0, count)
}

export function resolveMealsFromIds(mealIds: readonly string[]): MealEntry[] {
  return mealIds
    .map((id) => MEAL_BY_ID.get(id))
    .filter((meal): meal is MealEntry => meal != null)
}

function isDiaryFeedState(value: unknown): value is DiaryFeedState {
  if (!value || typeof value !== 'object') return false
  const record = value as Record<string, unknown>
  if (record.kind !== 'meals' && record.kind !== 'skeleton') return false
  if (typeof record.dailyCalories !== 'number' || !Number.isFinite(record.dailyCalories)) {
    return false
  }
  if (record.kind === 'skeleton') return true
  return (
    Array.isArray(record.mealIds) &&
    record.mealIds.every((id) => typeof id === 'string')
  )
}

export function readDiaryState(userId: string): DiaryFeedState | null {
  if (typeof localStorage === 'undefined') return null
  try {
    const raw = localStorage.getItem(storageKey(userId))
    if (!raw) return null
    const parsed: unknown = JSON.parse(raw)
    return isDiaryFeedState(parsed) ? parsed : null
  } catch {
    return null
  }
}

export function writeDiaryState(userId: string, state: DiaryFeedState): void {
  if (typeof localStorage === 'undefined') return
  localStorage.setItem(storageKey(userId), JSON.stringify(state))
}

function skeletonState(dailyCalories = DEFAULT_DAILY_CALORIES): DiaryFeedState {
  return { kind: 'skeleton', dailyCalories }
}

/** True when local meal ids are only from the demo catalog (auto-assigned demos). */
export function isCatalogDemoAssignment(mealIds: readonly string[]): boolean {
  if (mealIds.length === 0) return true
  return mealIds.every((id) => MEAL_BY_ID.has(id))
}

/** Called right after registration for role=user. */
export function initDiarySkeletonForNewUser(userId: string): void {
  writeDiaryState(userId, skeletonState())
}

/**
 * Diary local feed: skeleton by default (API/Telegram meals render separately).
 * Migrates leftover catalog demo assignments to skeleton so new users never see demos.
 */
export function ensureDiaryState(userId: string): DiaryFeedState {
  const existing = readDiaryState(userId)
  if (existing?.kind === 'skeleton') return existing

  if (existing?.kind === 'meals') {
    if (isCatalogDemoAssignment(existing.mealIds)) {
      const next = skeletonState(existing.dailyCalories)
      writeDiaryState(userId, next)
      return next
    }
    return existing
  }

  const state = skeletonState()
  writeDiaryState(userId, state)
  return state
}

export function updateDiaryDailyCalories(
  userId: string,
  dailyCalories: number,
): DiaryFeedState {
  const current = ensureDiaryState(userId)
  const next: DiaryFeedState =
    current.kind === 'skeleton'
      ? { kind: 'skeleton', dailyCalories }
      : { kind: 'meals', mealIds: current.mealIds, dailyCalories }
  writeDiaryState(userId, next)
  return next
}

export function mealsForDiaryState(state: DiaryFeedState): MealEntry[] {
  if (state.kind === 'skeleton') return []
  return resolveMealsFromIds(state.mealIds)
}

/** Remove a demo catalog meal from the user's assigned diary feed. */
export function removeDemoMealFromDiary(userId: string, mealId: string): DiaryFeedState {
  const current = ensureDiaryState(userId)
  if (current.kind === 'skeleton') return current
  const next: DiaryFeedState = {
    kind: 'meals',
    mealIds: current.mealIds.filter((id) => id !== mealId),
    dailyCalories: current.dailyCalories,
  }
  writeDiaryState(userId, next)
  return next
}

const SAVED_STORAGE_PREFIX = 'nora:diary-saved:v1:'

/** User bookmark / «Избранное» ids for a diary subject. */
export function readSavedMealIds(scope: SavedAccountScope | string): Set<string> {
  return readSavedIdSet(SAVED_STORAGE_PREFIX, scope)
}

export function writeSavedMealIds(
  scope: SavedAccountScope | string,
  ids: ReadonlySet<string>,
) {
  writeSavedIdSet(SAVED_STORAGE_PREFIX, scope, ids)
}

export function filterDiaryMeals(
  meals: readonly MealEntry[],
  input: {
    tab: 'Все' | 'Избранное'
    savedIds: ReadonlySet<string>
    query: string
    completedIds?: ReadonlySet<string>
  },
) {
  const query = input.query.trim().toLowerCase()
  return meals.filter((meal) => {
    if (input.tab === 'Избранное') {
      if (!input.savedIds.has(meal.id)) return false
      // Favorites store saved meals, not plan-pending chrome.
      if (isRationPlanPending(meal, input.completedIds)) return false
    }
    if (!query) return true
    const portions = (meal.portionItems ?? []).map((item) =>
      typeof item === 'string' ? item : item.label,
    )
    const haystack = [
      meal.title,
      meal.ingredients,
      meal.meal,
      meal.category,
      meal.clientComment ?? '',
      ...portions,
    ]
      .join(' ')
      .toLowerCase()
    return haystack.includes(query)
  })
}
