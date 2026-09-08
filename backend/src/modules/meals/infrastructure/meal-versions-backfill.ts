import type { DbClient } from '../../../db'
import { createPrismaMealsRepository } from './meals-repository'
import { ensureMealVersions } from '../domain/meal-versions'
import {
  mealCategorySchema,
  mealSlotSchema,
} from '@web-app-demo/contracts'
import { extraImageKeysForActiveVersion } from '../domain/meal-versions'

export type MealVersionsBackfillResult = {
  scanned: number
  updated: number
}

export async function backfillMealVersions(
  db: DbClient,
): Promise<MealVersionsBackfillResult> {
  const repository = createPrismaMealsRepository(db)
  const meals = await db.meal.findMany({
    where: { activeVersionId: null },
    select: { id: true },
  })
  let updated = 0
  for (const row of meals) {
    const meal = await repository.findMealById(row.id)
    if (!meal) continue
    const ensured = ensureMealVersions({
      title: meal.title,
      ingredients: meal.ingredients,
      category: mealCategorySchema.parse(meal.category),
      mealSlot: mealSlotSchema.parse(meal.mealSlot),
      kcal: meal.kcal,
      protein: meal.protein,
      fat: meal.fat,
      carbs: meal.carbs,
      portionItems: meal.portionItems,
      clientComment: meal.clientComment,
      assumptions: meal.assumptions,
      micronutrients: meal.micronutrients,
      createdAt: meal.createdAt,
      extraImageKeys: extraImageKeysForActiveVersion(meal.versions, meal.activeVersionId),
      versions: meal.versions,
      activeVersionId: meal.activeVersionId,
    })
    if (
      meal.versions.length > 0
      && meal.activeVersionId === ensured.activeVersionId
      && meal.versions.length === ensured.versions.length
    ) {
      continue
    }
    await repository.updateMealContent(meal.id, {
      title: ensured.title,
      ingredients: ensured.ingredients,
      category: ensured.category,
      mealSlot: ensured.mealSlot,
      kcal: ensured.kcal,
      protein: ensured.protein,
      fat: ensured.fat,
      carbs: ensured.carbs,
      portionItems: ensured.portionItems,
      clientComment: ensured.clientComment,
      assumptions: ensured.assumptions,
      micronutrients: ensured.micronutrients,
      versions: ensured.versions,
      activeVersionId: ensured.activeVersionId!,
    })
    updated += 1
  }
  return { scanned: meals.length, updated }
}
