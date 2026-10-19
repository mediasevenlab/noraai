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

import { isDiaryOccurrenceUnique } from './diary-plan-import'
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
  weekPlanIdFromAssumptions,
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
  planMeals?: ReadonlyArray<{ at: string }>,
) {
  if (!isRationImportedMeal(meal)) return meal.at
  if (isRationPlanDone(meal, completedIds)) return meal.at
  if (planStart == null && !isRationPlanPending(meal, completedIds)) return meal.at
  const stamp = new Date(meal.at)
  const start = startOfLocalDay(planStart ?? now)
  const offset =
    planMeals && planMeals.length > 0 ? rationDayOffset(stamp, planMeals, now) : 0
  if (offset < 0) return feedMealStampOnDay(addLocalDays(now, -1), stamp).toISOString()
  const target = addLocalDays(start, offset)
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

/**
 * Selected plan id that owns this diary meal.
 * The live week plan is one ration: its id changes every Monday, and older
 * `week:` ids left selected are the same board. Meals stamped on those older
 * weeks still follow the current plan's start date and layout.
 */
export function diaryPlanIdForMeal(
  meal: { assumptions?: readonly string[] },
  selectedPlanIds: ReadonlySet<string>,
  now = new Date(),
): string | null {
  const fallback = currentWeekPlanStampId(now)
  if (
    selectedPlanIds.has(fallback) &&
    mealBelongsToWeekPlan(meal, fallback, fallback)
  ) {
    return fallback
  }
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

/**
 * 0-based ration day of a pending card: day 1 of the plan is 0.
 * The diary then puts that day on the chosen start date, and the next ration
 * days on the following dates. An older copy that is no longer on the plan
 * returns -1 and stays out of the current run.
 */
function rationDayOffset(
  stamp: Date,
  planMeals: ReadonlyArray<{ at: string }>,
  now: Date,
) {
  const mealDay = startOfLocalDay(stamp).getTime()
  if (Number.isNaN(mealDay)) return 0
  const first = startOfLocalDay(now)
  const weekday = first.getDay()
  first.setDate(first.getDate() + (weekday === 0 ? -6 : 1 - weekday))
  for (let index = 0; index < 30; index += 1) {
    const slot = addLocalDays(first, index)
    if (
      mealsOnRationDay(planMeals, slot).some(
        (meal) => startOfLocalDay(new Date(meal.at)).getTime() === mealDay,
      )
    ) {
      return index
    }
  }
  return -1
}

function isRationHistoryRow(meal: { assumptions?: readonly string[] }) {
  const assumptions = meal.assumptions ?? []
  if (assumptions.includes(RATION_DIARY_DONE_MARK)) return true
  return assumptions.some((item) => item.startsWith(RATION_DIARY_LOG_PREFIX))
}

function isRationTemplateRow(meal: { assumptions?: readonly string[] }) {
  if (isRationHistoryRow(meal)) return false
  return Boolean(weekPlanIdFromAssumptions(meal.assumptions))
}

function mealsOnRationDay(
  planMeals: ReadonlyArray<{ at: string; assumptions?: readonly string[] }>,
  slot: Date,
) {
  const templates = planMeals.filter((meal) => isRationTemplateRow(meal))
  const want = planSlotIndex(slot)
  const weekKey = mondayDayKey(slot)
  const matches = templates.filter((meal) => {
    const parsed = new Date(meal.at)
    return !Number.isNaN(parsed.getTime()) && planSlotIndex(parsed) === want
  })
  const thisWeek = matches.filter((meal) => mondayDayKey(new Date(meal.at)) === weekKey)
  if (thisWeek.length > 0) return thisWeek
  let latest = ''
  for (const meal of matches) {
    const key = mondayDayKey(new Date(meal.at))
    if (key > latest) latest = key
  }
  if (!latest) return []
  return matches.filter((meal) => mondayDayKey(new Date(meal.at)) === latest)
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

/**
 * Place of a layout day in the ration. Day 1 of the plan is 0, so the diary
 * can start that day on the chosen date.
 */
function layoutBoardDayOffset(day: Date, now: Date): number | null {
  const monday = startOfLocalDay(now)
  const weekday = monday.getDay()
  monday.setDate(monday.getDate() + (weekday === 0 ? -6 : 1 - weekday))
  const from = Date.UTC(monday.getFullYear(), monday.getMonth(), monday.getDate())
  const toDay = startOfLocalDay(day)
  const to = Date.UTC(toDay.getFullYear(), toDay.getMonth(), toDay.getDate())
  const offset = Math.round((to - from) / 86_400_000)
  return offset >= 0 ? offset : null
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
  const offset = layoutBoardDayOffset(templateDay, now)
  if (offset == null) return null
  const target = addLocalDays(start, offset)
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
  return planOccurrenceDiaryAt(meal, input.completedIds, now, planStart, input.planMeals)
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

/** Hidden stamp of the ration assignment a completion belongs to. */
export const RATION_ASSIGNMENT_PREFIX = 'Назначение:'

export function rationAssignmentAssumption(generation: number) {
  return `${RATION_ASSIGNMENT_PREFIX}${generation}`
}

export function rationAssignmentGenerationFromAssumptions(
  assumptions: readonly string[] | undefined,
): number | null {
  const hit = assumptions?.find((item) => item.startsWith(RATION_ASSIGNMENT_PREFIX))
  if (!hit) return null
  const value = Number(hit.slice(RATION_ASSIGNMENT_PREFIX.length).trim())
  if (!Number.isInteger(value) || value < 1) return null
  return value
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

type RationSlotMeal = {
  at: string
  assumptions?: readonly string[]
  versions?: readonly unknown[]
}

function rationAssignmentMatches(meal: RationSlotMeal, assignment: number) {
  const stamped = rationAssignmentGenerationFromAssumptions(meal.assumptions)
  if (stamped == null) return assignment === 0
  return stamped === assignment
}

/**
 * A completion fills the ration slot of the assignment it was eaten in.
 * Clearing the ration and assigning it again is the next assignment:
 * the old completion stays, and the planned card is free.
 */
export function rationOccurrenceCoversSlot(
  meal: RationSlotMeal,
  templateId: string,
  dayKey: string,
  assignment = 0,
): boolean {
  if (diaryHistorySourceId(meal.assumptions) !== templateId) return false
  if (!isRationPlanDone(meal)) return false
  if (localDayKey(meal.at) !== dayKey) return false
  return rationAssignmentMatches(meal, assignment)
}

/** One completion row per template, calendar day, and assignment. A later edit gets the next key. */
export function rationOccurrenceClientKey(
  templateId: string,
  dayKey: string,
  generation = 0,
  assignment = 0,
) {
  const base = `occ:${templateId}:${dayKey}`
  const assigned = assignment > 0 ? `${base}:a${assignment}` : base
  return (generation > 0 ? `${assigned}:${generation}` : assigned).slice(0, 64)
}

export function rationOccurrenceClientKeyForSlot(
  meals: readonly RationSlotMeal[],
  templateId: string,
  dayKey: string,
  assignment = 0,
) {
  const editedOnDay = meals.some(
    (meal) =>
      isDiaryOccurrenceUnique(meal)
      && diaryHistorySourceId(meal.assumptions) === templateId
      && localDayKey(meal.at) === dayKey
      && rationAssignmentMatches(meal, assignment),
  )
  return rationOccurrenceClientKey(templateId, dayKey, editedOnDay ? 1 : 0, assignment)
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
    assignmentGenerationFor?: (planId: string) => number
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
    const assignment = input.assignmentGenerationFor?.(planId) ?? 0
    const alreadyEatenToday = meals.some((other) =>
      rationOccurrenceCoversSlot(other, meal.id, projectedKey, assignment),
    )
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
 * Order key for a pending ration card.
 * A saved layout wins. Otherwise the meal keeps the board's left-to-right
 * order, which is the earlier stamp first.
 */
export function pendingDiarySlotKey(layoutSlot: number | null, at: string) {
  if (layoutSlot != null) return layoutSlot
  const stamp = Date.parse(at)
  return Number.isNaN(stamp) ? 0 : stamp
}

/**
 * Today's completion of the current ration assignment keeps its board slot.
 * It moves after that row when the day is no longer today, the ration is no
 * longer selected, or the completion belongs to an earlier assignment.
 */
export function diaryDoneMealLeavesSlot(input: {
  done: boolean
  onCurrentDay: boolean
  planStillSelected: boolean
  belongsToCurrentAssignment?: boolean
}) {
  if (!input.done) return false
  const currentAssignment = input.belongsToCurrentAssignment !== false
  return !(input.onCurrentDay && input.planStillSelected && currentAssignment)
}

/**
 * Line ration meals up with the plan board: slot 1, then 2, then 3.
 * When several selected plans share the day, each plan stays a block, in selection order.
 * A completion that no longer belongs to the selected ration moves to the end of that row.
 * Meals the user added stay after the ration.
 */
export function orderDiaryDayByPlanLayout<T extends { id: string }>(
  meals: readonly T[],
  slotIndex: (meal: T) => number | null,
  ownMeal?: (meal: T) => boolean,
  planRank?: (meal: T) => number,
  doneMeal?: (meal: T) => boolean,
): T[] {
  const own: T[] = []
  const done: T[] = []
  const planned = meals.filter((meal) => {
    if (ownMeal?.(meal)) {
      own.push(meal)
      return false
    }
    if (doneMeal?.(meal)) {
      done.push(meal)
      return false
    }
    return true
  })
  const compare = (left: T, right: T) => {
    const plan = (planRank?.(left) ?? 0) - (planRank?.(right) ?? 0)
    if (plan !== 0) return plan
    return (slotIndex(left) ?? 0) - (slotIndex(right) ?? 0)
  }
  const pending: T[] = []
  const slots = planned.map((meal) => {
    if (slotIndex(meal) == null) return meal
    pending.push(meal)
    return null
  })
  pending.sort(compare)
  done.sort(compare)
  let next = 0
  return [...slots.map((meal) => meal ?? pending[next++]!), ...done, ...own]
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
