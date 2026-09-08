import { isUuid } from './mentor-ration'

const FAVORITE_MEAL_ID_MAX = 80

/** Meal ids that PostgreSQL can look up on `Meal.id` (`uuid`). */
export function uuidMealIds(ids: readonly string[]): string[] {
  return ids.filter((id) => isUuid(id))
}

/** Favorites JSON the API can return without failing contract validation. */
export function publishedFavoriteMealIds(ids: readonly string[]): string[] {
  return uuidMealIds(ids).filter((id) => id.length <= FAVORITE_MEAL_ID_MAX)
}
