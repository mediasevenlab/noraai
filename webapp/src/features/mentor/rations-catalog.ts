import { groceryShoppingLines, mergeGroceryShoppingLines } from '@/platform/grocery-lines'

export type RationGoal = 'Похудение' | 'Набор' | 'Поддержание' | 'Здоровье'

/** Fixed category ceiling shown in the group bar — not the max of visible cards. */
export const RATION_GOAL_KCAL_CAP: Record<RationGoal, number> = {
  Похудение: 1700,
  Набор: 2800,
  Поддержание: 2300,
  Здоровье: 2100,
}
export type RationMealSlot = 'Завтрак' | 'Обед' | 'Ужин' | 'Перекус'

export type RationMeal = {
  slot: RationMealSlot
  title: string
  ingredients: string
  steps: string[]
  image: string
  kcal: number
  protein: number
  fat: number
  carbs: number
}

export type RationEntry = {
  id: string
  title: string
  description: string
  goal: RationGoal
  days: number
  kcal: number
  protein: number
  fat: number
  carbs: number
  mealsPerDay: number
  image: string
  source: string
  meals: RationMeal[]
}

export function rationIngredientItems(ingredients: string): string[] {
  return groceryShoppingLines(ingredients)
}

export function rationShoppingItems(meals: readonly RationMeal[]) {
  const labels: string[] = []
  for (const meal of meals) {
    labels.push(...rationIngredientItems(meal.ingredients))
  }
  return mergeGroceryShoppingLines(labels)
}

export function rationMealImages(ration: Pick<RationEntry, 'meals'>) {
  return ration.meals.map((meal) => meal.image).filter((src) => src.trim().length > 0)
}

/** One capsule circle per meal, including meals that still have no photo. */
export function rationCardThumbSrcs(ration: Pick<RationEntry, 'meals'>) {
  return ration.meals.map((meal) => meal.image.trim())
}

export function rationDayTotals(meals: readonly RationMeal[]) {
  return meals.reduce(
    (sum, meal) => ({
      kcal: sum.kcal + meal.kcal,
      protein: sum.protein + meal.protein,
      fat: sum.fat + meal.fat,
      carbs: sum.carbs + meal.carbs,
    }),
    { kcal: 0, protein: 0, fat: 0, carbs: 0 },
  )
}
