import { CATALOG_FLOOR, moscowDate, shiftDay, TODAY_SWEEP_MS } from './open-sync'
import { PACK_REGIONS } from './pack-sync'

/** Documents that mean a purchase is finished or cancelled. Notices stay on their own queue. */
export const CLOSURE_KINDS = [
  { subsystem: 'PRIZ', documentType: 'epProtocolEZT2020Final', label: 'итог единственного поставщика' },
  { subsystem: 'PRIZ', documentType: 'epProtocolEF2020Final', label: 'итог аукциона' },
  { subsystem: 'PRIZ', documentType: 'epProtocolEOK2020Final', label: 'итог конкурса' },
  { subsystem: 'PRIZ', documentType: 'epProtocolEZK2020Final', label: 'итог котировок' },
  { subsystem: 'PRIZ', documentType: 'epNotificationCancel', label: 'отмена извещения' },
  { subsystem: 'PRIZ', documentType: 'fcsNotificationCancel', label: 'отмена старого извещения' },
  { subsystem: 'RI223', documentType: 'purchaseProtocol', label: 'протокол 223-ФЗ' },
  { subsystem: 'RI223', documentType: 'purchaseRejection', label: 'отказ 223-ФЗ' },
  { subsystem: 'RI223', documentType: 'purchaseContract', label: 'договор в извещении 223-ФЗ' },
  { subsystem: 'RD223', documentType: 'contract', label: 'договор 223-ФЗ' },
  { subsystem: 'RGK', documentType: 'contract', label: 'контракт 44-ФЗ' },
] as const

export type ClosurePlan = {
  mode: 'closure'
  phase: 'catalog' | 'catchup'
  day: string
  regionIndex: number
  kindIndex: number
  lastClosedDay: string
  todaySweptAt: string
  removed: number
  failed: number
  startedAt: string
}

export function initialClosurePlan(today: string): ClosurePlan {
  return {
    mode: 'closure',
    phase: 'catalog',
    day: today,
    regionIndex: 0,
    kindIndex: 0,
    lastClosedDay: '',
    todaySweptAt: '',
    removed: 0,
    failed: 0,
    startedAt: '',
  }
}

export function closureCell(plan: ClosurePlan) {
  const region = PACK_REGIONS[plan.regionIndex] ?? PACK_REGIONS[0]!
  const kind = CLOSURE_KINDS[plan.kindIndex] ?? CLOSURE_KINDS[0]!
  return { day: plan.day, region, ...kind }
}

/** The cell just finished. History walks backward, then recent days repeat. */
export function advanceClosure(plan: ClosurePlan, now: Date): ClosurePlan {
  let kindIndex = plan.kindIndex + 1
  let regionIndex = plan.regionIndex
  let day = plan.day
  if (kindIndex < CLOSURE_KINDS.length) return { ...plan, kindIndex }
  kindIndex = 0
  regionIndex += 1
  if (regionIndex < PACK_REGIONS.length) return { ...plan, regionIndex, kindIndex }
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

/** Null means today's closing documents were read recently and the loop should wait. */
export function closureToRun(plan: ClosurePlan, now: Date): ClosurePlan | null {
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

const NUMBER_TAGS = ['purchaseNumber', 'purchaseNoticeNumber', 'notificationNumber']

/** Purchase numbers named by a protocol, cancellation, or contract. The file itself is not kept. */
export function closureNumbers(xml: string) {
  const found: string[] = []
  for (const name of NUMBER_TAGS) {
    const pattern = new RegExp(`<(?:[\\w]+:)?${name}>(\\d{8,30})<`, 'g')
    for (const match of xml.matchAll(pattern)) {
      const number = match[1]
      if (number && !found.includes(number)) found.push(number)
    }
  }
  return found
}
