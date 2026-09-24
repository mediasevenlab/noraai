import * as React from 'react'
import { format } from 'date-fns'
import { ru as dateFnsRu } from 'date-fns/locale'
import { ru as dayPickerRu } from 'react-day-picker/locale'
import { CalendarDaysIcon, XIcon } from 'lucide-react'

import { NoraButton } from '@/components/nora/primitives'
import { productSheetOverlayChipClass } from '@/components/nora/product-sheet'
import { Calendar, CalendarDayButton, noraSheetCalendarClass } from '@/components/ui/calendar'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { addLocalDays, startOfLocalDay } from '@/platform/plan-slots'

import {
  formatPlanActiveRange,
  planOccupancyOnDay,
  planRangeFromStart,
  type PlanOccupancyMark,
} from './week-plan'

const FRAME_CLASS = cn(
  '!flex flex-col gap-0 overflow-hidden bg-[var(--nora-modal)] p-0 !pb-0',
  'inset-x-0 bottom-0 top-auto h-auto max-h-[calc(100dvh-var(--modal-sheet-inset))] w-full max-w-none translate-x-0 translate-y-0 rounded-t-[var(--modal-sheet-radius)] rounded-b-none',
  'md:inset-auto md:top-1/2 md:left-1/2 md:h-auto md:max-h-[min(760px,calc(100vh-2rem))] md:w-[min(100%-2rem,480px)] md:max-w-[480px] md:rounded-[24px]',
)

const CALENDAR_WEEKDAY_CLASS =
  'flex-1 rounded-(--cell-radius) text-[11px] font-medium text-[var(--nora-text-tertiary)] select-none'

const PLAN_NAV_BUTTON_CLASS = cn(
  'inline-flex size-8 shrink-0 items-center justify-center rounded-full border-0 p-0',
  'bg-[var(--nora-panel)] text-[var(--nora-text-secondary)] shadow-none outline-none select-none',
  'hover:bg-[var(--nora-panel)] hover:text-[var(--nora-text)]',
  'focus-visible:shadow-[var(--nora-shadow-focus)] aria-disabled:opacity-50',
)

const PLAN_ACTION_BUTTON_CLASS = cn(
  'nora-press-grow inline-flex !h-10 !min-h-10 !max-h-10 w-full items-center justify-center gap-1.5',
  '!rounded-[14px] border-0 !px-4 py-0',
  'font-[family-name:var(--nora-font)] !text-[13px] !font-medium leading-none',
)

function startOfLocalMonth(value: Date) {
  return new Date(value.getFullYear(), value.getMonth(), 1)
}

function occupancySegment(day: Date, mark: PlanOccupancyMark) {
  const weekday = day.getDay()
  const previous = new Date(day.getFullYear(), day.getMonth(), day.getDate() - 1).getTime()
  const next = new Date(day.getFullYear(), day.getMonth(), day.getDate() + 1).getTime()
  const from = mark.from.getTime()
  const to = mark.to.getTime()
  const continuesBefore = weekday !== 1 && previous >= from && previous <= to
  const continuesAfter = weekday !== 0 && next >= from && next <= to
  return { start: !continuesBefore, end: !continuesAfter }
}

function OccupiedDayButton({
  marks,
  ...props
}: React.ComponentProps<typeof CalendarDayButton> & {
  marks: readonly PlanOccupancyMark[]
}) {
  const day = props.day.date
  const layers = planOccupancyOnDay(marks, day)
  const continuesBefore = layers.some((mark) => !occupancySegment(day, mark).start)
  const continuesAfter = layers.some((mark) => !occupancySegment(day, mark).end)
  return (
    <CalendarDayButton
      {...props}
      className={cn(
        props.className,
        layers.length > 0 && continuesBefore && continuesAfter && '!rounded-none',
        layers.length > 0 && continuesBefore && !continuesAfter && '!rounded-s-none',
        layers.length > 0 && !continuesBefore && continuesAfter && '!rounded-e-none',
      )}
    >
      {layers.length > 0 ? (
        <div aria-hidden className="pointer-events-none absolute inset-0 -z-10" data-plan-occupied="">
          {layers.map((mark) => (
            <span
              key={mark.planId}
              className="absolute inset-0"
              data-plan-occupied-layer={mark.planId}
              style={{ backgroundColor: mark.color }}
            />
          ))}
        </div>
      ) : null}
      {props.children}
    </CalendarDayButton>
  )
}

export function PlanStartDialog({
  dayCount = 1,
  initialDate,
  occupied = [],
  onClear,
  onConfirm,
  onOpenChange,
  open,
  planTitle,
  selected,
}: {
  dayCount?: number
  initialDate: Date
  occupied?: readonly PlanOccupancyMark[]
  onClear?: () => void
  onConfirm: (date: Date) => void
  onOpenChange: (open: boolean) => void
  open: boolean
  planTitle: string
  selected: boolean
}) {
  const initialDay = startOfLocalDay(initialDate).getTime()
  const [date, setDate] = React.useState(() => new Date(initialDay))
  const [month, setMonth] = React.useState(() => startOfLocalMonth(new Date(initialDay)))

  React.useEffect(() => {
    if (!open) return
    const next = new Date(initialDay)
    setDate(next)
    setMonth(startOfLocalMonth(next))
  }, [initialDay, open])

  const range = planRangeFromStart(date, dayCount)

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className={FRAME_CLASS} data-plan-start-dialog="" showCloseButton={false}>
        <div className="shrink-0 px-2 pt-2">
          <DialogHeader className="min-w-0 gap-1 rounded-[16px] bg-[var(--nora-inset)] p-2.5 text-left">
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 flex-1 items-center gap-2.5">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[var(--nora-text)] text-[var(--nora-modal)]">
                  <CalendarDaysIcon aria-hidden className="size-4" strokeWidth={1.7} />
                </span>
                <div className="min-w-0 flex-1">
                  <DialogTitle className="font-[family-name:var(--nora-font)] !text-[15px] !font-medium !leading-6 tracking-normal text-[var(--nora-text)]">
                    С какого дня начать
                  </DialogTitle>
                  <DialogDescription className="sr-only">
                    {planTitle}. Выберите дату начала рациона.
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
        <div className="min-h-0 overflow-y-auto px-3 pt-3 pb-3 sm:px-4">
          <div className="rounded-[16px] bg-[var(--nora-inset)] p-2 sm:p-3" data-plan-start-calendar="">
            <Calendar
              className={noraSheetCalendarClass}
              compactDays
              classNames={{
                root: 'w-full',
                months: 'relative flex w-full flex-col',
                month: 'flex w-full flex-col gap-2',
                month_grid: 'w-full border-collapse',
                weekday: CALENDAR_WEEKDAY_CLASS,
                nav: 'absolute inset-x-0 top-0 flex h-8 w-full items-center justify-between',
                month_caption: 'flex h-8 w-full items-center justify-center px-10',
                caption_label:
                  'rdp-caption_label font-medium select-none text-[14px] leading-none text-[var(--nora-text)]',
                button_previous: cn(PLAN_NAV_BUTTON_CLASS, 'rdp-button_previous'),
                button_next: cn(PLAN_NAV_BUTTON_CLASS, 'rdp-button_next'),
              }}
              components={{
                DayButton: (dayProps) => (
                  <OccupiedDayButton
                    compactDays
                    marks={occupied}
                    onRangeEdgeDrag={(edge, nextDay) => {
                      const day = startOfLocalDay(nextDay)
                      const next =
                        edge === 'end'
                          ? addLocalDays(day, -(Math.max(1, dayCount) - 1))
                          : day
                      setDate(next)
                      setMonth(startOfLocalMonth(next))
                    }}
                    {...dayProps}
                  />
                ),
              }}
              locale={dayPickerRu}
              mode="range"
              month={month}
              numberOfMonths={1}
              onMonthChange={setMonth}
              onSelect={(_next, triggerDate) => {
                const next = startOfLocalDay(triggerDate)
                setDate(next)
                setMonth(startOfLocalMonth(next))
              }}
              required
              selected={range}
            />
          </div>
          {occupied.length > 0 ? (
            <ul className="my-3 flex flex-col gap-1.5" data-plan-start-occupied="">
              {occupied.map((mark) => (
                <li
                  key={mark.planId}
                  className="flex min-w-0 items-center gap-2 text-[12px] font-light leading-5 text-[var(--nora-text-secondary)]"
                >
                  <span
                    aria-hidden
                    className="size-2 shrink-0 rounded-full"
                    style={{ backgroundColor: mark.swatch }}
                  />
                  <span className="min-w-0 truncate text-[var(--nora-text)]">{mark.title}</span>
                  <span className="ml-auto shrink-0 tabular-nums">
                    {formatPlanActiveRange(mark.from, Math.round((mark.to.getTime() - mark.from.getTime()) / 86400000) + 1)}
                  </span>
                </li>
              ))}
            </ul>
          ) : null}
          <div className="px-0" data-plan-start-actions="">
            <div
              aria-hidden
              className="border-t border-[var(--nora-divider)]"
              data-plan-start-divider=""
            />
            <div className={cn('mt-3 grid gap-2', selected && onClear ? 'grid-cols-2' : 'grid-cols-1')}>
              {selected && onClear ? (
                <NoraButton
                  className={PLAN_ACTION_BUTTON_CLASS}
                  onClick={onClear}
                  variant="tinted"
                >
                  Снять план
                </NoraButton>
              ) : null}
              <NoraButton
                className={PLAN_ACTION_BUTTON_CLASS}
                onClick={() => onConfirm(date)}
                variant="primary"
              >
                Начать {format(date, 'd MMMM', { locale: dateFnsRu })}
              </NoraButton>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
