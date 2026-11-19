import { CATALOG_FLOOR, moscowDate, shiftDay, TODAY_SWEEP_MS } from './open-sync'

const REGION_GAPS = new Set([80, 81, 82, 84, 85, 88])

/** Subject codes the archive accepts, including a leading zero. */
export const PACK_REGIONS = Array.from({ length: 95 }, (_, index) => index + 1)
  .filter((code) => !REGION_GAPS.has(code))
  .map((code) => String(code).padStart(2, '0'))

/** Notice archives only. Contracts and protocols are a different document type. */
export const PACK_KINDS = [
  { subsystem: 'PRIZ', documentType: 'epNotificationEF2020', label: 'аукцион 44-ФЗ' },
  { subsystem: 'PRIZ', documentType: 'epNotificationEOK2020', label: 'конкурс 44-ФЗ' },
  { subsystem: 'PRIZ', documentType: 'epNotificationEOKOU2020', label: 'конкурс с ограниченным участием' },
  { subsystem: 'PRIZ', documentType: 'epNotificationEZK2020', label: 'запрос котировок' },
  { subsystem: 'PRIZ', documentType: 'epNotificationEZT2020', label: 'запрос предложений' },
  { subsystem: 'RI223', documentType: 'purchaseNotice', label: '223-ФЗ' },
] as const

export type PackPlan = {
  mode: 'packs'
  phase: 'catalog' | 'catchup'
  day: string
  regionIndex: number
  kindIndex: number
  lastClosedDay: string
  todaySweptAt: string
  dropped: number
  failed: number
}

export function initialPackPlan(today: string): PackPlan {
  return {
    mode: 'packs',
    phase: 'catalog',
    day: today,
    regionIndex: 0,
    kindIndex: 0,
    lastClosedDay: '',
    todaySweptAt: '',
    dropped: 0,
    failed: 0,
  }
}

export function packCell(plan: PackPlan) {
  const region = PACK_REGIONS[plan.regionIndex] ?? PACK_REGIONS[0]!
  const kind = PACK_KINDS[plan.kindIndex] ?? PACK_KINDS[0]!
  return { day: plan.day, region, ...kind }
}

/** The cell just finished. The next one is what the loop asks for. */
export function advancePack(plan: PackPlan, now: Date): PackPlan {
  let kindIndex = plan.kindIndex + 1
  let regionIndex = plan.regionIndex
  let day = plan.day
  if (kindIndex < PACK_KINDS.length) {
    return { ...plan, kindIndex }
  }
  kindIndex = 0
  regionIndex += 1
  if (regionIndex < PACK_REGIONS.length) {
    return { ...plan, regionIndex, kindIndex }
  }
  regionIndex = 0
  if (plan.phase === 'catalog') {
    const previous = shiftDay(day, -1)
    if (previous < CATALOG_FLOOR) {
      const today = moscowDate(now)
      return {
        ...plan,
        phase: 'catchup',
        day: today,
        regionIndex: 0,
        kindIndex: 0,
        lastClosedDay: shiftDay(today, -1),
        todaySweptAt: now.toISOString(),
      }
    }
    return { ...plan, day: previous, regionIndex: 0, kindIndex: 0 }
  }
  const today = moscowDate(now)
  if (day < today) {
    return { ...plan, day: shiftDay(day, 1), regionIndex: 0, kindIndex: 0, lastClosedDay: day }
  }
  return {
    ...plan,
    day: today,
    regionIndex: 0,
    kindIndex: 0,
    lastClosedDay: shiftDay(today, -1),
    todaySweptAt: now.toISOString(),
  }
}

/** Null means today's packs were read recently and the loop should wait. */
export function packToRun(plan: PackPlan, now: Date): PackPlan | null {
  if (plan.phase === 'catalog') return plan
  const today = moscowDate(now)
  const yesterday = shiftDay(today, -1)
  if (plan.lastClosedDay < yesterday) {
    const start = plan.lastClosedDay ? shiftDay(plan.lastClosedDay, 1) : yesterday
    if (plan.day >= start && plan.day <= today) return plan
    return { ...plan, day: start, regionIndex: 0, kindIndex: 0 }
  }
  if (plan.regionIndex > 0 || plan.kindIndex > 0) return plan
  const swept = plan.todaySweptAt ? Date.parse(plan.todaySweptAt) : 0
  if (now.getTime() - swept < TODAY_SWEEP_MS) return null
  return { ...plan, day: today, regionIndex: 0, kindIndex: 0 }
}
