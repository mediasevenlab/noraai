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
  startedAt: string
  baseDone: number
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
    startedAt: '',
    baseDone: 0,
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

export const SAVED_PAGE_SIZE = 50

function daysInclusive(from: string, to: string) {
  const start = Date.parse(`${from}T00:00:00Z`)
  const end = Date.parse(`${to}T00:00:00Z`)
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) return 1
  return Math.round((end - start) / 86_400_000) + 1
}

/** How many day-region-type steps the first pass contains. */
export function packCellsTotal(today: string) {
  return daysInclusive(CATALOG_FLOOR, today) * PACK_REGIONS.length * PACK_KINDS.length
}

/** Steps already finished. The walk goes from today back toward the floor. */
export function packCellsDone(plan: PackPlan, today: string) {
  const total = packCellsTotal(today)
  if (plan.phase === 'catchup') return total
  const finishedDays = daysInclusive(plan.day, today) - 1
  const done = finishedDays * PACK_REGIONS.length * PACK_KINDS.length
    + plan.regionIndex * PACK_KINDS.length
    + plan.kindIndex
  return Math.max(0, Math.min(total, done))
}

export function packEta(plan: PackPlan, now: Date) {
  const today = moscowDate(now)
  const total = packCellsTotal(today)
  const done = packCellsDone(plan, today)
  if (plan.phase === 'catchup') return { done, total, eta: 'Первый проход закончен' }
  const elapsed = plan.startedAt ? now.getTime() - Date.parse(plan.startedAt) : 0
  const gained = done - plan.baseDone
  if (!plan.startedAt || gained < 30 || elapsed < 2 * 60 * 1000) {
    return { done, total, eta: 'Скорость ещё считается' }
  }
  const remaining = Math.max(0, total - done) * (elapsed / gained)
  return { done, total, eta: `около ${remainingLabel(remaining)}` }
}

/** The bar for the work happening now. After the first pass it follows today's sweep. */
export function packActivity(plan: PackPlan, now: Date) {
  if (plan.phase === 'catalog') {
    const progress = packEta(plan, now)
    return { done: progress.done, total: progress.total, note: progress.eta }
  }
  const total = PACK_REGIONS.length * PACK_KINDS.length
  const reading = packToRun(plan, now)
  if (!reading) {
    const swept = plan.todaySweptAt ? Date.parse(plan.todaySweptAt) : now.getTime()
    const left = Math.max(0, TODAY_SWEEP_MS - (now.getTime() - swept))
    return { done: total, total, note: `Следующая через ${remainingLabel(left)}` }
  }
  const done = Math.min(total, reading.regionIndex * PACK_KINDS.length + reading.kindIndex)
  const note = reading.day === moscowDate(now) ? 'Идёт подкачка сегодняшнего дня' : `Идёт подкачка за ${reading.day}`
  return { done, total, note }
}

function remainingLabel(ms: number) {
  const minutes = Math.max(1, Math.round(ms / 60_000))
  if (minutes < 90) return `${minutes} ${plural(minutes, 'минуту', 'минуты', 'минут')}`
  const hours = Math.round(minutes / 60)
  if (hours < 36) return `${hours} ${plural(hours, 'час', 'часа', 'часов')}`
  const days = Math.max(1, Math.round(hours / 24))
  return `${days} ${plural(days, 'день', 'дня', 'дней')}`
}

function plural(value: number, one: string, few: string, many: string) {
  const abs = Math.abs(value) % 100
  const digit = abs % 10
  if (abs > 10 && abs < 20) return many
  if (digit === 1) return one
  if (digit >= 2 && digit <= 4) return few
  return many
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
