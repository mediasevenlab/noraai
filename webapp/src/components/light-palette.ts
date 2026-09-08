export const LIGHT_PALETTE_STORAGE_KEY = 'nora-light-palette'

export const LIGHT_PALETTES = [
  { id: 'default', label: 'Базовая', panel: '#ffffff', canvas: '#eeeeee' },
  { id: 'paper', label: 'Бумага', panel: '#ffffff', canvas: '#f1f1ef' },
  { id: 'porcelain', label: 'Фарфор', panel: '#ffffff', canvas: '#f3f3f2' },
  { id: 'pearl', label: 'Жемчуг', panel: '#ffffff', canvas: '#f0f0f2' },
  { id: 'cloud', label: 'Облако', panel: '#ffffff', canvas: '#f2f3f3' },
  { id: 'dove', label: 'Голубь', panel: '#fdfdfd', canvas: '#eeeeee' },
  { id: 'aluminum', label: 'Алюминий', panel: '#f9f9fa', canvas: '#ebeced' },
  { id: 'rain', label: 'Дождь', panel: '#f7f8f9', canvas: '#e8eaec' },
  { id: 'breath', label: 'Дыхание', panel: '#ffffff', canvas: '#f0f2f1' },
  { id: 'limestone', label: 'Известняк', panel: '#fafbfb', canvas: '#eceeed' },
  { id: 'plaster', label: 'Штукатурка', panel: '#ffffff', canvas: '#f2f3f1' },
  { id: 'limewash', label: 'Известь', panel: '#ffffff', canvas: '#f2f2f2' },
  { id: 'gesso', label: 'Левкас', panel: '#ffffff', canvas: '#f5f5f4' },
  { id: 'kaolin', label: 'Каолин', panel: '#ffffff', canvas: '#eef0ef' },
  { id: 'calcite', label: 'Кальцит', panel: '#fafbfa', canvas: '#e9ebea' },
  { id: 'whisper', label: 'Шёпот', panel: '#ffffff', canvas: '#eff0f1' },
  { id: 'still', label: 'Штиль', panel: '#f7f8f8', canvas: '#e6e8e8' },
  { id: 'nordic', label: 'Нордик', panel: '#ffffff', canvas: '#f4f5f4' },
  { id: 'mineral', label: 'Минерал', panel: '#f5f6f5', canvas: '#e3e5e4' },
  { id: 'honed', label: 'Шлифовка', panel: '#f6f7f6', canvas: '#e5e7e6' },
  { id: 'dolomite', label: 'Доломит', panel: '#fafbfb', canvas: '#edeeef' },
  { id: 'feldspar', label: 'Шпат', panel: '#f3f4f3', canvas: '#e1e3e2' },
  { id: 'dew', label: 'Роса', panel: '#ffffff', canvas: '#f6f7f6' },
  { id: 'cirrus', label: 'Циррус', panel: '#ffffff', canvas: '#f3f4f5' },
  { id: 'hush', label: 'Тишь', panel: '#f8f8f9', canvas: '#e7e8ea' },
  { id: 'gallery', label: 'Галерея', panel: '#ffffff', canvas: '#f7f8f7' },
  { id: 'zen', label: 'Дзен', panel: '#ffffff', canvas: '#eef0f0' },
  { id: 'spa', label: 'Спа', panel: '#ffffff', canvas: '#f1f3f2' },
  { id: 'wisp', label: 'Дымка', panel: '#ffffff', canvas: '#f4f5f6' },
  { id: 'murmur', label: 'Шорох', panel: '#ffffff', canvas: '#eff0f1' },
] as const

export type LightPaletteId = (typeof LIGHT_PALETTES)[number]['id']

export const DEFAULT_LIGHT_PALETTE: LightPaletteId = 'pearl'

const LIGHT_PALETTE_IDS = new Set<string>(LIGHT_PALETTES.map((palette) => palette.id))

export function parseLightPaletteId(value: string | null | undefined): LightPaletteId {
  if (value && LIGHT_PALETTE_IDS.has(value)) return value as LightPaletteId
  return DEFAULT_LIGHT_PALETTE
}

export function lightPaletteClassName(id: LightPaletteId) {
  return `light-palette-${id}`
}

export function allLightPaletteClassNames() {
  return LIGHT_PALETTES.map((palette) => lightPaletteClassName(palette.id))
}

/** Classes for <html>. Dark never carries a light palette. */
export function noraSchemeClassNames(isDark: boolean, palette: LightPaletteId) {
  if (isDark) return ['scheme-editor-dark'] as const
  return ['scheme-editor-light', lightPaletteClassName(palette), 'light-text-default'] as const
}
