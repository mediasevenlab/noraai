export const CARD_RADIUS_STORAGE_KEY = 'nora-card-radius-v2'

/** Padding around the diary card preview (`px-2` / `pt-2`). */
export const MEAL_CARD_PREVIEW_INSET_PX = 8

function option(radiusPx: number, label: string) {
  return {
    id: String(radiusPx),
    label,
    radius: `${radiusPx}px`,
    preview: `${Math.max(0, radiusPx - 4)}px`,
  } as const
}

export const CARD_RADII = [
  option(8, '8 px'),
  option(10, '10 px'),
  option(12, '12 px'),
  option(14, '14 px'),
  option(16, '16 px · по умолчанию'),
  option(18, '18 px'),
  option(20, '20 px'),
  option(22, '22 px'),
  option(24, '24 px'),
  option(28, '28 px'),
] as const

export type CardRadiusId = (typeof CARD_RADII)[number]['id']

export const DEFAULT_CARD_RADIUS: CardRadiusId = '16'

const CARD_RADIUS_IDS = new Set<string>(CARD_RADII.map((item) => item.id))

export function parseCardRadiusId(value: string | null | undefined): CardRadiusId {
  if (value && CARD_RADIUS_IDS.has(value)) return value as CardRadiusId
  return DEFAULT_CARD_RADIUS
}

export function applyCardRadiusToDocument(radius: CardRadiusId) {
  if (typeof document === 'undefined') return
  document.documentElement.setAttribute('data-card-radius', radius)
}
