export const PLANNED_COVER_WASH_STORAGE_KEY = 'nora-planned-cover-wash'

function option(percent: number, label: string) {
  return {
    id: String(percent),
    label,
    percent,
    wash:
      percent === 0
        ? 'transparent'
        : `color-mix(in srgb, var(--nora-tint) ${percent}%, transparent)`,
  } as const
}

export const PLANNED_COVER_WASHES = [
  option(0, '0% · нет слоя'),
  option(2, '2%'),
  option(4, '4%'),
  option(6, '6%'),
  option(8, '8%'),
  option(10, '10%'),
  option(12, '12%'),
  option(14, '14%'),
  option(16, '16%'),
  option(20, '20%'),
  option(24, '24%'),
  option(28, '28%'),
  option(32, '32%'),
  option(36, '36%'),
  option(40, '40%'),
  option(44, '44%'),
  option(48, '48%'),
  option(52, '52%'),
  option(56, '56%'),
  option(60, '60%'),
  option(64, '64%'),
  option(68, '68%'),
  option(72, '72%'),
  option(76, '76%'),
  option(80, '80%'),
] as const

export type PlannedCoverWashId = (typeof PLANNED_COVER_WASHES)[number]['id']

export const DEFAULT_PLANNED_COVER_WASH: PlannedCoverWashId = '0'

const PLANNED_COVER_WASH_IDS = new Set<string>(PLANNED_COVER_WASHES.map((item) => item.id))

export function parsePlannedCoverWashId(
  value: string | null | undefined,
): PlannedCoverWashId {
  if (value && PLANNED_COVER_WASH_IDS.has(value)) return value as PlannedCoverWashId
  return DEFAULT_PLANNED_COVER_WASH
}

export function plannedCoverWashValue(wash: PlannedCoverWashId) {
  return PLANNED_COVER_WASHES.find((item) => item.id === wash)?.wash ?? 'transparent'
}

export function applyPlannedCoverWashToDocument(wash: PlannedCoverWashId) {
  if (typeof document === 'undefined') return
  document.documentElement.setAttribute('data-planned-cover-wash', wash)
  document.documentElement.style.setProperty('--planned-cover-wash', plannedCoverWashValue(wash))
}
