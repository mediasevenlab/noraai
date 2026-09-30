import * as React from 'react'
import { format } from 'date-fns'
import { ru as dateFnsRu } from 'date-fns/locale'
import { ru as dayPickerRu } from 'react-day-picker/locale'
import { CalendarDaysIcon, XIcon } from '@/components/icons'

import { NoraButton } from '@/components/nora/primitives'
import { productSheetOverlayChipClass } from '@/components/nora/product-sheet'
import { Calendar, noraSheetCalendarClass } from '@/components/ui/calendar'
import { DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { useLatest } from '@/lib/use-latest'
import { cn } from '@/lib/utils'
import { AUTH_MEAL_OPEN_SCALE, authDemoClear, authDemoTimeout } from '@/features/diary'
import {
  AUTH_DEMO_PLAN_DAY_COUNT,
  AUTH_DEMO_PLAN_START,
  authDemoPlanRange,
  authRationCalendarCloseAtMs,
  authRationCalendarPressAtMs,
} from '@/features/mentor'

const WEEKDAY_CLASS =
  'flex-1 rounded-(--cell-radius) text-[11px] font-medium text-[var(--nora-text-tertiary)] select-none'

const NAV_BUTTON_CLASS = cn(
  'inline-flex size-8 shrink-0 items-center justify-center rounded-full border-0 p-0',
  'bg-[var(--nora-panel)] text-[var(--nora-text-secondary)] shadow-none outline-none select-none',
)

/**
 * The open demo frame is scaled by AUTH_MEAL_OPEN_SCALE, so a 12px label
 * would look smaller than «Выбрать» on the resting ration card.
 */
const ACTION_BUTTON_FONT_SIZE = `${12 / AUTH_MEAL_OPEN_SCALE}px`
const ACTION_BUTTON_LINE_HEIGHT = `${16 / AUTH_MEAL_OPEN_SCALE}px`

const ACTION_BUTTON_CLASS = cn(
  'auth-plan-start-action nora-press-grow w-full',
  '!h-10 !min-h-10 !max-h-10',
  '!rounded-[var(--nora-radius-md)]',
  '!font-normal',
)

/**
 * Signup-demo stand-in for PlanStartDialog. The week is already selected.
 * Pressing «Начать…» closes the sheet.
 */
export function AuthPlanStartSheet({
  collapsing = false,
  play,
  startMs = 0,
  onComplete,
}: {
  collapsing?: boolean
  play: boolean
  startMs?: number
  onComplete?: () => void
}) {
  const onCompleteRef = useLatest(onComplete)
  const [startPressed, setStartPressed] = React.useState(false)
  const range = authDemoPlanRange(AUTH_DEMO_PLAN_START, AUTH_DEMO_PLAN_DAY_COUNT)
  const startLabel = format(AUTH_DEMO_PLAN_START, 'd MMMM', { locale: dateFnsRu })

  React.useEffect(() => {
    if (!play || collapsing) return
    const reduced =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduced) {
      onCompleteRef.current?.()
      return
    }
    const origin = Math.max(0, startMs)
    const pressAt = authRationCalendarPressAtMs()
    const closeAt = authRationCalendarCloseAtMs()
    if (origin >= pressAt && origin < closeAt) setStartPressed(true)
    const at = (ms: number, fn: () => void) => {
      if (ms <= origin) return null
      return authDemoTimeout(fn, ms - origin)
    }
    const timers = [
      at(pressAt, () => setStartPressed(true)),
      at(closeAt, () => {
        setStartPressed(false)
        onCompleteRef.current?.()
      }),
    ]
    return () => {
      for (const id of timers) {
        if (id != null) authDemoClear(id)
      }
    }
  }, [collapsing, onCompleteRef, play, startMs])

  return (
    <div
      className={cn(
        'flex min-h-0 flex-1 flex-col overflow-hidden',
        collapsing ? 'bg-transparent' : 'bg-[var(--nora-modal)]',
      )}
      data-collapsing={collapsing ? '' : undefined}
      data-demo-plan-start=""
    >
      <div
        className={cn(
          'shrink-0 px-2 pt-2 transition-opacity ease-out',
          collapsing && 'pointer-events-none opacity-0',
        )}
        style={{ transitionDuration: collapsing ? '180ms' : '300ms' }}
      >
        <div className="min-w-0 gap-1 rounded-[16px] bg-[var(--nora-inset)] p-2.5 text-left">
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
                  Выберите дату начала рациона.
                </DialogDescription>
              </div>
            </div>
            <span
              aria-hidden
              className={cn(
                productSheetOverlayChipClass,
                'inline-flex size-8 shrink-0 items-center justify-center bg-[var(--nora-panel)]/80',
              )}
            >
              <XIcon className="size-3.5" strokeWidth={1.75} />
            </span>
          </div>
        </div>
      </div>
      <div
        className={cn(
          'flex min-h-0 flex-1 flex-col overflow-hidden transition-opacity ease-out',
          collapsing && 'pointer-events-none min-h-0 flex-none opacity-0',
        )}
        style={{ transitionDuration: collapsing ? '220ms' : '300ms' }}
      >
      <div className="shrink-0 px-3 pt-3">
        <div className="rounded-[16px] bg-[var(--nora-inset)] p-2" data-plan-start-calendar="">
          <Calendar
            className={cn(noraSheetCalendarClass, '[--cell-size:2.15rem]')}
            classNames={{
              root: 'w-full',
              months: 'relative flex w-full flex-col',
              month: 'flex w-full flex-col gap-2',
              month_grid: 'w-full border-collapse',
              weekday: WEEKDAY_CLASS,
              nav: 'absolute inset-x-0 top-0 flex h-8 w-full items-center justify-between',
              month_caption: 'flex h-8 w-full items-center justify-center px-10',
              caption_label:
                'rdp-caption_label font-medium select-none text-[14px] leading-none text-[var(--nora-text)]',
              button_previous: cn(NAV_BUTTON_CLASS, 'rdp-button_previous'),
              button_next: cn(NAV_BUTTON_CLASS, 'rdp-button_next'),
            }}
            compactDays
            locale={dayPickerRu}
            mode="range"
            month={AUTH_DEMO_PLAN_START}
            numberOfMonths={1}
            onSelect={() => undefined}
            required
            selected={{ from: range.from, to: range.to }}
          />
        </div>
      </div>
      <div className="shrink-0 px-3 pt-6 pb-3">
        <div aria-hidden className="border-t border-[var(--nora-divider)]" data-plan-start-divider="" />
        <div className="mt-3">
          <NoraButton
            className={ACTION_BUTTON_CLASS}
            data-demo-pressed={startPressed ? '' : undefined}
            style={{ fontSize: ACTION_BUTTON_FONT_SIZE, lineHeight: ACTION_BUTTON_LINE_HEIGHT }}
            type="button"
            variant="primary"
          >
            Начать {startLabel}
          </NoraButton>
        </div>
      </div>
      </div>
    </div>
  )
}
