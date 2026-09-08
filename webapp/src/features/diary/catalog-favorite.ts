import type { CreateUserMealRequest } from '@web-app-demo/contracts'

import type { MealEntry } from './meals-catalog'

/** Hidden stamp so a catalog preview bookmark can find its diary copy. */
export const CATALOG_FAVORITE_SOURCE_MARK = 'Добавлено из каталога'
export const CATALOG_FAVORITE_ID_PREFIX = 'Каталог:'

export function catalogFavoriteSourceAssumption(previewMealId: string) {
  return `${CATALOG_FAVORITE_ID_PREFIX}${previewMealId}`
}

export function catalogFavoriteSourceIdFromAssumptions(
  assumptions: readonly string[] | undefined,
): string | null {
  const hit = assumptions?.find((item) => item.startsWith(CATALOG_FAVORITE_ID_PREFIX))
  if (!hit) return null
  const id = hit.slice(CATALOG_FAVORITE_ID_PREFIX.length).trim()
  return id || null
}

export function isPlanPreviewMealId(id: string) {
  return id.startsWith('plan-preview:')
}

export function isCatalogFavoriteMeal(meal: {
  id?: string
  assumptions?: readonly string[]
}): boolean {
  if (meal.id && isPlanPreviewMealId(meal.id)) return true
  const assumptions = meal.assumptions ?? []
  return (
    assumptions.includes(CATALOG_FAVORITE_SOURCE_MARK)
    || catalogFavoriteSourceIdFromAssumptions(assumptions) != null
  )
}

export function catalogFavoriteCreateDraft(
  meal: Pick<
    MealEntry,
    'id' | 'title' | 'ingredients' | 'category' | 'meal' | 'kcal' | 'protein' | 'fat' | 'carbs'
  >,
  now = new Date(),
): CreateUserMealRequest {
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
    portionItems: [],
    clientComment: '',
    assumptions: [CATALOG_FAVORITE_SOURCE_MARK, catalogFavoriteSourceAssumption(meal.id)],
    micronutrients: [],
    source: 'manual',
    clientKey: `cf:${meal.id}`.slice(0, 64),
  }
}

export function apiMealIdForCatalogPreview(
  previewId: string,
  meals: ReadonlyArray<{ id: string; assumptions?: readonly string[] }>,
): string | undefined {
  return meals.find(
    (meal) => catalogFavoriteSourceIdFromAssumptions(meal.assumptions) === previewId,
  )?.id
}
