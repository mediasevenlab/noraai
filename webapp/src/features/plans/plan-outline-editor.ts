import { mealCompositionLines, type MealEntry } from '@/features/diary'
import {
  emptyPlanDayMeals,
  rationPlanWeekDays,
  titledDraftMeals,
  type RationDraft,
  type RationEntry,
  type RationMealDraft,
} from '@/features/mentor'

import { emptyPlanEditorDay, type WeekPlanDay } from './week-plan'

const MEAL_SLOTS = ['Завтрак', 'Обед', 'Ужин', 'Перекус'] as const

function isMealSlot(value: string): value is (typeof MEAL_SLOTS)[number] {
  return (MEAL_SLOTS as readonly string[]).includes(value)
}

function mealIngredientsDraft(meal: MealEntry) {
  return mealCompositionLines(meal).join('\n')
}

export function mealEntryToRationDraft(meal: MealEntry): RationMealDraft {
  return {
    key: meal.id,
    slot: isMealSlot(meal.meal) ? meal.meal : 'Завтрак',
    title: meal.title,
    ingredients: mealIngredientsDraft(meal),
    stepsText: meal.clientComment ?? '',
    image: meal.image,
    kcal: meal.kcal ? String(meal.kcal) : '',
    protein: meal.protein ? String(meal.protein) : '',
    fat: meal.fat ? String(meal.fat) : '',
    carbs: meal.carbs ? String(meal.carbs) : '',
  }
}

export function weekPlanDaysToDraftDays(days: readonly WeekPlanDay[]): RationMealDraft[][] {
  return days.map((day) =>
    day.meals.length > 0 ? day.meals.map(mealEntryToRationDraft) : emptyPlanDayMeals(),
  )
}

export function applyPlanDayDrafts(
  days: readonly WeekPlanDay[],
  drafts: readonly RationMealDraft[][],
  now = new Date(),
): WeekPlanDay[] {
  const byId = new Map<string, MealEntry>()
  for (const day of days) {
    for (const meal of day.meals) byId.set(meal.id, meal)
  }
  const weekDays = rationPlanWeekDays(now)
  return drafts.map((dayDrafts, index) => {
    const slot = days[index] ?? (weekDays[index] ? emptyPlanEditorDay(weekDays[index]!) : null)
    const meals = dayDrafts
      .map((draft) => byId.get(draft.key))
      .filter((meal): meal is MealEntry => Boolean(meal))
    if (!slot) {
      return {
        dayKey: `day-${index}`,
        short: `День ${index + 1}`,
        label: `День ${index + 1}`,
        dayIso: new Date().toISOString(),
        filled: meals.length > 0,
        ration: null,
        meals,
        mealsCount: meals.length,
        kcal: meals.reduce((sum, meal) => sum + meal.kcal, 0),
        done: false,
      }
    }
    return {
      ...slot,
      meals,
      mealsCount: meals.length,
      kcal: meals.reduce((sum, meal) => sum + meal.kcal, 0),
      filled: meals.length > 0,
    }
  })
}

export function newMealRationsFromPlanDrafts(
  originalDays: readonly WeekPlanDay[],
  drafts: readonly RationMealDraft[][],
  form: Pick<RationDraft, 'id' | 'title' | 'description' | 'goal'>,
): RationEntry[] {
  const existing = new Set(originalDays.flatMap((day) => day.meals.map((meal) => meal.id)))
  const title = form.title.trim() || 'План'
  return drafts.map((dayDrafts, index) => {
    const meals = titledDraftMeals(dayDrafts.filter((draft) => !existing.has(draft.key)))
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
      id: form.id?.trim() || `plan-day-${index}`,
      title,
      description: form.description.trim(),
      goal: form.goal,
      days: drafts.length,
      mealsPerDay: meals.length,
      image: meals.find((meal) => meal.image.trim())?.image ?? '',
      source: 'План',
      meals,
      ...totals,
    }
  })
}
