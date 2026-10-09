import {
  extraPlanSlotTime,
  planSlotTimesForCount,
  type PlanMealLayout,
} from '@/platform/plan-meal-layout'
import { readPlanStartDate } from '@/platform/plan-start'
import {
  addLocalDays,
  dateFromDayKey,
  dayKeyFromDate,
  planSlotIndex,
  startOfLocalDay,
} from '@/platform/plan-slots'
import { readSavedIdSet, writeSavedIdSet, type SavedAccountScope } from '@/platform/saved-ids'

import { localCalendarDayKey, localDayKey } from './diary-feed'
import { feedMealStampOnDay } from './feed-import'
import {
  currentWeekPlanStampId,
  DIARY_PLAN_SOURCE_PREFIX,
  RATION_DIARY_LOG_PREFIX,
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
 * A completed meal stays on the day it was eaten. That row is diary history,
 * not a consumed ration slot. `openPlanDiaryCards` opens the slot again when
 * the ration is assigned to a different day.
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
  if (isRationPlanDone(meal, completedIds)) return meal.at
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

/** Selected plan id that owns this diary meal. */
export function diaryPlanIdForMeal(
  meal: { assumptions?: readonly string[] },
  selectedPlanIds: ReadonlySet<string>,
  now = new Date(),
): string | null {
  const fallback = currentWeekPlanStampId(now)
  for (const planId of selectedPlanIds) {
    if (mealBelongsToWeekPlan(meal, planId, fallback)) return planId
  }
  return null
}

/** Start date of the selected plan that owns this diary meal. */
export function diaryPlanStartForMeal(
  meal: { assumptions?: readonly string[] },
  scope: SavedAccountScope,
  selectedPlanIds: ReadonlySet<string>,
  now = new Date(),
): Date | null {
  const planId = diaryPlanIdForMeal(meal, selectedPlanIds, now)
  return planId ? readPlanStartDate(scope, planId) : null
}

function mondayDayKey(date: Date) {
  const monday = startOfLocalDay(date)
  monday.setDate(monday.getDate() + (monday.getDay() === 0 ? -6 : 1 - monday.getDay()))
  return dayKeyFromDate(monday)
}

function originalMealsOnLayoutDay(
  meals: ReadonlyArray<{ id: string; at: string }>,
  layoutDay: Date,
) {
  const want = planSlotIndex(layoutDay)
  const weekKey = mondayDayKey(layoutDay)
  const matches = meals
    .filter((meal) => planSlotIndex(new Date(meal.at)) === want)
    .slice()
    .sort((left, right) => left.at.localeCompare(right.at))
  const thisWeek = matches.filter((meal) => mondayDayKey(new Date(meal.at)) === weekKey)
  return thisWeek.length > 0 ? thisWeek : matches
}

function pendingPlanLayoutDiaryAt(
  meal: Pick<MealEntry, 'at'> & {
    id?: string
    fromApi?: boolean
    title?: string
    assumptions?: readonly string[]
  },
  layout: PlanMealLayout | null,
  planMeals: ReadonlyArray<{ id: string; at: string }>,
  now: Date,
  planStart: Date | null,
): string | null {
  if (!layout || !meal.id || !isRationImportedMeal(meal)) return null
  let dayKey: string | null = null
  let orderedIds: string[] = []
  for (const [key, ids] of Object.entries(layout)) {
    if (ids.includes(meal.id)) {
      dayKey = key
      orderedIds = ids
      break
    }
  }
  if (!dayKey) return null
  const templateDay = dateFromDayKey(dayKey)
  if (!templateDay) return null
  const byId = new Map(planMeals.map((item) => [item.id, item]))
  const ordered = orderedIds
    .map((id) => byId.get(id))
    .filter((item): item is { id: string; at: string } => Boolean(item))
  const index = ordered.findIndex((item) => item.id === meal.id)
  if (index < 0) return null
  const start = startOfLocalDay(planStart ?? now)
  const target = addLocalDays(start, planSlotIndex(templateDay))
  const slotTimes = planSlotTimesForCount(
    originalMealsOnLayoutDay(planMeals, templateDay).map((item) => item.at),
    ordered.length,
  )
  const source = slotTimes[index] ?? extraPlanSlotTime(slotTimes.at(-1))
  return feedMealStampOnDay(target, new Date(source)).toISOString()
}

/**
 * Diary `at` for a plan meal, including the live board layout.
 * Completed / frozen cards keep their shown stamp even if the plan moved.
 */
export function planOccurrenceDiaryAtWithLayout(
  meal: Pick<MealEntry, 'at'> & {
    id?: string
    fromApi?: boolean
    title?: string
    assumptions?: readonly string[]
  },
  input: {
    completedIds?: ReadonlySet<string>
    now?: Date
    planStart?: Date | null
    layout?: PlanMealLayout | null
    planMeals?: ReadonlyArray<{ id: string; at: string }>
    frozenAt?: string
  } = {},
) {
  const now = input.now ?? new Date()
  const planStart = input.planStart ?? null
  const done = isRationPlanDone(meal, input.completedIds)
  if (done && input.frozenAt) return input.frozenAt
  if (done) return meal.at
  const layoutAt = pendingPlanLayoutDiaryAt(
    meal,
    input.layout ?? null,
    input.planMeals ?? [],
    now,
    planStart,
  )
  if (layoutAt) return layoutAt
  return planOccurrenceDiaryAt(meal, input.completedIds, now, planStart)
}

const OPEN_PLAN_CARD_PREFIX = 'open:'

/** Diary-only id for a ration slot shown again after an earlier completion. */
export function openPlanDiaryCardId(mealId: string, dayKey: string) {
  return `${OPEN_PLAN_CARD_PREFIX}${mealId}:${dayKey}`
}

export function openPlanDiarySourceId(cardId: string): string | null {
  if (!cardId.startsWith(OPEN_PLAN_CARD_PREFIX)) return null
  const mealId = cardId.slice(OPEN_PLAN_CARD_PREFIX.length, OPEN_PLAN_CARD_PREFIX.length + 36)
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(mealId)) {
    return null
  }
  return mealId
}

function diaryHistorySourceId(assumptions: readonly string[] | undefined) {
  const logged = assumptions?.find((item) => item.startsWith(RATION_DIARY_LOG_PREFIX))
  if (logged) {
    const id = logged.slice(RATION_DIARY_LOG_PREFIX.length).trim()
    if (id) return id
  }
  const hit = assumptions?.find((item) => item.startsWith(DIARY_PLAN_SOURCE_PREFIX))
  if (!hit) return null
  const id = hit.slice(DIARY_PLAN_SOURCE_PREFIX.length).trim()
  return id || null
}

type OpenPlanMeal = Pick<MealEntry, 'id' | 'at'> & {
  fromApi?: boolean
  title?: string
  assumptions?: readonly string[]
}

/**
 * Pending cards for the current ration assignment.
 * A meal already eaten on another day stays in history and still opens here,
 * until this assignment's day itself has a completion.
 */
export function openPlanDiaryCards<T extends OpenPlanMeal>(
  meals: readonly T[],
  input: {
    now?: Date
    showWholePlan?: boolean
    completedIds?: ReadonlySet<string>
    skippedIds?: ReadonlySet<string>
    selectedPlanIds: ReadonlySet<string>
    historyAt?: (meal: T) => string
    planStartFor: (planId: string) => Date | null
    layoutFor?: (planId: string) => PlanMealLayout | null
    planMealsFor?: (planId: string) => ReadonlyArray<{ id: string; at: string }>
  },
): T[] {
  const now = input.now ?? new Date()
  const todayKey = localCalendarDayKey(now)
  const historyAt = input.historyAt ?? ((meal: T) => meal.at)
  const cards: T[] = []
  for (const meal of meals) {
    if (input.skippedIds?.has(meal.id)) continue
    if (diaryHistorySourceId(meal.assumptions)) continue
    if (!isRationImportedMeal(meal) || !isRationPlanDone(meal, input.completedIds)) continue
    const planId = diaryPlanIdForMeal(meal, input.selectedPlanIds, now)
    if (!planId) continue
    const assumptions = (meal.assumptions ?? []).filter((item) => item !== RATION_DIARY_DONE_MARK)
    const projected = planOccurrenceDiaryAtWithLayout(
      { ...meal, assumptions },
      {
        now,
        planStart: input.planStartFor(planId),
        layout: input.layoutFor?.(planId) ?? null,
        planMeals: input.planMealsFor?.(planId) ?? [],
        completedIds: new Set(),
      },
    )
    const projectedKey = localDayKey(projected)
    if (localDayKey(historyAt(meal)) === projectedKey) continue
    if (projectedKey < todayKey) continue
    if (projectedKey > todayKey && !input.showWholePlan) continue
    const alreadyEatenToday = meals.some((other) => {
      if (diaryHistorySourceId(other.assumptions) !== meal.id) return false
      if (!isRationPlanDone(other, input.completedIds)) return false
      return localDayKey(historyAt(other)) === projectedKey
    })
    if (alreadyEatenToday) continue
    cards.push({
      ...meal,
      id: openPlanDiaryCardId(meal.id, projectedKey),
      at: projected,
      assumptions,
    })
  }
  return cards
}

/** 0-based slot inside the layout day that currently holds this meal. */
export function planLayoutSlotIndex(
  mealId: string | undefined,
  layout: PlanMealLayout | null,
) {
  if (!layout || !mealId) return null
  for (const ids of Object.values(layout)) {
    const index = ids.indexOf(mealId)
    if (index >= 0) return index
  }
  return null
}

/**
 * Keep pinned cards (completed / own diary) in place and line pending plan
 * meals up with the plan board: slot 1, then 2, then 3.
 */
export function orderDiaryDayByPlanLayout<T extends { id: string }>(
  meals: readonly T[],
  slotIndex: (meal: T) => number | null,
): T[] {
  const pending: T[] = []
  const slots = meals.map((meal) => {
    if (slotIndex(meal) == null) return meal
    pending.push(meal)
    return null
  })
  pending.sort((left, right) => (slotIndex(left) ?? 0) - (slotIndex(right) ?? 0))
  let next = 0
  return slots.map((meal) => meal ?? pending[next++]!)
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
