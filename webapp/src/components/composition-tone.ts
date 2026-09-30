export const COMPOSITION_TONE_STORAGE_KEY = 'nora-composition-tone'

export const COMPOSITION_TONES = [
  { id: 'current', label: 'Сейчас' },
  { id: 'soft', label: 'Чуть темнее' },
  { id: 'mid', label: 'Темнее' },
  { id: 'strong', label: 'Ещё темнее' },
  { id: 'title', label: 'Как заголовок' },
] as const

export type CompositionToneId = (typeof COMPOSITION_TONES)[number]['id']

export const DEFAULT_COMPOSITION_TONE: CompositionToneId = 'current'

const COMPOSITION_TONE_IDS = new Set<string>(COMPOSITION_TONES.map((item) => item.id))

export function parseCompositionToneId(value: string | null | undefined): CompositionToneId {
  if (value && COMPOSITION_TONE_IDS.has(value)) return value as CompositionToneId
  return DEFAULT_COMPOSITION_TONE
}

export function applyCompositionToneToDocument(tone: CompositionToneId) {
  if (typeof document === 'undefined') return
  document.documentElement.setAttribute('data-composition-tone', tone)
}
