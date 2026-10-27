const MONTHS = [
  'января',
  'февраля',
  'марта',
  'апреля',
  'мая',
  'июня',
  'июля',
  'августа',
  'сентября',
  'октября',
  'ноября',
  'декабря',
]

function asDate(value: Date | string) {
  const date = value instanceof Date ? value : new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

function sameDay(left: Date, right: Date) {
  return left.getFullYear() === right.getFullYear() && left.getMonth() === right.getMonth() && left.getDate() === right.getDate()
}

function dayStart(value: Date) {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate()).getTime()
}

export function ruCalendarDate(value: Date | string, now = new Date()): string {
  const date = asDate(value)
  if (!date) return ''
  const text = `${date.getDate()} ${MONTHS[date.getMonth()]}`
  if (date.getFullYear() !== now.getFullYear()) return `${text} ${date.getFullYear()}`
  return text
}

export function ruRecordedAt(value: Date | string): string {
  const date = asDate(value)
  if (!date) return ''
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  return `${date.getDate()} ${MONTHS[date.getMonth()]} ${date.getFullYear()}, ${hours}:${minutes}`
}

export function ruUploadDate(value: Date | string): string {
  const date = asDate(value)
  if (!date) return ''
  return `${date.getDate()} ${MONTHS[date.getMonth()]} ${date.getFullYear()}`
}

export function dialogDayLabel(current: Date | undefined, previous: Date | undefined, now = new Date()): string | null {
  if (!current || Number.isNaN(current.getTime())) return null
  if (previous && !Number.isNaN(previous.getTime()) && sameDay(previous, current)) return null
  const diff = Math.round((dayStart(now) - dayStart(current)) / 86_400_000)
  if (diff === 0) return 'Сегодня'
  if (diff === 1) return 'Вчера'
  return ruCalendarDate(current, now)
}

export function dialogDatesLabel(raw: string | null, now = new Date()): string {
  if (!raw) return ''
  const stamps: Date[] = []
  for (const match of raw.matchAll(/"createdAt"\s*:\s*"([^"]+)"/g)) {
    const date = asDate(match[1] ?? '')
    if (date) stamps.push(date)
  }
  if (stamps.length === 0) return ''
  stamps.sort((left, right) => left.getTime() - right.getTime())
  const first = stamps[0]!
  const last = stamps[stamps.length - 1]!
  if (sameDay(first, last)) return ruCalendarDate(last, now)
  return `${ruCalendarDate(first, now)} — ${ruCalendarDate(last, now)}`
}
