import {
  AUTHORED_PLAN_DAY_COUNT_MAX,
  rationGoalSchema,
  sharedRationMealSchema,
  type SharedRation,
  type SharedRationMeal,
  type SharedRationSnapshot,
} from '@web-app-demo/contracts'

import { UsersFailure } from './errors'

export type SharedRationRecord = {
  id: string
  authorId: string
  sourcePlanId: string
  title: string
  description: string
  goal: string | null
  coverImage: string
  days: number
  meals: unknown
  kcal: number
  protein: number
  fat: number
  carbs: number
  sharedAt: Date | null
  createdAt: Date
  updatedAt: Date
  authorName?: string
  likeCount?: number
  liked?: boolean
}

export type SharedRationSnapshotFields = {
  title: string
  description: string
  goal: string | null
  coverImage: string
  days: number
  meals: SharedRationMeal[]
  kcal: number
  protein: number
  fat: number
  carbs: number
}

function clipText(value: string, max: number) {
  return value.trim().slice(0, max)
}

function parseGoal(value: unknown): SharedRation['goal'] {
  const parsed = rationGoalSchema.safeParse(value)
  return parsed.success ? parsed.data : null
}

export function parseSharedRationMeals(value: unknown): SharedRationMeal[] {
  if (!Array.isArray(value)) return []
  const meals: SharedRationMeal[] = []
  for (const item of value) {
    const parsed = sharedRationMealSchema.safeParse(item)
    if (!parsed.success) continue
    meals.push(parsed.data)
    if (meals.length >= 80) break
  }
  return meals
}

export function snapshotFromRequest(snapshot: SharedRationSnapshot): SharedRationSnapshotFields {
  const meals = parseSharedRationMeals(snapshot.meals)
  if (meals.length === 0) {
    throw new UsersFailure('invalid', 'Add at least one meal before publishing a ration')
  }
  const days = Math.min(
    AUTHORED_PLAN_DAY_COUNT_MAX,
    Math.max(1, ...meals.map((meal) => meal.dayIndex + 1)),
  )
  const totals = meals.reduce(
    (sum, meal) => ({
      kcal: sum.kcal + meal.kcal,
      protein: sum.protein + meal.protein,
      fat: sum.fat + meal.fat,
      carbs: sum.carbs + meal.carbs,
    }),
    { kcal: 0, protein: 0, fat: 0, carbs: 0 },
  )
  return {
    title: clipText(snapshot.title, 120),
    description: clipText(snapshot.description, 2000),
    goal: snapshot.goal,
    coverImage: clipText(snapshot.coverImage, 2048),
    days,
    meals,
    kcal: totals.kcal,
    protein: totals.protein,
    fat: totals.fat,
    carbs: totals.carbs,
  }
}

function authorLabel(name: string | undefined) {
  const trimmed = name?.trim()
  if (!trimmed) return undefined
  return trimmed.length > 80 ? trimmed.slice(0, 80) : trimmed
}

export function toSharedRationDto(
  row: SharedRationRecord,
  extras?: { own?: boolean },
): SharedRation {
  const meals = parseSharedRationMeals(row.meals)
  return {
    id: row.id,
    sourcePlanId: row.sourcePlanId,
    title: clipText(row.title, 120) || 'Рацион',
    description: clipText(row.description, 2000),
    goal: parseGoal(row.goal),
    coverImage: clipText(row.coverImage, 2048),
    days: Math.min(AUTHORED_PLAN_DAY_COUNT_MAX, Math.max(1, row.days)),
    kcal: Math.max(0, row.kcal),
    protein: Math.max(0, row.protein),
    fat: Math.max(0, row.fat),
    carbs: Math.max(0, row.carbs),
    meals,
    shared: row.sharedAt != null,
    sharedAt: row.sharedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    ...(authorLabel(row.authorName) ? { authorName: authorLabel(row.authorName) } : {}),
    likeCount: row.likeCount ?? 0,
    liked: Boolean(row.liked),
    own: Boolean(extras?.own),
  }
}
