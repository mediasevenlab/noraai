import { CATALOG_FLOOR, moscowDate, shiftDay, TODAY_SWEEP_MS } from './open-sync'
import { PACK_REGIONS, remainingLabel } from './pack-sync'

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

function daysInclusive(from: string, to: string) {
  const start = Date.parse(`${from}T00:00:00Z`)
  const end = Date.parse(`${to}T00:00:00Z`)
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) return 1
  return Math.round((end - start) / 86_400_000) + 1
}

/** How many day-region-type steps the first closing pass contains. */
export function closureCellsTotal(today: string) {
  return daysInclusive(CATALOG_FLOOR, today) * PACK_REGIONS.length * CLOSURE_KINDS.length
}

/** Steps already finished. The walk goes from today back toward the floor. */
export function closureCellsDone(plan: ClosurePlan, today: string) {
  const total = closureCellsTotal(today)
  if (plan.phase === 'catchup') return total
  const finishedDays = daysInclusive(plan.day, today) - 1
  const done = finishedDays * PACK_REGIONS.length * CLOSURE_KINDS.length
    + plan.regionIndex * CLOSURE_KINDS.length
    + plan.kindIndex
  return Math.max(0, Math.min(total, done))
}

export function closureEta(plan: ClosurePlan, now: Date) {
  const today = moscowDate(now)
  const total = closureCellsTotal(today)
  const done = closureCellsDone(plan, today)
  if (plan.phase === 'catchup') return { done, total, eta: 'Первый проход закончен' }
  const elapsed = plan.startedAt ? now.getTime() - Date.parse(plan.startedAt) : 0
  if (!plan.startedAt || done < 30 || elapsed < 2 * 60 * 1000) {
    return { done, total, eta: 'Скорость ещё считается' }
  }
  const remaining = Math.max(0, total - done) * (elapsed / done)
  return { done, total, eta: `около ${remainingLabel(remaining)}` }
}

/** The bar for the closing pass. After the first pass it follows today's sweep. */
export function closureActivity(plan: ClosurePlan, now: Date) {
  if (plan.phase === 'catalog') {
    const progress = closureEta(plan, now)
    return { done: progress.done, total: progress.total, note: progress.eta }
  }
  const total = PACK_REGIONS.length * CLOSURE_KINDS.length
  const reading = closureToRun(plan, now)
  if (!reading) {
    const swept = plan.todaySweptAt ? Date.parse(plan.todaySweptAt) : now.getTime()
    const left = Math.max(0, TODAY_SWEEP_MS - (now.getTime() - swept))
    return { done: total, total, note: `Следующая через ${remainingLabel(left)}` }
  }
  const done = Math.min(total, reading.regionIndex * CLOSURE_KINDS.length + reading.kindIndex)
  const note = reading.day === moscowDate(now) ? 'Идёт проверка сегодняшнего дня' : `Идёт проверка за ${reading.day}`
  return { done, total, note }
}

export function closureStatus(plan: ClosurePlan, now: Date) {
  const progress = closureEta(plan, now)
  const activity = closureActivity(plan, now)
  const cell = closureCell(plan)
  return {
    phase: plan.phase === 'catalog' ? 'closure' : 'closure-daily',
    day: `${plan.day}, регион ${cell.region}, ${cell.label}`,
    done: activity.done,
    total: activity.total,
    note: activity.note,
    removed: plan.removed,
    cellsDone: progress.done,
    cellsTotal: progress.total,
  }
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
