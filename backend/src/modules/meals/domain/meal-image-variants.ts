export const MEAL_IMAGE_SIZES = ['card', 'full'] as const
export type MealImageSize = (typeof MEAL_IMAGE_SIZES)[number]

export const MEAL_IMAGE_SIZE_SPEC = {
  card: { maxEdge: 480, quality: 72 },
  full: { maxEdge: 1280, quality: 80 },
} as const

/** Missing or unknown `size` defaults to the feed thumbnail. Dialogs pass `full`. */
export function parseMealImageSize(raw: string | undefined): MealImageSize {
  return raw === 'full' ? 'full' : 'card'
}

export function mealImageCardKey(imageKey: string) {
  const trimmed = imageKey.trim()
  if (!trimmed) return trimmed
  if (/\.card\.webp$/i.test(trimmed)) return trimmed
  const lastSlash = trimmed.lastIndexOf('/')
  const dir = lastSlash >= 0 ? trimmed.slice(0, lastSlash + 1) : ''
  const file = lastSlash >= 0 ? trimmed.slice(lastSlash + 1) : trimmed
  const base = file.replace(/\.[^.]+$/, '') || file
  return `${dir}${base}.card.webp`
}
