import * as React from 'react'
import { format } from 'date-fns'
import { ru as dateFnsRu } from 'date-fns/locale'
import { CalendarIcon } from 'lucide-react'
import { type DateRange } from 'react-day-picker'
import { ru as dayPickerRu } from 'react-day-picker/locale'

import { Calendar } from '@/components/ui/calendar'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { cn } from '@/lib/utils'

const pickerPopoverClass =
  'w-auto overflow-hidden border-0 bg-[var(--nora-popover)] p-0 shadow-[var(--nora-shadow-menu)] ring-1 ring-[var(--nora-menu-border)]'

function startOfLocalDay(value: Date) {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate())
}

function endOfLocalDay(value: Date) {
  return new Date(
    value.getFullYear(),
    value.getMonth(),
    value.getDate(),
    23,
    59,
    59,
    999,
  )
}

function toDate(value: Date | string) {
  return typeof value === 'string' ? new Date(value) : value
}

function formatDayMonth(date: Date) {
  return format(date, 'd MMM', { locale: dateFnsRu })
}

function periodLabel(range: DateRange | undefined) {
  if (range?.from && range?.to) {
    return `${formatDayMonth(range.from)} – ${formatDayMonth(range.to)}`
  }
  if (range?.from) return formatDayMonth(range.from)
  return 'Период'
}

/** Inclusive local-day check for diary meal timestamps. */
export function isMealInLocalDayRange(
  mealAtIso: string,
  from: Date,
  to: Date,
) {
  const mealDay = startOfLocalDay(new Date(mealAtIso)).getTime()
  const fromDay = startOfLocalDay(from).getTime()
  const toDay = startOfLocalDay(to).getTime()
  const lo = Math.min(fromDay, toDay)
  const hi = Math.max(fromDay, toDay)
  return mealDay >= lo && mealDay <= hi
}

export type DiaryPeriodFilter = {
  from: Date
  to: Date
}

/** Floating white iOS capsule (Grok-style). Inner controls stay transparent. */
export const diaryToolbarPillClass =
  'ios-float-pill flex h-9 shrink-0 items-center'

/** Inner control on a floating pill — no own fill or shadow. */
export const diaryToolbarChipClass =
  'nora-press-grow !h-9 !min-h-9 !max-h-9 !rounded-full !border-0 !bg-transparent !shadow-none text-[13px] !font-normal leading-none text-[var(--nora-text-secondary)] hover:text-[var(--nora-text)] data-[popup-open]:text-[var(--nora-text)] focus-visible:shadow-[var(--nora-shadow-focus)] [&>svg]:!text-current [&>svg]:opacity-100'

/** Icon-only calendar / collapsed search on mobile — sits inside a floating pill. */
export const diaryToolbarIconButtonClass =
  'nora-press-grow inline-flex size-9 shrink-0 items-center justify-center !rounded-full !border-0 !bg-transparent !shadow-none text-[var(--nora-text-secondary)] outline-none disabled:pointer-events-none disabled:opacity-50 [&>svg]:size-4'

type DiaryPeriodPickerProps = {
  /** Registration day (or earliest diary bound). Default label starts here. */
  periodStart: Date | string
  /** Defaults to local today and advances automatically. */
  periodEnd?: Date | string
  /** Reset custom selection when the diary subject changes. */
  subjectKey?: string
  disabled?: boolean
  className?: string
  /**
   * `null` = default (show all cards).
   * Set only after the user picks a complete range in the calendar.
   * Not persisted — clears on refresh and when `subjectKey` changes.
   */
  onFilterChange?: (filter: DiaryPeriodFilter | null) => void
}

/**
 * Period range picker for the diary toolbar.
 * Default label: registration → today. Filtering applies only after a custom selection.
 */
export function DiaryPeriodPicker({
  periodStart,
  periodEnd,
  subjectKey,
  disabled,
  className,
  onFilterChange,
}: DiaryPeriodPickerProps) {
  const todayKey = startOfLocalDay(new Date()).getTime()
  const defaultRange = React.useMemo((): DateRange => {
    const from = startOfLocalDay(toDate(periodStart))
    const to = startOfLocalDay(toDate(periodEnd ?? new Date(todayKey)))
    if (from.getTime() <= to.getTime()) return { from, to }
    return { from: to, to: from }
  }, [periodStart, periodEnd, todayKey])

  const [customRange, setCustomRange] = React.useState<DateRange | undefined>()
  const [customized, setCustomized] = React.useState(false)
  const [open, setOpen] = React.useState(false)
  const onFilterChangeRef = React.useRef(onFilterChange)
  onFilterChangeRef.current = onFilterChange

  React.useEffect(() => {
    setCustomized(false)
    setCustomRange(undefined)
    setOpen(false)
    onFilterChangeRef.current?.(null)
  }, [subjectKey])

  const range = customized ? customRange : defaultRange
  const label = periodLabel(range)

  React.useEffect(() => {
    if (!customized) {
      onFilterChangeRef.current?.(null)
      return
    }
    if (customRange?.from && customRange.to) {
      onFilterChangeRef.current?.({
        from: startOfLocalDay(customRange.from),
        to: endOfLocalDay(customRange.to),
      })
      return
    }
    // Incomplete range while picking — keep showing all until both ends are set.
    onFilterChangeRef.current?.(null)
  }, [customized, customRange])

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        if (disabled) return
        setOpen(next)
      }}
    >
      <PopoverTrigger
        disabled={disabled}
        render={
          <button
            type="button"
            aria-label={`Период: ${label}`}
            className={cn(diaryToolbarIconButtonClass, diaryToolbarChipClass, className)}
          />
        }
      >
        <CalendarIcon className="size-4 shrink-0 text-current" />
      </PopoverTrigger>
      <PopoverContent align="end" className={pickerPopoverClass} sideOffset={4}>
        <Calendar
          locale={dayPickerRu}
          mode="range"
          numberOfMonths={1}
          defaultMonth={range?.to ?? range?.from}
          selected={range}
          onSelect={(next) => {
            setCustomized(true)
            setCustomRange(next)
          }}
        />
      </PopoverContent>
    </Popover>
  )
}

