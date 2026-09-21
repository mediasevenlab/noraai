import {
  isRationImportedMeal,
  isRationPlanDone,
  isRationPlanPending,
  PLAN_COVER_PLACEHOLDER_SRC,
  mealsForWeekPlan,
  rationIdFromAssumptions,
  durablePlanCoverSrc,
  preferredMealPhotoSrc,
  usableMealCover,
  type MealEntry,
} from '@/features/diary'
import type { SharedRation, SharedRationSnapshot } from '@web-app-demo/contracts'
import {
  assignedRationOnDay,
  localDayKey,
  rationPlanWeekDays,
  weekPlanOptions,
  type RationEntry,
} from '@/features/mentor'
import type { PlanGoal } from '@/platform/authored-plans'
import { addLocalDays, PLAN_SLOT_COUNT, startOfLocalDay } from '@/platform/plan-slots'

import type { CatalogPlan } from './plan-catalog'

export const CURRENT_WEEK_PLAN_TITLE = 'План на неделю'
export const CURRENT_WEEK_PLAN_ID_PREFIX = 'week:'
export const WEEK_PLAN_CARD_SLOTS = 1

function mealsWord(count: number) {
  const mod10 = Math.abs(count) % 10
  const mod100 = Math.abs(count) % 100
  if (mod10 === 1 && mod100 !== 11) return 'приём'
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return 'приёма'
  return 'приёмов'
}

/** Average meals per day for the plan card subtitle, rounded to a whole number. */
export function averageMealsPerDayLabel(mealsCount: number, daysCount: number) {
  if (daysCount <= 0) return `0 ${mealsWord(0)} в день`
  const rounded = Math.round(mealsCount / daysCount)
  return `${rounded} ${mealsWord(rounded)} в день`
}

function formatPlanRangeDay(date: Date) {
  return `${String(date.getDate()).padStart(2, '0')}.${String(date.getMonth() + 1).padStart(2, '0')}`
}

/** Inclusive local range of a plan that starts on `start` and lasts `dayCount` days. */
export function planRangeFromStart(start: Date, dayCount: number) {
  const from = startOfLocalDay(start)
  return { from, to: addLocalDays(from, Math.max(1, dayCount) - 1) }
}

/** Selected-plan cover badge: `07.09 - 15.09`. */
export function formatPlanActiveRange(start: Date, dayCount: number) {
  const { from, to } = planRangeFromStart(start, dayCount)
  return `${formatPlanRangeDay(from)} - ${formatPlanRangeDay(to)}`
}

export type WeekPlanDay = {
  dayKey: string
  short: string
  label: string
  dayIso: string
  filled: boolean
  ration: RationEntry | null
  meals: MealEntry[]
  mealsCount: number
  kcal: number
  done: boolean
}

export function planDayOrdinal(day: Pick<WeekPlanDay, 'short' | 'label'>, fallback = 0) {
  const hit = /(\d+)\s*$/.exec(day.short) ?? /(\d+)\s*$/.exec(day.label)
  return hit ? Number(hit[1]) : fallback
}

export const PLAN_DAY_TAB_SLOTS = 7

/** Next authored day count when the mobile plus tab adds an empty day. */
export function nextPlanDayCount(dayCount: number, occupiedDays = 0) {
  const current = Math.max(
    Number.isFinite(dayCount) ? Math.trunc(dayCount) : 0,
    Number.isFinite(occupiedDays) ? Math.trunc(occupiedDays) : 0,
    0,
  )
  return Math.min(PLAN_SLOT_COUNT, current + 1)
}

export function planDayTabParts(day: Pick<WeekPlanDay, 'short' | 'label'>, index = 0) {
  const ordinal = planDayOrdinal(day, index + 1)
  return {
    ordinal,
    label: `День ${ordinal}`,
  }
}

export function emptyPlanEditorDay(slot: {
  date: Date
  dayKey: string
  short: string
  label: string
}): WeekPlanDay {
  return {
    dayKey: slot.dayKey,
    short: slot.short,
    label: slot.label,
    dayIso: dayIsoFromDate(slot.date),
    filled: false,
    ration: null,
    meals: [],
    mealsCount: 0,
    kcal: 0,
    done: false,
  }
}

/** Rebuild leading/hole/trailing empty days so the editor matches the authored day count. */
export function padPlanDaysForEditor(
  days: readonly WeekPlanDay[],
  now = new Date(),
  dayCount = 0,
): WeekPlanDay[] {
  const requested = Number.isFinite(dayCount) ? Math.trunc(dayCount) : 0
  if (days.length === 0 && requested <= 0) return []
  const byOrdinal = new Map<number, WeekPlanDay>()
  for (const [index, day] of days.entries()) {
    byOrdinal.set(planDayOrdinal(day, index + 1), day)
  }
  const maxOrdinal = Math.min(
    PLAN_SLOT_COUNT,
    Math.max(days.length, requested, ...byOrdinal.keys()),
  )
  const weekDays = rationPlanWeekDays(now)
  const padded: WeekPlanDay[] = []
  for (let ordinal = 1; ordinal <= maxOrdinal; ordinal += 1) {
    const existing = byOrdinal.get(ordinal)
    if (existing) {
      padded.push({ ...existing, meals: [...existing.meals] })
      continue
    }
    const slot = weekDays[ordinal - 1]
    if (!slot) break
    padded.push(emptyPlanEditorDay(slot))
  }
  return padded
}

/** Drop an empty day and pack the rest into consecutive Day 1…N slots. */
export function removeEmptyPlanDay(
  days: readonly WeekPlanDay[],
  dayKey: string,
  now = new Date(),
): WeekPlanDay[] {
  const index = days.findIndex((day) => day.dayKey === dayKey)
  if (index < 0 || days[index]!.meals.length > 0) {
    return days.map((day) => ({ ...day, meals: [...day.meals] }))
  }
  const remaining = days.filter((_, itemIndex) => itemIndex !== index)
  const weekDays = rationPlanWeekDays(now)
  return remaining.map((day, slotIndex) => {
    const slot = weekDays[slotIndex]
    if (!slot) return { ...day, meals: [...day.meals] }
    return {
      ...day,
      dayKey: slot.dayKey,
      short: slot.short,
      label: slot.label,
      dayIso: dayIsoFromDate(slot.date),
      meals: [...day.meals],
    }
  })
}

/** Desktop board hides empty days; mobile tabs keep a selected empty day as a move target. */
export function filledPlanBoardDays(days: readonly WeekPlanDay[]) {
  return days.filter((day) => day.meals.length > 0)
}

/** Drop trailing empty padded days so the plus tab can appear in move mode. */
export function mobilePlanDayTabs(
  days: readonly WeekPlanDay[],
  selectedDayKey?: string | null,
) {
  let last = days.length - 1
  while (
    last > 0 &&
    days[last]!.meals.length === 0 &&
    days[last]!.dayKey !== selectedDayKey
  ) {
    last -= 1
  }
  return days.slice(0, last + 1)
}

/** Always open a plan on its first day (Day 1), not “today”. */
export function defaultPlanDayKey(
  days: ReadonlyArray<Pick<WeekPlanDay, 'dayKey'>>,
  _now = new Date(),
) {
  return days[0]?.dayKey ?? null
}

export type WeekPlan = {
  id: string
  title: string
  description: string
  kcal: number
  coverImage: string
  mealsCount: number
  goal: PlanGoal | null
  /** Day plate shown on the list card (Day 1). */
  cardDays: WeekPlanDay[]
  /** Days that already have a ration. */
  days: WeekPlanDay[]
}

function mondayIndex(date: Date) {
  const weekday = date.getDay()
  return weekday === 0 ? 6 : weekday - 1
}

function mondayDayKey(date: Date) {
  const monday = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  monday.setDate(monday.getDate() + (monday.getDay() === 0 ? -6 : 1 - monday.getDay()))
  return localDayKey(monday)
}

/** Live week uses this week's cards; otherwise the latest pending weekday template. */
export function plannedMealsOnDay(
  meals: readonly MealEntry[],
  day: Date,
  completedIds?: ReadonlySet<string>,
) {
  const wantWeekday = mondayIndex(day)
  const weekKey = mondayDayKey(day)
  const matches = meals
    .filter(
      (meal) =>
        isRationImportedMeal(meal) && mondayIndex(new Date(meal.at)) === wantWeekday,
    )
    .slice()
    .sort((left, right) => (left.at < right.at ? -1 : left.at > right.at ? 1 : 0))
  const thisWeek = matches.filter((meal) => mondayDayKey(new Date(meal.at)) === weekKey)
  if (thisWeek.length > 0) return thisWeek
  const pending = matches.filter((meal) => isRationPlanPending(meal, completedIds))
  if (pending.length === 0) return []
  const latestWeek = pending.reduce((best, meal) => {
    const key = mondayDayKey(new Date(meal.at))
    return key > best ? key : best
  }, '')
  return pending.filter((meal) => mondayDayKey(new Date(meal.at)) === latestWeek)
}

function dayIsoFromDate(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}T12:00:00`
}

function syntheticRationFromMeals(id: string, meals: readonly MealEntry[]): RationEntry {
  const totals = meals.reduce(
    (sum, meal) => ({
      kcal: sum.kcal + meal.kcal,
      protein: sum.protein + meal.protein,
      fat: sum.fat + meal.fat,
      carbs: sum.carbs + meal.carbs,
    }),
    { kcal: 0, protein: 0, fat: 0, carbs: 0 },
  )
  const cover =
    meals.map((meal) => usableMealCover(meal.image)).find(Boolean) || PLAN_COVER_PLACEHOLDER_SRC
  return {
    id,
    title: meals[0]?.title || 'Рацион',
    description: '',
    goal: 'Поддержание',
    days: 1,
    kcal: totals.kcal,
    protein: totals.protein,
    fat: totals.fat,
    carbs: totals.carbs,
    mealsPerDay: meals.length,
    image: cover,
    source: 'План',
    meals: meals.map((meal) => ({
      slot: meal.meal,
      title: meal.title,
      ingredients: meal.ingredients,
      steps: [],
      image: meal.image,
      kcal: meal.kcal,
      protein: meal.protein,
      fat: meal.fat,
      carbs: meal.carbs,
    })),
  }
}

function rationForDay(
  rations: readonly RationEntry[],
  meals: readonly MealEntry[],
  day: Date,
  dayMeals: readonly MealEntry[],
): RationEntry | null {
  const assigned = assignedRationOnDay(rations, meals, day)
  if (assigned) return assigned
  if (dayMeals.length === 0) return null
  const stampedId = dayMeals.map((meal) => rationIdFromAssumptions(meal.assumptions)).find(Boolean)
  return syntheticRationFromMeals(stampedId ?? `day:${localDayKey(day)}`, dayMeals)
}

export function currentWeekPlanId(now = new Date()) {
  return weekPlanOptions(now)[0]?.id ?? `${CURRENT_WEEK_PLAN_ID_PREFIX}${localDayKey(now)}`
}

export function buildWeekPlan(input: {
  planId: string
  title: string
  description?: string
  coverImage?: string
  goal?: PlanGoal | null
  meals: readonly MealEntry[]
  rations: readonly RationEntry[]
  completedIds?: ReadonlySet<string>
  detachedIds?: ReadonlySet<string>
  now?: Date
}): WeekPlan {
  const now = input.now ?? new Date()
  const weekId = currentWeekPlanId(now)
  const meals = mealsForWeekPlan(input.meals, input.planId, weekId).filter(
    (meal) => !input.detachedIds?.has(meal.id),
  )
  const weekDays = rationPlanWeekDays(now)
  const slots: WeekPlanDay[] = []
  for (const day of weekDays) {
    const dayMeals = plannedMealsOnDay(meals, day.date, input.completedIds)
    const ration = rationForDay(input.rations, meals, day.date, dayMeals)
    const filled = Boolean(ration)
    const mealsCount = dayMeals.length > 0 ? dayMeals.length : ration?.meals.length ?? 0
    const done =
      dayMeals.length > 0 &&
      dayMeals.every((meal) => isRationPlanDone(meal, input.completedIds))
    slots.push({
      dayKey: day.dayKey,
      short: day.short,
      label: day.label,
      dayIso: dayIsoFromDate(day.date),
      filled,
      ration,
      meals: dayMeals,
      mealsCount,
      kcal: ration?.kcal ?? 0,
      done,
    })
  }
  const days = slots.filter((day) => day.filled)
  const cardDays = slots.slice(0, WEEK_PLAN_CARD_SLOTS)
  const mealsCount = slots.reduce((sum, day) => sum + day.mealsCount, 0)
  const kcal =
    days.length === 0
      ? 0
      : Math.round(days.reduce((sum, day) => sum + day.kcal, 0) / days.length)
  return {
    id: input.planId,
    title: input.title,
    description: input.description?.trim() ?? '',
    kcal,
    mealsCount,
    goal: input.goal ?? null,
    coverImage:
      durablePlanCoverSrc(input.coverImage) ||
      firstPlanCoverImage(slots) ||
      PLAN_COVER_PLACEHOLDER_SRC,
    cardDays,
    days,
  }
}

export function buildWeekPlanFromRation(input: {
  planId: string
  title: string
  goal?: PlanGoal | null
  coverImage?: string
  ration: RationEntry
  now?: Date
}): WeekPlan {
  const now = input.now ?? new Date()
  const weekDays = rationPlanWeekDays(now)
  const slots: WeekPlanDay[] = weekDays.map((day, index) => {
    const ration = index === 0 ? input.ration : null
    const meals = ration ? previewMealsFromRation(ration, day.date, input.planId) : []
    return {
      dayKey: day.dayKey,
      short: day.short,
      label: day.label,
      dayIso: dayIsoFromDate(day.date),
      filled: Boolean(ration),
      ration,
      meals,
      mealsCount: meals.length,
      kcal: ration?.kcal ?? 0,
      done: false,
    }
  })
  const days = slots.filter((day) => day.filled)
  return {
    id: input.planId,
    title: input.title,
    description: input.ration.description.trim(),
    kcal: input.ration.kcal,
    mealsCount: slots.reduce((sum, day) => sum + day.mealsCount, 0),
    goal: input.goal ?? input.ration.goal,
    coverImage:
      durablePlanCoverSrc(input.coverImage) ||
      firstPlanCoverImage(slots) ||
      usableMealCover(input.ration.image) ||
      PLAN_COVER_PLACEHOLDER_SRC,
    cardDays: slots.slice(0, WEEK_PLAN_CARD_SLOTS),
    days,
  }
}

export function buildWeekPlanFromCatalog(input: {
  plan: CatalogPlan
  now?: Date
}): WeekPlan {
  const now = input.now ?? new Date()
  const weekDays = rationPlanWeekDays(now)
  const slots: WeekPlanDay[] = weekDays.map((day, index) => {
    const ration = input.plan.days[index] ?? null
    const meals = ration ? previewMealsFromRation(ration, day.date, input.plan.id) : []
    return {
      dayKey: day.dayKey,
      short: day.short,
      label: day.label,
      dayIso: dayIsoFromDate(day.date),
      filled: Boolean(ration),
      ration,
      meals,
      mealsCount: meals.length,
      kcal: ration?.kcal ?? 0,
      done: false,
    }
  })
  const days = slots.filter((day) => day.filled)
  return {
    id: input.plan.id,
    title: input.plan.title,
    description: input.plan.description.trim(),
    kcal: input.plan.kcal,
    mealsCount: slots.reduce((sum, day) => sum + day.mealsCount, 0),
    goal: input.plan.goal,
    coverImage:
      durablePlanCoverSrc(input.plan.coverImage) ||
      firstPlanCoverImage(slots) ||
      PLAN_COVER_PLACEHOLDER_SRC,
    cardDays: slots.slice(0, WEEK_PLAN_CARD_SLOTS),
    days,
  }
}

/** One catalog-style day per shared-ration dayIndex, including empty trailing days. */
export function rationDaysFromSharedRation(ration: SharedRation): RationEntry[] {
  const grouped = new Map<number, SharedRation['meals']>()
  for (const meal of ration.meals) {
    const list = grouped.get(meal.dayIndex) ?? []
    list.push(meal)
    grouped.set(meal.dayIndex, list)
  }
  const lastIndex = Math.max(ration.days - 1, ...grouped.keys(), -1)
  const days: RationEntry[] = []
  for (let dayIndex = 0; dayIndex <= lastIndex; dayIndex += 1) {
    const meals = (grouped.get(dayIndex) ?? []).map((meal) => ({
      slot: meal.slot,
      title: meal.title,
      ingredients: meal.ingredients,
      steps: [] as string[],
      image: meal.image,
      kcal: meal.kcal,
      protein: meal.protein,
      fat: meal.fat,
      carbs: meal.carbs,
    }))
    const totals = meals.reduce(
      (sum, meal) => ({
        kcal: sum.kcal + meal.kcal,
        protein: sum.protein + meal.protein,
        fat: sum.fat + meal.fat,
        carbs: sum.carbs + meal.carbs,
      }),
      { kcal: 0, protein: 0, fat: 0, carbs: 0 },
    )
    days.push({
      id: `${ration.id}:${dayIndex}`,
      title: ration.title,
      description: ration.description,
      goal: ration.goal ?? 'Поддержание',
      days: 1,
      kcal: totals.kcal,
      protein: totals.protein,
      fat: totals.fat,
      carbs: totals.carbs,
      mealsPerDay: meals.length,
      image: meals.find((meal) => meal.image.trim())?.image || ration.coverImage,
      source: 'Лента',
      meals,
    })
  }
  return days
}

export function buildWeekPlanFromSharedRation(input: {
  ration: SharedRation
  now?: Date
}): WeekPlan {
  const now = input.now ?? new Date()
  const weekDays = rationPlanWeekDays(now)
  const rationDays = rationDaysFromSharedRation(input.ration)
  const slots: WeekPlanDay[] = weekDays.map((day, index) => {
    const ration = rationDays[index] ?? null
    const filled = Boolean(ration && ration.meals.length > 0)
    const meals = filled && ration ? previewMealsFromRation(ration, day.date, input.ration.id) : []
    return {
      dayKey: day.dayKey,
      short: day.short,
      label: day.label,
      dayIso: dayIsoFromDate(day.date),
      filled,
      ration: filled ? ration : null,
      meals,
      mealsCount: meals.length,
      kcal: ration?.kcal ?? 0,
      done: false,
    }
  })
  const days = slots.filter((day) => day.filled)
  return {
    id: input.ration.sourcePlanId,
    title: input.ration.title,
    description: input.ration.description.trim(),
    kcal: input.ration.kcal,
    mealsCount: slots.reduce((sum, day) => sum + day.mealsCount, 0),
    goal: input.ration.goal,
    coverImage:
      durablePlanCoverSrc(input.ration.coverImage) ||
      firstPlanCoverImage(slots) ||
      PLAN_COVER_PLACEHOLDER_SRC,
    cardDays: slots.slice(0, WEEK_PLAN_CARD_SLOTS),
    days,
  }
}

const PREVIEW_SLOT_CLOCK: Record<RationEntry['meals'][number]['slot'], readonly [number, number]> = {
  Завтрак: [8, 30],
  Обед: [13, 0],
  Перекус: [16, 30],
  Ужин: [19, 30],
}

function previewMealsFromRation(ration: RationEntry, day: Date, planId: string): MealEntry[] {
  return ration.meals.map((meal, index) => {
    const at = new Date(day)
    const [hours, minutes] = PREVIEW_SLOT_CLOCK[meal.slot]
    at.setHours(hours, minutes, 0, 0)
    const steps = (meal.steps ?? []).filter((step) => step.trim()).join('\n')
    return {
      id: `plan-preview:${planId}:${localDayKey(day)}:${index}:${meal.slot}`,
      title: meal.title,
      ingredients: meal.ingredients,
      category: meal.slot === 'Завтрак' || meal.slot === 'Перекус' ? meal.slot : 'Мясо',
      meal: meal.slot,
      at: at.toISOString(),
      kcal: meal.kcal,
      protein: meal.protein,
      fat: meal.fat,
      carbs: meal.carbs,
      image: meal.image,
      clientComment: steps || undefined,
      fromApi: false,
    }
  })
}

function firstPlanCoverImage(slots: readonly WeekPlanDay[]) {
  for (const day of slots) {
    const mealCover = day.meals.map((item) => preferredMealPhotoSrc(item)).find(Boolean)
    if (mealCover) return mealCover
    const rationCover = usableMealCover(day.ration?.image)
    if (rationCover) return rationCover
  }
  return ''
}

/** Current Monday–Sunday plan built from ration days already added to the diary. */
export function buildCurrentWeekPlan(input: {
  meals: readonly MealEntry[]
  rations: readonly RationEntry[]
  completedIds?: ReadonlySet<string>
  detachedIds?: ReadonlySet<string>
  now?: Date
}): WeekPlan {
  const now = input.now ?? new Date()
  return buildWeekPlan({
    completedIds: input.completedIds,
    coverImage: undefined,
    detachedIds: input.detachedIds,
    goal: null,
    meals: input.meals,
    now,
    planId: currentWeekPlanId(now),
    rations: input.rations,
    title: CURRENT_WEEK_PLAN_TITLE,
  })
}

function shareableImage(src: string) {
  const value = src.trim()
  if (!value) return ''
  if (value.startsWith('data:') && value.length > 2048) return ''
  return value.slice(0, 2048)
}

export function sharedRationSnapshotFromWeekPlan(plan: WeekPlan): SharedRationSnapshot | null {
  const title = plan.title.trim()
  if (!title) return null
  const meals = plan.days.flatMap((day, dayIndex) =>
    day.meals.flatMap((meal) => {
      const mealTitle = meal.title.trim()
      if (!mealTitle) return []
      return [{
        dayIndex,
        slot: meal.meal,
        title: mealTitle,
        ingredients: meal.ingredients,
        image: shareableImage(preferredMealPhotoSrc(meal) || meal.image),
        kcal: meal.kcal,
        protein: meal.protein,
        fat: meal.fat,
        carbs: meal.carbs,
      }]
    }),
  )
  if (meals.length === 0) return null
  return {
    title,
    description: plan.description.trim(),
    goal: plan.goal,
    coverImage: shareableImage(plan.coverImage),
    meals,
  }
}
