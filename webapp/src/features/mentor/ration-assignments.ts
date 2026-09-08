import type { CreateUserMealRequest } from '@web-app-demo/contracts'

import {
  isRationImportedMeal,
  RATION_DIARY_SOURCE_MARK,
  rationIdFromAssumptions,
  rationPlanAssumption,
  weekPlanAssumption,
  mealBelongsToWeekPlan,
} from '@/features/diary'
import { planSlotLabel } from '@/platform/plan-slots'

import {
  type RationEntry,
  type RationMealSlot,
} from './rations-catalog'

const SLOT_CLOCK: Record<RationMealSlot, readonly [number, number]> = {
  Завтрак: [8, 30],
  Обед: [13, 0],
  Перекус: [16, 30],
  Ужин: [19, 30],
}

function categoryForSlot(slot: RationMealSlot): CreateUserMealRequest['category'] {
  if (slot === 'Завтрак' || slot === 'Перекус') return slot
  return 'Мясо'
}

export function localDayKey(now: Date) {
  return [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, '0'),
    String(now.getDate()).padStart(2, '0'),
  ].join('-')
}

const WEEKDAY_PLAN = [
  { weekday: 1, short: 'Пн', label: 'Понедельник' },
  { weekday: 2, short: 'Вт', label: 'Вторник' },
  { weekday: 3, short: 'Ср', label: 'Среда' },
  { weekday: 4, short: 'Чт', label: 'Четверг' },
  { weekday: 5, short: 'Пт', label: 'Пятница' },
  { weekday: 6, short: 'Сб', label: 'Суббота' },
  { weekday: 0, short: 'Вс', label: 'Воскресенье' },
] as const

export type RationPlanWeekDay = {
  date: Date
  dayKey: string
  short: string
  label: string
  isToday: boolean
}

export type RationDayPlanState =
  | { kind: 'free' }
  | { kind: 'same'; rationId: string; title: string }
  | { kind: 'replace'; rationId: string; title: string }

type DiaryMealStamp = {
  id?: string
  title: string
  recordedAt?: string
  at?: string
  assumptions?: string[]
}

function startOfMondayWeek(now: Date) {
  const date = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const weekday = date.getDay()
  date.setDate(date.getDate() + (weekday === 0 ? -6 : 1 - weekday))
  return date
}

/** Current local week, Monday first. */
export function rationPlanWeekDays(now = new Date()): RationPlanWeekDay[] {
  const monday = startOfMondayWeek(now)
  const todayKey = localDayKey(now)
  return WEEKDAY_PLAN.map((_, index) => {
    const date = new Date(monday)
    date.setDate(monday.getDate() + index)
    return {
      date,
      dayKey: localDayKey(date),
      short: planSlotLabel(index),
      label: planSlotLabel(index),
      isToday: localDayKey(date) === todayKey,
    }
  })
}

export type WeekPlanOption = {
  id: string
  title: string
}

/** Named week plans a ration can be added to. One current week for now. */
export function weekPlanOptions(now = new Date()): WeekPlanOption[] {
  const monday = rationPlanWeekDays(now)[0]
  return [{ id: `week:${monday?.dayKey ?? localDayKey(now)}`, title: 'План на неделю' }]
}

function mealDayKey(meal: DiaryMealStamp) {
  const stamp = meal.recordedAt ?? meal.at
  return stamp ? localDayKey(new Date(stamp)) : null
}

function resolvePlannedRation(
  rations: readonly RationEntry[],
  rationId: string,
): RationEntry | null {
  return rations.find((ration) => ration.id === rationId) ?? null
}

function stampedRationOnDay(
  rations: readonly RationEntry[],
  meals: readonly DiaryMealStamp[],
  dayKey: string,
): RationEntry | null {
  const votes = new Map<string, number>()
  for (const meal of meals) {
    if (mealDayKey(meal) !== dayKey) continue
    const rationId = rationIdFromAssumptions(meal.assumptions)
    if (!rationId) continue
    votes.set(rationId, (votes.get(rationId) ?? 0) + 1)
  }
  let bestId = ''
  let bestVotes = 0
  for (const [rationId, count] of votes) {
    if (count > bestVotes) {
      bestId = rationId
      bestVotes = count
    }
  }
  return bestId ? resolvePlannedRation(rations, bestId) : null
}

/** Ration already occupying that local day, by stamp or full title set. */
export function assignedRationOnDay(
  rations: readonly RationEntry[],
  meals: readonly DiaryMealStamp[],
  day: Date,
): RationEntry | null {
  const stamped = stampedRationOnDay(rations, meals, localDayKey(day))
  if (stamped) return stamped
  const used = rationIdsUsedOnDay(rations, meals, day)
  let best: RationEntry | null = null
  for (const ration of rations) {
    if (!used.has(ration.id)) continue
    if (!best || ration.meals.length > best.meals.length) best = ration
  }
  return best
}

export function rationDayPlanState(
  rations: readonly RationEntry[],
  meals: readonly DiaryMealStamp[],
  day: Date,
  addingRationId: string,
): RationDayPlanState {
  const assigned = assignedRationOnDay(rations, meals, day)
  if (!assigned) return { kind: 'free' }
  if (assigned.id === addingRationId) {
    return { kind: 'same', rationId: assigned.id, title: assigned.title }
  }
  return { kind: 'replace', rationId: assigned.id, title: assigned.title }
}

/** Planned ration meals on a day, leaving the user's own uploads untouched. */
export function plannedMealIdsOnDay(meals: readonly DiaryMealStamp[], day: Date): string[] {
  const dayKey = localDayKey(day)
  const ids: string[] = []
  for (const meal of meals) {
    if (!meal.id || mealDayKey(meal) !== dayKey) continue
    if (
      meal.id &&
      isRationImportedMeal({
        id: meal.id,
        title: meal.title,
        assumptions: meal.assumptions,
        fromApi: true,
      })
    ) {
      ids.push(meal.id)
    }
  }
  return ids
}

/** Rations that already have at least one stamped meal in the diary. */
export function rationIdsUsedInDiary(
  meals: readonly { assumptions?: readonly string[] }[],
  plan?: { id: string; fallbackId: string },
): Set<string> {
  const scoped = plan
    ? meals.filter((meal) => mealBelongsToWeekPlan(meal, plan.id, plan.fallbackId))
    : meals
  const used = new Set<string>()
  for (const meal of scoped) {
    const rationId = rationIdFromAssumptions(meal.assumptions)
    if (rationId) used.add(rationId)
  }
  return used
}

/** Rations whose full meal set is already on the given local diary day. */
export function rationIdsUsedOnDay(
  rations: readonly RationEntry[],
  meals: readonly { title: string; recordedAt?: string; at?: string }[],
  now = new Date(),
): Set<string> {
  const dayKey = localDayKey(now)
  const titlesToday = new Set<string>()
  for (const meal of meals) {
    const stamp = meal.recordedAt ?? meal.at
    if (!stamp) continue
    if (localDayKey(new Date(stamp)) !== dayKey) continue
    if (meal.title) titlesToday.add(meal.title)
  }
  const used = new Set<string>()
  for (const ration of rations) {
    if (ration.meals.length === 0) continue
    if (ration.meals.every((meal) => titlesToday.has(meal.title))) {
      used.add(ration.id)
    }
  }
  return used
}

function rationDraftNonce() {
  const uuid = globalThis.crypto?.randomUUID?.()
  return (uuid ?? `${Date.now()}-${Math.random()}`).replace(/-/g, '').slice(0, 8)
}

function rationDraftClientKey(
  rationId: string,
  slot: RationMealSlot,
  dayKey: string,
) {
  const slotIndex = Object.keys(SLOT_CLOCK).indexOf(slot)
  return `rp:${rationId}:${dayKey}:${slotIndex}:${rationDraftNonce()}`.slice(0, 64)
}

/** One diary create payload per meal, stamped on the given local day and week plan. */
export function rationMealCreateDrafts(
  ration: RationEntry,
  now = new Date(),
  planId = weekPlanOptions(now)[0]?.id ?? `week:${localDayKey(now)}`,
): CreateUserMealRequest[] {
  const dayKey = localDayKey(now)
  return ration.meals.map((meal) => {
    const recorded = new Date(now)
    const [hours, minutes] = SLOT_CLOCK[meal.slot]
    recorded.setHours(hours, minutes, 0, 0)
    return {
      title: meal.title,
      ingredients: meal.ingredients,
      category: categoryForSlot(meal.slot),
      meal: meal.slot,
      recordedAt: recorded.toISOString(),
      kcal: meal.kcal,
      protein: meal.protein,
      fat: meal.fat,
      carbs: meal.carbs,
      portionItems: [],
      clientComment: '',
      assumptions: [
        RATION_DIARY_SOURCE_MARK,
        rationPlanAssumption(ration.id),
        weekPlanAssumption(planId),
      ],
      micronutrients: [],
      source: 'manual',
      clientKey: rationDraftClientKey(ration.id, meal.slot, dayKey),
    }
  })
}
