/** First day of the initial pass. Older open notices stay outside this sweep. */
export const CATALOG_FLOOR = '2025-01-01'
export const PAGE_SIZE = 50
/** A day of still-open notices is about 17 thousand. Past this the site page is not trusted. */
export const PAGE_CAP = 400
export const TODAY_SWEEP_MS = 6 * 60 * 60 * 1000

export type OpenSyncPlan = {
  phase: 'catalog' | 'catchup'
  day: string
  page: number
  lastClosedDay: string
  todaySweptAt: string
  truncatedDays: string[]
}

export function moscowDate(now: Date) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Moscow',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now)
}

export function shiftDay(iso: string, days: number) {
  const [year, month, day] = iso.split('-').map(Number)
  const date = new Date(Date.UTC(year!, (month ?? 1) - 1, day))
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
}

export function eisDay(iso: string) {
  const [year, month, day] = iso.split('-')
  return `${day}.${month}.${year}`
}

export function initialPlan(today: string): OpenSyncPlan {
  return { phase: 'catalog', day: today, page: 1, lastClosedDay: '', todaySweptAt: '', truncatedDays: [] }
}

/** 44-ФЗ and ПП-615 use different archives. The law line on the card decides. */
export function subsystemFor(law: string) {
  const text = law.toLocaleLowerCase('ru')
  if (text.includes('223')) return 'RI223'
  if (text.includes('615')) return 'RD615'
  return 'PRIZ'
}

export function openSearchUrl(day: string, page: number) {
  const stamp = eisDay(day)
  const url = new URL('https://zakupki.gov.ru/epz/order/extendedsearch/results.html')
  url.searchParams.set('morphology', 'on')
  url.searchParams.set('pageNumber', String(page))
  url.searchParams.set('sortDirection', 'false')
  url.searchParams.set('recordsPerPage', `_${PAGE_SIZE}`)
  url.searchParams.set('showLotsInfoHidden', 'false')
  url.searchParams.set('sortBy', 'UPDATE_DATE')
  url.searchParams.set('fz44', 'on')
  url.searchParams.set('fz223', 'on')
  url.searchParams.set('ppRf615', 'on')
  url.searchParams.set('af', 'on')
  url.searchParams.set('currencyIdGeneral', '-1')
  url.searchParams.set('publishDateFrom', stamp)
  url.searchParams.set('publishDateTo', stamp)
  return url
}

export function planAfterPage(plan: OpenSyncPlan, found: number, now: Date): OpenSyncPlan {
  if (found >= PAGE_SIZE && plan.page < PAGE_CAP) return { ...plan, page: plan.page + 1 }
  const finished = found >= PAGE_SIZE ? noteTruncation(plan) : plan
  if (finished.phase === 'catalog') {
    const previous = shiftDay(finished.day, -1)
    if (previous < CATALOG_FLOOR) {
      const today = moscowDate(now)
      return {
        phase: 'catchup',
        day: today,
        page: 1,
        lastClosedDay: shiftDay(today, -1),
        todaySweptAt: now.toISOString(),
        truncatedDays: finished.truncatedDays,
      }
    }
    return { ...finished, day: previous, page: 1 }
  }
  const today = moscowDate(now)
  if (finished.day < today) return { ...finished, day: shiftDay(finished.day, 1), page: 1, lastClosedDay: finished.day }
  return { ...finished, page: 1, lastClosedDay: shiftDay(today, -1), todaySweptAt: now.toISOString() }
}

function noteTruncation(plan: OpenSyncPlan): OpenSyncPlan {
  if (plan.truncatedDays.includes(plan.day)) return plan
  return { ...plan, truncatedDays: [...plan.truncatedDays, plan.day] }
}

/** The next public page to read. Null means the list is current and only archives should download. */
export function planToRun(plan: OpenSyncPlan, now: Date): OpenSyncPlan | null {
  if (plan.phase === 'catalog') return plan
  const today = moscowDate(now)
  const yesterday = shiftDay(today, -1)
  if (plan.lastClosedDay < yesterday) {
    const start = plan.lastClosedDay ? shiftDay(plan.lastClosedDay, 1) : yesterday
    if (plan.day >= start && plan.day <= today) return plan
    return { ...plan, day: start, page: 1 }
  }
  const swept = plan.todaySweptAt ? Date.parse(plan.todaySweptAt) : 0
  if (now.getTime() - swept < TODAY_SWEEP_MS) return null
  if (plan.day === today && plan.page > 1) return plan
  return { ...plan, day: today, page: 1 }
}
