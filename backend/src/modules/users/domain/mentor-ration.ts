import {
  MENTOR_RATION_MEAL_LIMIT,
  mentorRationMealSchema,
  mentorRationSchema,
  type MentorRation,
  type UpsertMentorRationRequest,
} from '@web-app-demo/contracts'

import { UsersFailure } from './errors'

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export function isUuid(value: string) {
  return UUID_RE.test(value)
}

function storedMeals(value: unknown) {
  if (!Array.isArray(value)) return value
  return value.map((meal) => {
    if (!meal || typeof meal !== 'object') return meal
    const record = meal as Record<string, unknown>
    return {
      slot: record.slot,
      title: record.title,
      ingredients: record.ingredients ?? '',
      steps: record.steps ?? [],
      image: record.image ?? '',
      kcal: record.kcal,
      protein: record.protein,
      fat: record.fat,
      carbs: record.carbs,
      ...(typeof record.dayIndex === 'number' ? { dayIndex: record.dayIndex } : {}),
    }
  })
}

export function toMentorRationDto(row: {
  id: string
  mentorId: string
  title: string
  description: string
  goal: string
  source: string
  image: string
  days: number
  mealsPerDay: number
  meals: unknown
  kcal: number
  protein: number
  fat: number
  carbs: number
  createdAt: Date
  updatedAt: Date
}): MentorRation {
  const meals = mentorRationMealSchema
    .array()
    .min(1)
    .max(MENTOR_RATION_MEAL_LIMIT)
    .parse(storedMeals(row.meals))
  return mentorRationSchema.parse({
    id: row.id,
    mentorId: row.mentorId,
    title: row.title,
    description: row.description,
    goal: row.goal,
    source: row.source || 'Рацион наставника',
    image: row.image || meals[0]?.image || '',
    days: row.days || 1,
    mealsPerDay: row.mealsPerDay || meals.length,
    kcal: row.kcal,
    protein: row.protein,
    fat: row.fat,
    carbs: row.carbs,
    meals,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  })
}

export function tryToMentorRationDto(
  row: Parameters<typeof toMentorRationDto>[0],
): MentorRation | null {
  try {
    return toMentorRationDto(row)
  } catch {
    return null
  }
}

export function mentorRationWriteFields(input: UpsertMentorRationRequest) {
  const meals = input.meals
  if (meals.length === 0) {
    throw new UsersFailure('invalid', 'Add at least one meal')
  }
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
    title: input.title,
    description: input.description,
    goal: input.goal,
    image: meals[0]?.image ?? '',
    mealsPerDay: meals.length,
    meals,
    ...totals,
  }
}

function planDayCount(meals: UpsertMentorRationRequest['meals']) {
  return meals.reduce((span, meal) => Math.max(span, (meal.dayIndex ?? 0) + 1), 1)
}

function busiestDayMealCount(meals: UpsertMentorRationRequest['meals']) {
  const counts = new Map<number, number>()
  for (const meal of meals) {
    const index = meal.dayIndex ?? 0
    counts.set(index, (counts.get(index) ?? 0) + 1)
  }
  return Math.max(1, ...counts.values())
}

export function mentorPlanWriteFields(input: UpsertMentorRationRequest) {
  const fields = mentorRationWriteFields(input)
  return {
    ...fields,
    image: input.image || fields.image,
    days: planDayCount(input.meals),
    mealsPerDay: busiestDayMealCount(input.meals),
    source: 'План наставника',
  }
}
