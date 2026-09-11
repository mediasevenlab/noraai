import type {
  CreateUserMealRequest,
  MealMicronutrient,
  MealPortionItem,
} from '@web-app-demo/contracts'

import { createAuthoredPlan, type AuthoredPlan } from '@/platform/authored-plans'
import { PLAN_SLOT_COUNT, planSlotIndex } from '@/platform/plan-slots'

import {
  currentWeekPlanStampId,
  DIARY_PLAN_SOURCE_PREFIX,
  isPlannedDiaryMeal,
  isRationPlanPending,
  mealBelongsToWeekPlan,
  RATION_DIARY_SOURCE_MARK,
  visibleMealAssumptions,
  weekPlanAssumption,
  weekPlanIdFromAssumptions,
} from './ration-import'
import { usableMealCover, preferredMealPhotoSrc } from './meal-cover'

export type DiaryWeekPlanOption = {
  id: string
  title: string
}

export type DiaryMealDraftSource = {
  id: string
  title: string
  ingredients: string
  category: CreateUserMealRequest['category']
  meal: CreateUserMealRequest['meal']
  kcal: number
  protein: number
  fat: number
  carbs: number
  portionItems?: Array<string | MealPortionItem>
  micronutrients?: MealMicronutrient[]
  assumptions?: readonly string[]
}

export type DiaryPlanStamp = {
  id?: string
  at?: string
  recordedAt?: string
  assumptions?: readonly string[]
}

export function diaryPlanSourceAssumption(sourceMealId: string) {
  return `${DIARY_PLAN_SOURCE_PREFIX}${sourceMealId}`
}

export function diaryPlanSourceIdFromAssumptions(
  assumptions: readonly string[] | undefined,
): string | null {
  const hit = assumptions?.find((item) => item.startsWith(DIARY_PLAN_SOURCE_PREFIX))
  if (!hit) return null
  const id = hit.slice(DIARY_PLAN_SOURCE_PREFIX.length).trim()
  return id || null
}

/** Original diary meal id, even after the copy is copied again. */
export function diaryPlanSourceId(meal: { id: string; assumptions?: readonly string[] }) {
  return diaryPlanSourceIdFromAssumptions(meal.assumptions) ?? meal.id
}

export function diaryWeekPlanOptions(
  authored: readonly { id: string; title: string }[],
  now = new Date(),
): DiaryWeekPlanOption[] {
  return [
    { id: currentWeekPlanStampId(now), title: 'План на неделю' },
    ...authored.map((plan) => ({ id: plan.id, title: plan.title })),
  ]
}

export function diaryDefaultPlanId(
  options: readonly DiaryWeekPlanOption[],
  selectedPlanId: string | null,
) {
  if (selectedPlanId && options.some((plan) => plan.id === selectedPlanId)) return selectedPlanId
  return options[0]?.id ?? ''
}

/** Sentinel in the destination select — not a persisted plan id. */
export const DIARY_NEW_PLAN_ID = 'new'

export function isDiaryNewPlanId(planId: string) {
  return planId === DIARY_NEW_PLAN_ID
}

export function diaryPlanPickerItems(plans: readonly DiaryWeekPlanOption[]) {
  return [
    {
      value: DIARY_NEW_PLAN_ID,
      label: 'Новый план',
      menuLabel: '+ Создать новый план',
      className: 'font-medium text-[var(--nora-text)]',
      separatorAfter: true,
    },
    ...plans.map((plan) => ({ value: plan.id, label: plan.title })),
  ]
}

export function diaryNewPlanTitle(
  typed: string,
  meals: readonly { title?: string }[],
) {
  const named = typed.trim()
  if (named) return named
  return meals.map((meal) => meal.title?.trim() ?? '').find(Boolean) ?? ''
}

export const DIARY_NEW_PLAN_MIN_DAYS = 1
export const DIARY_NEW_PLAN_MAX_DAYS = PLAN_SLOT_COUNT

export function diaryNewPlanDayCount(count: number) {
  if (!Number.isFinite(count)) return DIARY_NEW_PLAN_MIN_DAYS
  return Math.min(
    DIARY_NEW_PLAN_MAX_DAYS,
    Math.max(DIARY_NEW_PLAN_MIN_DAYS, Math.trunc(count)),
  )
}

export function diaryNewPlanDays<T>(days: readonly T[], count: number) {
  return days.slice(0, diaryNewPlanDayCount(count))
}

export function diaryCreatePlanFromMeals(input: {
  title: string
  description?: string
  coverImage?: string
  meals?: readonly { image?: string }[]
  dayCount?: number
}): AuthoredPlan | null {
  const title = input.title.trim()
  if (!title) return null
  const coverImage =
    usableMealCover(input.coverImage) ||
    input.meals?.map((meal) => usableMealCover(meal.image)).find(Boolean) ||
    ''
  return createAuthoredPlan({
    title,
    coverImage,
    description: input.description,
    dayCount: input.dayCount,
  })
}

/** Pending planned cards stay in the diary; only eaten or own meals can be copied. */
export function diaryMealCanCopyToPlan(
  meal: {
    id?: string
    fromApi?: boolean
    title?: string
    assumptions?: readonly string[]
  },
  completedIds?: ReadonlySet<string>,
  options?: { allowPending?: boolean },
) {
  if (options?.allowPending) return true
  return !isRationPlanPending(meal, completedIds)
}

/**
 * True when this card already belongs to the chosen plan somewhere.
 * Occupancy of a picker day must not use this — a meal on Day 1 is not
 * already on Days 2–7.
 */
export function diaryMealAlreadyInWeekPlan(
  meal: {
    id?: string
    fromApi?: boolean
    title?: string
    assumptions?: readonly string[]
  },
  planId: string,
  fallbackPlanId: string,
) {
  const stamped = weekPlanIdFromAssumptions(meal.assumptions)
  if (stamped) return stamped === planId
  return isPlannedDiaryMeal(meal) && planId === fallbackPlanId
}

function fnv1a32(input: string) {
  let hash = 2166136261
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return (hash >>> 0).toString(16).padStart(8, '0')
}

/** Same source + plan + slot always retries the same meal; no second copy. */
export function diaryPlanDraftClientKey(sourceId: string, planId: string, day: Date) {
  const slot = String(planSlotIndex(day))
  const digest = fnv1a32(`${sourceId}\0${planId}\0${slot}`)
  return `dp:${sourceId.replace(/-/g, '').slice(0, 20)}:${digest}:${slot}`.slice(0, 64)
}

function stampMatchesSource(meal: DiaryPlanStamp, sourceMealId: string) {
  if (diaryPlanSourceIdFromAssumptions(meal.assumptions) === sourceMealId) return true
  if (meal.id !== sourceMealId) return false
  return isPlannedDiaryMeal({ id: meal.id, assumptions: meal.assumptions })
}

function structuredPortionItems(meal: DiaryMealDraftSource): MealPortionItem[] {
  return (meal.portionItems ?? []).filter(
    (item): item is MealPortionItem => typeof item !== 'string',
  )
}

/** Keep the source meal clock, move it onto the chosen local calendar day. */
export function diaryMealStampOnDay(day: Date, sourceAt: string | Date) {
  const source = typeof sourceAt === 'string' ? new Date(sourceAt) : sourceAt
  const recorded = new Date(day.getFullYear(), day.getMonth(), day.getDate())
  recorded.setHours(source.getHours(), source.getMinutes(), source.getSeconds(), 0)
  return recorded
}

/** True when this source already occupies that plan slot (Day 1–7), any week. */
export function diaryMealOnPlanDay(
  meals: readonly DiaryPlanStamp[],
  sourceMealId: string,
  day: Date,
  planId: string,
  fallbackPlanId: string,
): boolean {
  const wantSlot = planSlotIndex(day)
  return meals.some((meal) => {
    const stamp = meal.recordedAt ?? meal.at
    if (!stamp) return false
    if (planSlotIndex(new Date(stamp)) !== wantSlot) return false
    if (!stampMatchesSource(meal, sourceMealId)) return false
    return mealBelongsToWeekPlan(meal, planId, fallbackPlanId)
  })
}

/** Planned copies of this source on that slot, including the source card when it occupies the plan itself. */
export function diaryPlanCopiesOnDay(
  meals: readonly DiaryPlanStamp[],
  sourceMealId: string,
  day: Date,
  planId: string,
  fallbackPlanId: string,
): Array<DiaryPlanStamp & { id: string }> {
  const wantSlot = planSlotIndex(day)
  return meals.filter((meal): meal is DiaryPlanStamp & { id: string } => {
    if (!meal.id) return false
    const stamp = meal.recordedAt ?? meal.at
    if (!stamp) return false
    if (planSlotIndex(new Date(stamp)) !== wantSlot) return false
    if (!stampMatchesSource(meal, sourceMealId)) return false
    if (meal.id === sourceMealId && !isPlannedDiaryMeal(meal)) return false
    return mealBelongsToWeekPlan(meal, planId, fallbackPlanId)
  })
}

export function diaryMealsFreshForPlanDay<T extends { id: string; assumptions?: readonly string[] }>(
  candidates: readonly T[],
  meals: readonly DiaryPlanStamp[],
  day: Date,
  planId: string,
  fallbackPlanId: string,
  completedIds?: ReadonlySet<string>,
  options?: { allowPending?: boolean },
): T[] {
  const seen = new Set<string>()
  const fresh: T[] = []
  for (const meal of candidates) {
    if (!diaryMealCanCopyToPlan(meal, completedIds, options)) continue
    const sourceId = diaryPlanSourceId(meal)
    if (seen.has(sourceId)) continue
    if (diaryMealOnPlanDay(meals, sourceId, day, planId, fallbackPlanId)) continue
    seen.add(sourceId)
    fresh.push(meal)
  }
  return fresh
}

export function diaryPlanDayOccupancy(
  candidates: readonly { id: string; assumptions?: readonly string[] }[],
  meals: readonly DiaryPlanStamp[],
  day: Date,
  planId: string,
  fallbackPlanId: string,
  completedIds?: ReadonlySet<string>,
  options?: { allowPending?: boolean },
) {
  const unique = new Map<string, { id: string; assumptions?: readonly string[] }>()
  for (const meal of candidates) {
    const sourceId = diaryPlanSourceId(meal)
    if (!unique.has(sourceId)) unique.set(sourceId, meal)
  }
  let already = 0
  let copyable = 0
  for (const meal of unique.values()) {
    if (!diaryMealCanCopyToPlan(meal, completedIds, options)) continue
    copyable += 1
    if (diaryMealOnPlanDay(meals, diaryPlanSourceId(meal), day, planId, fallbackPlanId)) {
      already += 1
    }
  }
  return {
    total: copyable,
    already,
    fresh: copyable - already,
  }
}

/** Prefer this card's photo, then the original diary meal's stored photo. */
export function diaryMealPhotoSrc(
  meal: {
    id: string
    image?: string
    extraImages?: readonly string[]
    assumptions?: readonly string[]
  },
  library: readonly {
    id?: string
    imageUrl?: string
    image?: string
    extraImageUrls?: readonly string[]
    extraImages?: readonly string[]
  }[] = [],
) {
  const own = preferredMealPhotoSrc(meal)
  if (own) return own
  const sourceId = diaryPlanSourceId(meal)
  const source = library.find((item) => item.id === sourceId)
  if (!source || source.id === meal.id) return ''
  return preferredMealPhotoSrc({
    image: source.imageUrl || source.image,
    extraImages: source.extraImageUrls ?? source.extraImages,
  })
}

/** One planned-meal create payload. Appends to the day; does not replace a ration. */
export function diaryMealCreatePlanDraft(
  meal: DiaryMealDraftSource,
  planId: string,
  now = new Date(),
): CreateUserMealRequest {
  const sourceId = diaryPlanSourceId(meal)
  return {
    title: meal.title,
    ingredients: meal.ingredients,
    category: meal.category,
    meal: meal.meal,
    recordedAt: now.toISOString(),
    kcal: meal.kcal,
    protein: meal.protein,
    fat: meal.fat,
    carbs: meal.carbs,
    portionItems: structuredPortionItems(meal),
    clientComment: '',
    assumptions: [
      RATION_DIARY_SOURCE_MARK,
      weekPlanAssumption(planId),
      diaryPlanSourceAssumption(sourceId),
      ...visibleMealAssumptions(meal.assumptions ? [...meal.assumptions] : undefined),
    ],
    micronutrients: meal.micronutrients ?? [],
    source: 'manual',
    clientKey: diaryPlanDraftClientKey(sourceId, planId, now),
  }
}
