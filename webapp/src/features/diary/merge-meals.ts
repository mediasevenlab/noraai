import type { MealDto } from '@web-app-demo/contracts'

import { isPersistedMealImageUrl, resolveMealCover, usableMealCover } from './meal-cover'
import type { MealEntry } from './meals-catalog'

export function mealDtoToEntry(meal: MealDto): MealEntry {
  const extraImages = (meal.extraImageUrls ?? []).filter(isPersistedMealImageUrl)
  return {
    id: meal.id,
    title: meal.title,
    ingredients: meal.ingredients,
    category: meal.category,
    meal: meal.meal,
    at: meal.recordedAt,
    kcal: meal.kcal,
    protein: meal.protein,
    fat: meal.fat,
    carbs: meal.carbs,
    image: resolveMealCover(meal.imageUrl, meal.title),
    extraImages: extraImages.length ? extraImages : undefined,
    portionItems: meal.portionItems,
    clientComment: meal.clientComment || undefined,
    assumptions: meal.assumptions.length > 0 ? meal.assumptions : undefined,
    micronutrients: meal.micronutrients.length > 0 ? meal.micronutrients : undefined,
    versions: meal.versions.map((version, index) => ({
      id: version.id,
      createdAt: version.createdAt,
      label: `vers. ${index + 1}.0`,
      note: version.note,
    })),
    activeVersionId: meal.activeVersionId,
    fromApi: true,
    shared: meal.shared,
    authorName: meal.authorName,
    likeCount: meal.likeCount,
    liked: meal.liked,
    unread: meal.unread,
  }
}

export function mealCarouselImages(input: {
  cover: string
  extraImages?: string[]
  galleryExtras?: string[]
}): string[] {
  const extras = input.extraImages?.length ? input.extraImages : (input.galleryExtras ?? [])
  return [input.cover, ...extras].filter(
    (src, index, all): src is string =>
      Boolean(usableMealCover(src)) && all.indexOf(src) === index,
  )
}

/** Merge server meals with demo catalog meals; API meals win on id collision. */
export function mergeDemoAndApiMeals(
  demoMeals: readonly MealEntry[],
  apiMeals: readonly MealDto[],
): MealEntry[] {
  const byId = new Map<string, MealEntry>()
  for (const meal of demoMeals) {
    byId.set(meal.id, meal)
  }
  for (const meal of apiMeals) {
    byId.set(meal.id, mealDtoToEntry(meal))
  }
  return [...byId.values()].sort((left, right) => (left.at < right.at ? 1 : left.at > right.at ? -1 : 0))
}
