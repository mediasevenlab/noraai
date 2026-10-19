import type { RewriteMealRequest } from '@web-app-demo/contracts'

import { mealCompositionLines, type MealEntry } from '@/features/diary'
import {
  emptyPlanDayMeals,
  rationPlanDaySlots,
  titledDraftMeals,
  type RationDraft,
  type RationEntry,
  type RationMealDraft,
} from '@/features/mentor'
import {
  mealDraftToMeal,
  splitIngredientLines,
  splitStepLines,
} from '@/features/mentor/authored-rations'

import { emptyPlanEditorDay, type WeekPlanDay } from './week-plan'

const MEAL_SLOTS = ['Завтрак', 'Обед', 'Ужин', 'Перекус'] as const

function isMealSlot(value: string): value is (typeof MEAL_SLOTS)[number] {
  return (MEAL_SLOTS as readonly string[]).includes(value)
}

function mealIngredientsDraft(meal: MealEntry) {
  return mealCompositionLines(meal).join('\n')
}

const MEAL_CATEGORIES = ['Птица', 'Рыба', 'Мясо', 'Завтрак', 'Перекус', 'Каша'] as const

function portionObjects(meal: MealEntry): RewriteMealRequest['portionItems'] {
  return (meal.portionItems ?? []).flatMap((item) => {
    if (typeof item === 'string') {
      const label = item.trim()
      return label ? [{ label, kcal: 0, protein: 0, fat: 0, carbs: 0 }] : []
    }
    const label = item.label.trim()
    if (!label) return []
    return [{ label, kcal: item.kcal, protein: item.protein, fat: item.fat, carbs: item.carbs }]
  })
}

/** Null when the editor did not change this plate. Image bytes are attached by the caller. */
export function planMealRewriteRequest(
  meal: MealEntry,
  draft: RationMealDraft,
): RewriteMealRequest | null {
  const title = draft.title.trim()
  if (!title) return null
  const next = mealDraftToMeal(draft)
  const nextLines = splitIngredientLines(draft.ingredients)
  const currentLines = mealCompositionLines(meal)
  const sameLines = nextLines.join('\n') === currentLines.join('\n')
  const steps = splitStepLines(draft.stepsText).join('\n')
  const currentSteps = (meal.clientComment ?? '').trim()
  const imageChanged = draft.image.trim().length > 0 && draft.image.trim() !== meal.image.trim()
  if (
    title === meal.title.trim()
    && next.slot === meal.meal
    && next.kcal === meal.kcal
    && next.protein === meal.protein
    && next.fat === meal.fat
    && next.carbs === meal.carbs
    && sameLines
    && steps === currentSteps
    && !imageChanged
  ) {
    return null
  }
  const category =
    next.slot === 'Завтрак' || next.slot === 'Перекус'
      ? next.slot
      : MEAL_CATEGORIES.includes(meal.category as (typeof MEAL_CATEGORIES)[number])
        ? (meal.category as RewriteMealRequest['category'])
        : 'Мясо'
  const portionItems = sameLines
    ? portionObjects(meal)
    : nextLines.slice(0, 40).map((label) => ({
        label: label.slice(0, 200),
        kcal: 0,
        protein: 0,
        fat: 0,
        carbs: 0,
      }))
  return {
    title: title.slice(0, 200),
    ingredients: (sameLines ? meal.ingredients : nextLines.join(', ')).trim().slice(0, 500),
    category,
    meal: next.slot,
    kcal: next.kcal,
    protein: next.protein,
    fat: next.fat,
    carbs: next.carbs,
    portionItems,
    clientComment: steps.slice(0, 4000),
  }
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
  const weekDays = rationPlanDaySlots(drafts.length, now)
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
