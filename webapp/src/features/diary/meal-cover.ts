import { MEAL_CATALOG } from './meals-catalog'
import { setRationImportedMealTitles } from './ration-import'

export const MEAL_COVER_PLACEHOLDER_SRC = '/diary/meal-preview-placeholder.jpg'

const extraCovers = new Map<string, string>()

/** Register title → local cover paths from other catalogs (rations). */
export function setMealCoverExtras(entries: Iterable<readonly [string, string]>) {
  extraCovers.clear()
  const titles: string[] = []
  for (const [title, image] of entries) {
    if (title && image) {
      extraCovers.set(title, image)
      titles.push(title)
    }
  }
  setRationImportedMealTitles(titles)
}

/** True when the URL is a real file, not the unsigned empty-meal API stub. */
export function isPersistedMealImageUrl(url: string | undefined): boolean {
  if (!url) return false
  if (/[?&]sig=/.test(url)) return true
  return !/\/api\/meals\/[^/]+\/(?:image|extras\/\d+)\/?$/.test(url)
}

export function resolveMealCover(imageUrl: string | undefined, title: string): string {
  if (isPersistedMealImageUrl(imageUrl)) return imageUrl!
  const catalog = MEAL_CATALOG.find((meal) => meal.title === title)
  if (catalog?.image) return catalog.image
  return extraCovers.get(title) ?? MEAL_COVER_PLACEHOLDER_SRC
}
