/** Temporary tuner for unfinished black-and-white covers. Values are −100…100. */
export const PLANNED_COVER_GRADE_STORAGE_KEY = 'nora-planned-cover-grade'
export const PLANNED_COVER_GRADE_FILTER_ID = 'nora-planned-cover-grade'

export type PlannedCoverGrade = {
  exposure: number
  contrast: number
  highlights: number
}

export const DEFAULT_PLANNED_COVER_GRADE: PlannedCoverGrade = {
  exposure: -7,
  contrast: 11,
  highlights: -17,
}

const SVG_NS = 'http://www.w3.org/2000/svg'
const TABLE_STEPS = 16

function clampGrade(value: unknown) {
  const number = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(number)) return 0
  return Math.max(-100, Math.min(100, Math.round(number)))
}

export function parsePlannedCoverGrade(raw: string | null): PlannedCoverGrade {
  if (!raw) return DEFAULT_PLANNED_COVER_GRADE
  try {
    const parsed = JSON.parse(raw) as Partial<PlannedCoverGrade>
    return {
      exposure: clampGrade(parsed.exposure),
      contrast: clampGrade(parsed.contrast),
      highlights: clampGrade(parsed.highlights),
    }
  } catch {
    return DEFAULT_PLANNED_COVER_GRADE
  }
}

/** Identity at 0/0/0. Exposure is stops, contrast opens around mid-gray, highlights lift the bright end. */
export function plannedCoverGradeTable(grade: PlannedCoverGrade) {
  const exposure = grade.exposure / 100
  const contrast = grade.contrast / 100
  const highlights = grade.highlights / 100
  const values: string[] = []
  for (let step = 0; step <= TABLE_STEPS; step += 1) {
    let tone = step / TABLE_STEPS
    tone *= 2 ** exposure
    tone = (tone - 0.5) * (1 + contrast) + 0.5
    tone = Math.min(1, Math.max(0, tone))
    if (highlights !== 0 && tone > 0.5) {
      const weight = (tone - 0.5) * 2
      tone += highlights * weight * (1 - tone)
    }
    tone = Math.min(1, Math.max(0, tone))
    values.push(tone.toFixed(4))
  }
  return values.join(' ')
}

export function applyPlannedCoverGradeToDocument(grade: PlannedCoverGrade) {
  if (typeof document === 'undefined') return
  const table = plannedCoverGradeTable(grade)
  let filter = document.getElementById(PLANNED_COVER_GRADE_FILTER_ID)
  if (!filter || filter.namespaceURI !== SVG_NS) {
    const svg = document.createElementNS(SVG_NS, 'svg')
    svg.setAttribute('id', 'nora-planned-cover-grade-svg')
    svg.setAttribute('aria-hidden', 'true')
    svg.setAttribute('width', '0')
    svg.setAttribute('height', '0')
    svg.style.position = 'absolute'
    filter = document.createElementNS(SVG_NS, 'filter')
    filter.setAttribute('id', PLANNED_COVER_GRADE_FILTER_ID)
    filter.setAttribute('color-interpolation-filters', 'sRGB')
    const transfer = document.createElementNS(SVG_NS, 'feComponentTransfer')
    for (const channel of ['feFuncR', 'feFuncG', 'feFuncB']) {
      const fn = document.createElementNS(SVG_NS, channel)
      fn.setAttribute('type', 'table')
      fn.setAttribute('tableValues', table)
      transfer.appendChild(fn)
    }
    filter.appendChild(transfer)
    svg.appendChild(filter)
    document.body.appendChild(svg)
    return
  }
  for (const channel of ['feFuncR', 'feFuncG', 'feFuncB']) {
    filter.getElementsByTagName(channel)[0]?.setAttribute('tableValues', table)
  }
}
