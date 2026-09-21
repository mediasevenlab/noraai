import * as React from 'react'
import { format } from 'date-fns'
import { ru as dateFnsRu } from 'date-fns/locale'
import { CalendarDaysIcon, CalendarIcon, RotateCcwIcon, XIcon } from 'lucide-react'
import { type DateRange } from 'react-day-picker'
import { ru as dayPickerRu } from 'react-day-picker/locale'

import { NoraButton } from '@/components/nora/primitives'
import {
  productCardFooterCtaClass,
  productSheetOverlayChipClass,
} from '@/components/nora/product-sheet'
import { Calendar, noraSheetCalendarClass } from '@/components/ui/calendar'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { cn } from '@/lib/utils'

const pickerPopoverClass =
  'w-auto overflow-hidden border-0 bg-[var(--nora-popover)] p-0 shadow-[var(--nora-shadow-menu)] ring-1 ring-[var(--nora-menu-border)]'

const PERIOD_DIALOG_FRAME_CLASS = cn(
  '!flex flex-col gap-0 overflow-hidden bg-[var(--nora-modal)] p-0 !pb-0',
  'inset-x-0 bottom-0 top-auto h-auto max-h-[calc(100dvh-var(--modal-sheet-inset))] w-full max-w-none translate-x-0 translate-y-0 rounded-t-[var(--modal-sheet-radius)] rounded-b-none',
)

const CALENDAR_WEEKDAY_CLASS =
  'flex-1 rounded-(--cell-radius) text-[11px] font-medium text-[var(--nora-text-tertiary)] select-none'

const PERIOD_NAV_BUTTON_CLASS = cn(
  'inline-flex shrink-0 items-center justify-center rounded-full border-0 p-0',
  'text-[var(--nora-text-secondary)] shadow-none outline-none select-none',
  'hover:text-[var(--nora-text)]',
  'focus-visible:shadow-[var(--nora-shadow-focus)] aria-disabled:opacity-50',
)

const PERIOD_SHEET_NAV_BUTTON_CLASS = cn(
  PERIOD_NAV_BUTTON_CLASS,
  'size-8 bg-[var(--nora-panel)] hover:bg-[var(--nora-panel)]',
)

const PERIOD_POPOVER_NAV_BUTTON_CLASS = cn(
  PERIOD_NAV_BUTTON_CLASS,
  'size-(--cell-size) bg-[var(--nora-inset)] hover:bg-[var(--nora-inset)]',
)

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

function startOfLocalMonth(value: Date) {
  return new Date(value.getFullYear(), value.getMonth(), 1)
}

function isCompleteRange(
  range: DateRange | null | undefined,
): range is { from: Date; to: Date } {
  return Boolean(range?.from && range.to)
}

export function sameLocalRange(
  a: DateRange | null | undefined,
  b: DateRange | null | undefined,
) {
  if (!isCompleteRange(a) || !isCompleteRange(b)) return false
  return (
    startOfLocalDay(a.from).getTime() === startOfLocalDay(b.from).getTime() &&
    startOfLocalDay(a.to).getTime() === startOfLocalDay(b.to).getTime()
  )
}

/** Top month is the previous month when the range lives in one month (so two calendars are never the same). */
export function visibleMonthsForBounds(from: Date, to: Date) {
  const start = startOfLocalMonth(from)
  const end = startOfLocalMonth(to)
  if (start.getTime() === end.getTime()) {
    return {
      top: new Date(start.getFullYear(), start.getMonth() - 1, 1),
      bottom: start,
    }
  }
  if (start.getTime() > end.getTime()) {
    return {
      top: new Date(end.getFullYear(), end.getMonth() - 1, 1),
      bottom: end,
    }
  }
  return { top: start, bottom: end }
}

export function periodPickerActions({
  applied,
  defaultRange,
  draft,
}: {
  applied: DateRange | null
  defaultRange: DateRange
  draft: DateRange | undefined
}) {
  const draftComplete = isCompleteRange(draft)
  const defaultApplied = applied == null
  const draftIsDefault = draftComplete && sameLocalRange(draft, defaultRange)
  const draftMatchesApplied =
    defaultApplied
      ? draftIsDefault || draft == null
      : draftComplete && sameLocalRange(draft, applied)

  return {
    saveEnabled: draftComplete && !draftIsDefault && !draftMatchesApplied,
    resetEnabled: !defaultApplied || Boolean(draft && !draftIsDefault),
  }
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
  'nora-press-grow inline-flex size-9 shrink-0 items-center justify-center !rounded-full !border-0 !bg-transparent !shadow-none text-[var(--nora-text-secondary)] outline-none disabled:pointer-events-none disabled:opacity-50 [&>svg]:size-3.5'

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

function PeriodCalendar({
  density,
  month,
  onMonthChange,
  onSelect,
  range,
}: {
  density: 'sheet' | 'popover'
  month: Date
  onMonthChange: (next: Date) => void
  onSelect: (next: DateRange | undefined) => void
  range: DateRange | undefined
}) {
  const sheet = density === 'sheet'
  return (
    <Calendar
      locale={dayPickerRu}
      mode="range"
      numberOfMonths={1}
      month={month}
      onMonthChange={onMonthChange}
      selected={range}
      className={sheet ? noraSheetCalendarClass : 'bg-transparent p-0'}
      compactDays={sheet}
      classNames={{
        months: 'relative flex w-full flex-col',
        root: sheet ? 'w-full' : 'w-fit',
        month: 'flex w-full flex-col gap-2',
        month_grid: 'w-full border-collapse',
        ...(sheet ? { weekday: CALENDAR_WEEKDAY_CLASS } : {}),
        nav: sheet
          ? 'absolute inset-x-0 top-0 flex h-8 w-full items-center justify-between'
          : 'absolute inset-x-0 top-0 flex h-(--cell-size) w-full items-center justify-between',
        month_caption: sheet
          ? 'flex h-8 w-full items-center justify-center px-10'
          : 'flex h-(--cell-size) w-full items-center justify-center px-(--cell-size)',
        caption_label: sheet
          ? 'rdp-caption_label font-medium select-none text-[14px] leading-none text-[var(--nora-text)]'
          : 'rdp-caption_label font-medium select-none text-xs leading-none text-[var(--nora-text)]',
        button_previous: cn(
          sheet ? PERIOD_SHEET_NAV_BUTTON_CLASS : PERIOD_POPOVER_NAV_BUTTON_CLASS,
          'rdp-button_previous',
        ),
        button_next: cn(
          sheet ? PERIOD_SHEET_NAV_BUTTON_CLASS : PERIOD_POPOVER_NAV_BUTTON_CLASS,
          'rdp-button_next',
        ),
      }}
      onSelect={onSelect}
    />
  )
}

const PERIOD_SHEET_ACTION_CLASS = cn(
  'nora-press-grow inline-flex !h-10 !min-h-10 !max-h-10 w-full items-center justify-center gap-1.5',
  '!rounded-[14px] border-0 !px-4 py-0',
  'font-[family-name:var(--nora-font)] [font-size:13px] !font-medium leading-none',
  'enabled:text-[var(--nora-on-accent)] enabled:hover:text-[var(--nora-on-accent)]',
  'enabled:[&_svg]:text-[var(--nora-on-accent)]',
)

const PERIOD_POPOVER_ACTION_CLASS = cn(
  'nora-press-grow inline-flex h-[var(--nora-control-h)] min-h-[var(--nora-control-h)] max-h-[var(--nora-control-h)] w-full items-center justify-center gap-1',
  'rounded-[var(--nora-radius-md)] border-0 !px-2.5 py-0',
  'font-[family-name:var(--nora-font)] text-xs !font-medium leading-none',
  'enabled:text-[var(--nora-on-accent)] enabled:hover:text-[var(--nora-on-accent)]',
  'enabled:[&_svg]:text-[var(--nora-on-accent)]',
)

function PeriodActions({
  density,
  resetEnabled,
  saveEnabled,
  onReset,
  onSave,
}: {
  density: 'sheet' | 'popover'
  resetEnabled: boolean
  saveEnabled: boolean
  onReset: () => void
  onSave: () => void
}) {
  const compact = density === 'popover'
  return (
    <div
      className={compact ? 'px-2.5 pb-2.5' : 'px-3 sm:px-4'}
      data-diary-period-actions=""
      data-diary-period-density={density}
    >
      <div
        aria-hidden
        className="border-t border-[var(--nora-divider)]"
        data-diary-period-divider=""
      />
      <div
        className={
          compact
            ? 'mt-2 grid grid-cols-2 gap-1.5'
            : 'mt-3 grid grid-cols-2 gap-2'
        }
      >
        <NoraButton
          className={compact ? PERIOD_POPOVER_ACTION_CLASS : PERIOD_SHEET_ACTION_CLASS}
          disabled={!resetEnabled}
          onClick={onReset}
          variant="primary"
        >
          <RotateCcwIcon
            aria-hidden
            className={compact ? 'size-3' : 'size-3.5'}
            strokeWidth={1.75}
          />
          Сбросить
        </NoraButton>
        <NoraButton
          className={cn(
            compact ? PERIOD_POPOVER_ACTION_CLASS : PERIOD_SHEET_ACTION_CLASS,
            saveEnabled && productCardFooterCtaClass,
          )}
          disabled={!saveEnabled}
          onClick={onSave}
          variant="default"
        >
          Сохранить
        </NoraButton>
      </div>
    </div>
  )
}

/**
 * Period range picker for the diary toolbar.
 * Default: diary start → today, growing with each new day. A custom range
 * applies only after Save. Reset returns to the full diary.
 * Mobile: hugging sheet with two independently navigable months. Desktop: side-by-side popover.
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

  const [applied, setApplied] = React.useState<DateRange | null>(null)
  const [draft, setDraft] = React.useState<DateRange | undefined>()
  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [popoverOpen, setPopoverOpen] = React.useState(false)
  const [{ top: topMonth, bottom: bottomMonth }, setVisibleMonths] =
    React.useState(() =>
      visibleMonthsForBounds(toDate(periodStart), new Date()),
    )
  const onFilterChangeRef = React.useRef(onFilterChange)
  onFilterChangeRef.current = onFilterChange

  const hydrateDraft = React.useCallback(
    (nextApplied: DateRange | null) => {
      if (isCompleteRange(nextApplied)) {
        setDraft(nextApplied)
        setVisibleMonths(visibleMonthsForBounds(nextApplied.from, nextApplied.to))
        return
      }
      setDraft(defaultRange)
      setVisibleMonths(
        visibleMonthsForBounds(defaultRange.from!, defaultRange.to!),
      )
    },
    [defaultRange],
  )

  React.useEffect(() => {
    setApplied(null)
    setDraft(undefined)
    setDialogOpen(false)
    setPopoverOpen(false)
    setVisibleMonths(
      visibleMonthsForBounds(toDate(periodStart), new Date()),
    )
    onFilterChangeRef.current?.(null)
  }, [subjectKey])

  const { resetEnabled, saveEnabled } = periodPickerActions({
    applied,
    defaultRange,
    draft,
  })
  const triggerRange = isCompleteRange(applied) ? applied : defaultRange
  const pickerRange = draft ?? triggerRange
  const label = periodLabel(dialogOpen || popoverOpen ? pickerRange : triggerRange)

  React.useEffect(() => {
    if (!isCompleteRange(applied)) {
      onFilterChangeRef.current?.(null)
      return
    }
    onFilterChangeRef.current?.({
      from: startOfLocalDay(applied.from),
      to: endOfLocalDay(applied.to),
    })
  }, [applied])

  function onSelectRange(next: DateRange | undefined) {
    setDraft(next)
  }

  function resetPeriod() {
    setApplied(null)
    setDraft(defaultRange)
    setVisibleMonths(
      visibleMonthsForBounds(defaultRange.from!, defaultRange.to!),
    )
  }

  function savePeriod() {
    if (!isCompleteRange(draft) || sameLocalRange(draft, defaultRange)) return
    setApplied({
      from: startOfLocalDay(draft.from),
      to: startOfLocalDay(draft.to),
    })
    setDialogOpen(false)
    setPopoverOpen(false)
  }

  function openDialog() {
    if (disabled) return
    hydrateDraft(applied)
    setDialogOpen(true)
  }

  return (
    <>
      <button
        type="button"
        aria-label={`Период: ${label}`}
        className={cn(
          diaryToolbarIconButtonClass,
          diaryToolbarChipClass,
          'md:hidden',
          className,
        )}
        disabled={disabled}
        onClick={openDialog}
      >
        <CalendarIcon className="size-3.5 shrink-0 text-current" strokeWidth={1.75} />
      </button>
      <Dialog
        onOpenChange={(next) => {
          if (disabled) return
          if (next) hydrateDraft(applied)
          setDialogOpen(next)
        }}
        open={dialogOpen}
      >
        <DialogContent
          className={PERIOD_DIALOG_FRAME_CLASS}
          data-diary-period-dialog=""
          showCloseButton={false}
        >
          <div className="shrink-0 px-2 pt-2">
            <DialogHeader className="min-w-0 gap-1 rounded-[16px] bg-[var(--nora-inset)] p-2.5 text-left">
              <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 flex-1 items-center gap-2.5">
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[var(--nora-text)] text-[var(--nora-modal)]">
                    <CalendarDaysIcon aria-hidden className="size-4" strokeWidth={1.7} />
                  </span>
                  <div className="flex min-w-0 flex-1 items-baseline gap-2">
                    <DialogTitle className="shrink-0 font-[family-name:var(--nora-font)] !text-[15px] !font-medium !leading-6 tracking-normal text-[var(--nora-text)]">
                      Период
                    </DialogTitle>
                    <DialogDescription className="min-w-0 truncate font-[family-name:var(--nora-font)] text-[12px] font-light leading-5 text-[var(--nora-text-tertiary)]">
                      {periodLabel(pickerRange)}
                    </DialogDescription>
                  </div>
                </div>
                <DialogClose
                  aria-label="Закрыть"
                  className={cn(
                    productSheetOverlayChipClass,
                    'nora-press-grow size-8 shrink-0 bg-[var(--nora-panel)]/80 sm:size-8',
                    'hover:text-[var(--nora-text)] focus-visible:shadow-[var(--nora-shadow-focus)]',
                  )}
                >
                  <XIcon aria-hidden className="size-3.5" strokeWidth={1.75} />
                </DialogClose>
              </div>
            </DialogHeader>
          </div>
          <div className="flex min-h-0 flex-col gap-3 overflow-y-auto px-3 pt-3 pb-3 sm:px-4">
            <div
              className="rounded-[16px] bg-[var(--nora-inset)] p-2 sm:p-3"
              data-diary-period-calendar="top"
            >
              <PeriodCalendar
                density="sheet"
                month={topMonth}
                onMonthChange={(next) =>
                  setVisibleMonths((prev) => ({ ...prev, top: next }))
                }
                onSelect={onSelectRange}
                range={pickerRange}
              />
            </div>
            <div
              className="rounded-[16px] bg-[var(--nora-inset)] p-2 sm:p-3"
              data-diary-period-calendar="bottom"
            >
              <PeriodCalendar
                density="sheet"
                month={bottomMonth}
                onMonthChange={(next) =>
                  setVisibleMonths((prev) => ({ ...prev, bottom: next }))
                }
                onSelect={onSelectRange}
                range={pickerRange}
              />
            </div>
          </div>
          <div className="shrink-0 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:pb-3.5">
            <PeriodActions
              density="sheet"
              onReset={resetPeriod}
              onSave={savePeriod}
              resetEnabled={resetEnabled}
              saveEnabled={saveEnabled}
            />
          </div>
        </DialogContent>
      </Dialog>

      <Popover
        open={popoverOpen}
        onOpenChange={(next) => {
          if (disabled) return
          if (next) hydrateDraft(applied)
          setPopoverOpen(next)
        }}
      >
        <PopoverTrigger
          disabled={disabled}
          render={
            <button
              type="button"
              aria-label={`Период: ${label}`}
              className={cn(
                diaryToolbarIconButtonClass,
                diaryToolbarChipClass,
                'hidden md:inline-flex',
                className,
              )}
            />
          }
        >
          <CalendarIcon className="size-3.5 shrink-0 text-current" strokeWidth={1.75} />
        </PopoverTrigger>
        <PopoverContent align="end" className={pickerPopoverClass} sideOffset={4}>
          <div
            className="flex items-start gap-3 px-2.5 pt-2.5 pb-2"
            data-diary-period-desktop=""
          >
            <div data-diary-period-calendar="left">
              <PeriodCalendar
                density="popover"
                month={topMonth}
                onMonthChange={(next) =>
                  setVisibleMonths((prev) => ({ ...prev, top: next }))
                }
                onSelect={onSelectRange}
                range={pickerRange}
              />
            </div>
            <div data-diary-period-calendar="right">
              <PeriodCalendar
                density="popover"
                month={bottomMonth}
                onMonthChange={(next) =>
                  setVisibleMonths((prev) => ({ ...prev, bottom: next }))
                }
                onSelect={onSelectRange}
                range={pickerRange}
              />
            </div>
          </div>
          <PeriodActions
            density="popover"
            onReset={resetPeriod}
            onSave={savePeriod}
            resetEnabled={resetEnabled}
            saveEnabled={saveEnabled}
          />
        </PopoverContent>
      </Popover>
    </>
  )
}
