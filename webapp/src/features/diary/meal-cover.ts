import { MEAL_CATALOG } from './meals-catalog'
import { setRationImportedMealTitles } from './ration-import'

export const MEAL_COVER_PLACEHOLDER_SRC = '/diary/meal-preview-placeholder.jpg'
export const MEAL_COVER_STUB_SRC = '/diary/meal-cover-placeholder.png'
export const PLAN_COVER_PLACEHOLDER_SRC = '/rations/plan-cover-placeholder.png'

export function isCoverPlaceholder(src: string | undefined): boolean {
  const cover = src?.trim() ?? ''
  return (
    cover === MEAL_COVER_PLACEHOLDER_SRC ||
    cover === MEAL_COVER_STUB_SRC ||
    cover === PLAN_COVER_PLACEHOLDER_SRC
  )
}

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

/** Real photo for plan covers and meal copies — skip empty stubs and collage/plan placeholders. */
export function usableMealCover(src: string | undefined): string {
  const cover = src?.trim() ?? ''
  if (!cover || isCoverPlaceholder(cover)) return ''
  if (cover.startsWith('data:')) return cover
  if (!isPersistedMealImageUrl(cover)) return ''
  return cover
}

/** Plan-owned cover that can be stored. Signed meal routes expire; live meal photos replace them. */
export function durablePlanCoverSrc(src: string | undefined): string {
  const cover = usableMealCover(src)
  if (!cover || cover.includes('/api/meals/')) return ''
  return cover
}

/** Plan card / create-from-scratch preview when there is no meal photo yet. */
export function displayPlanCover(src: string | undefined): string {
  return usableMealCover(src) || PLAN_COVER_PLACEHOLDER_SRC
}

/** Meal editor preview when the dish has no photo yet. */
export function displayMealCover(src: string | undefined): string {
  return usableMealCover(src) || MEAL_COVER_STUB_SRC
}

export function preferredMealPhotoSrc(meal: {
  image?: string
  extraImages?: readonly string[]
}) {
  return (
    usableMealCover(meal.image) ||
    meal.extraImages?.map((src) => usableMealCover(src)).find(Boolean) ||
    ''
  )
}

export function resolveMealCover(imageUrl: string | undefined, title: string): string {
  if (isPersistedMealImageUrl(imageUrl)) return imageUrl!
  const catalog = MEAL_CATALOG.find((meal) => meal.title === title)
  if (catalog?.image) return catalog.image
  return extraCovers.get(title) ?? MEAL_COVER_PLACEHOLDER_SRC
}
