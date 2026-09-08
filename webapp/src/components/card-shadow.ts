export const CARD_SHADOW_STORAGE_KEY = 'nora-card-shadow'

export const CARD_SHADOWS = [
  { id: 'none', label: 'Нет', y: '0px', blur: '0px', alpha: '0%' },
  { id: 'hint', label: 'Едва', y: '2px', blur: '8px', alpha: '4%' },
  { id: 'faint', label: 'Чуть · по умолчанию', y: '3px', blur: '12px', alpha: '5%' },
  { id: 'soft', label: 'Слабо', y: '4px', blur: '16px', alpha: '6%' },
  { id: 'light', label: 'Легко', y: '6px', blur: '20px', alpha: '7%' },
  { id: 'mid', label: 'Средне', y: '8px', blur: '24px', alpha: '9%' },
  { id: 'clear', label: 'Заметно', y: '10px', blur: '28px', alpha: '11%' },
  { id: 'strong', label: 'Сильно', y: '12px', blur: '36px', alpha: '13%' },
  { id: 'deep', label: 'Глубоко', y: '16px', blur: '44px', alpha: '16%' },
  { id: 'max', label: 'Максимум', y: '20px', blur: '56px', alpha: '20%' },
] as const

export type CardShadowId = (typeof CARD_SHADOWS)[number]['id']

export const DEFAULT_CARD_SHADOW: CardShadowId = 'faint'

const CARD_SHADOW_IDS = new Set<string>(CARD_SHADOWS.map((item) => item.id))

export function parseCardShadowId(value: string | null | undefined): CardShadowId {
  if (value && CARD_SHADOW_IDS.has(value)) return value as CardShadowId
  return DEFAULT_CARD_SHADOW
}

export function applyCardShadowToDocument(shadow: CardShadowId) {
  if (typeof document === 'undefined') return
  document.documentElement.setAttribute('data-card-shadow', shadow)
}
