export const PLAN_SLOT_COUNT = 7

/** Slot 0 is Day 1. Stored meal dates still use Mon–Sun of a template week. */
export function planSlotIndex(date: Date) {
  const weekday = date.getDay()
  return weekday === 0 ? 6 : weekday - 1
}

export function planSlotLabel(index: number) {
  return `День ${index + 1}`
}

export function startOfLocalDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

export function addLocalDays(date: Date, days: number) {
  const next = startOfLocalDay(date)
  next.setDate(next.getDate() + days)
  return next
}

export function dayKeyFromDate(date: Date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-')
}

export function dateFromDayKey(dayKey: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dayKey)
  if (!match) return null
  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const date = new Date(year, month - 1, day)
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    return null
  }
  return date
}
