import type {
  CreateUserMealRequest,
  MealMicronutrient,
  MealPortionItem,
} from '@web-app-demo/contracts'

import { planSlotLabel } from '@/platform/plan-slots'

/** Persisted on meals copied from the public feed. Hidden in the assumptions list. */
export const FEED_DIARY_SOURCE_MARK = 'Добавлено из ленты'
/** Hidden stamp that keeps the source meal id after titles change. */
export const FEED_SOURCE_ID_PREFIX = 'Лента:'

export function feedSourceAssumption(sourceMealId: string) {
  return `${FEED_SOURCE_ID_PREFIX}${sourceMealId}`
}

export function feedSourceIdFromAssumptions(
  assumptions: readonly string[] | undefined,
): string | null {
  const hit = assumptions?.find((item) => item.startsWith(FEED_SOURCE_ID_PREFIX))
  if (!hit) return null
  const id = hit.slice(FEED_SOURCE_ID_PREFIX.length).trim()
  return id || null
}

export function isFeedImportedMeal(meal: { assumptions?: readonly string[] }): boolean {
  return Boolean(
    meal.assumptions?.includes(FEED_DIARY_SOURCE_MARK)
    || feedSourceIdFromAssumptions(meal.assumptions),
  )
}

export type FeedMealDraftSource = {
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
}

function localDayKey(now: Date) {
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

export type FeedPlanWeekDay = {
  date: Date
  dayKey: string
  short: string
  label: string
  isToday: boolean
}

function startOfMondayWeek(now: Date) {
  const date = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const weekday = date.getDay()
  date.setDate(date.getDate() + (weekday === 0 ? -6 : 1 - weekday))
  return date
}

/** Current local week, Monday first — same calendar as ration day picking. */
export function feedPlanWeekDays(now = new Date()): FeedPlanWeekDay[] {
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

export type FeedDiaryStamp = {
  at?: string
  recordedAt?: string
  assumptions?: readonly string[]
}

/** True when this feed source is already copied onto the local diary day. */
export function feedSourceOnDay(
  meals: readonly FeedDiaryStamp[],
  sourceMealId: string,
  day: Date,
): boolean {
  const dayKey = localDayKey(day)
  return meals.some((meal) => {
    const stamp = meal.recordedAt ?? meal.at
    if (!stamp) return false
    if (localDayKey(new Date(stamp)) !== dayKey) return false
    return feedSourceIdFromAssumptions(meal.assumptions) === sourceMealId
  })
}

/** Keep the click clock, move it onto the chosen local calendar day. */
export function feedMealStampOnDay(day: Date, now = new Date()) {
  const recorded = new Date(day.getFullYear(), day.getMonth(), day.getDate())
  recorded.setHours(now.getHours(), now.getMinutes(), now.getSeconds(), 0)
  return recorded
}

function feedDraftNonce() {
  const uuid = globalThis.crypto?.randomUUID?.()
  return (uuid ?? `${Date.now()}-${Math.random()}`).replace(/-/g, '').slice(0, 8)
}

function structuredPortionItems(meal: FeedMealDraftSource): MealPortionItem[] {
  return (meal.portionItems ?? []).filter(
    (item): item is MealPortionItem => typeof item !== 'string',
  )
}

/** One diary create payload, stamped on the given local day without replacing a ration. */
export function feedMealCreateDraft(
  meal: FeedMealDraftSource,
  now = new Date(),
): CreateUserMealRequest {
  const dayKey = localDayKey(now)
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
    assumptions: [FEED_DIARY_SOURCE_MARK, feedSourceAssumption(meal.id)],
    micronutrients: meal.micronutrients ?? [],
    source: 'manual',
    clientKey: `fp:${meal.id}:${dayKey}:${feedDraftNonce()}`.slice(0, 64),
  }
}
