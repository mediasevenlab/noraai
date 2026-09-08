export const PLANNED_COVER_BLUR_STORAGE_KEY = 'nora-planned-cover-blur'

function option(percent: number, label: string) {
  return {
    id: String(percent),
    label,
    percent,
    blur: `${percent * 0.25}px`,
  } as const
}

export const PLANNED_COVER_BLURS = [
  option(0, '0% · нет блюра'),
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

export type PlannedCoverBlurId = (typeof PLANNED_COVER_BLURS)[number]['id']

export const DEFAULT_PLANNED_COVER_BLUR: PlannedCoverBlurId = '0'

const PLANNED_COVER_BLUR_IDS = new Set<string>(PLANNED_COVER_BLURS.map((item) => item.id))

export function parsePlannedCoverBlurId(
  value: string | null | undefined,
): PlannedCoverBlurId {
  if (value && PLANNED_COVER_BLUR_IDS.has(value)) return value as PlannedCoverBlurId
  return DEFAULT_PLANNED_COVER_BLUR
}

export function plannedCoverBlurValue(blur: PlannedCoverBlurId) {
  return PLANNED_COVER_BLURS.find((item) => item.id === blur)?.blur ?? '0px'
}

export function applyPlannedCoverBlurToDocument(blur: PlannedCoverBlurId) {
  if (typeof document === 'undefined') return
  document.documentElement.setAttribute('data-planned-cover-blur', blur)
  document.documentElement.style.setProperty('--planned-cover-blur', plannedCoverBlurValue(blur))
}
