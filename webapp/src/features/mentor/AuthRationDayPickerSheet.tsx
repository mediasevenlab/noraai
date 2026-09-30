import * as React from 'react'
import { CalendarDaysIcon, Loader2Icon, PlusIcon, XIcon } from '@/components/icons'

import { productSheetOverlayChipClass } from '@/components/nora/product-sheet'
import { DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { useLatest } from '@/lib/use-latest'
import { cn } from '@/lib/utils'
import { authDemoClear, authDemoTimeout, rationsCountLabel } from '@/features/diary'

import {
  authRationAddDemoDay,
  authRationDayBusyAtMs,
  authRationDayCloseAtMs,
  authRationDayPressAtMs,
  authRationDaySuccessAtMs,
} from './auth-ration-demo'
import { rationPlanWeekDays } from './ration-assignments'
import type { RationEntry } from './rations-catalog'

const DEMO_PLAN_ID = 'auth-demo-week'

const DEMO_RATIONS = [
  { id: DEMO_PLAN_ID, title: 'План на неделю', image: '/rations/ration-01.jpg' },
  { id: 'tone', title: 'Тонус и лёгкость', image: '/rations/ration-02.jpg' },
  { id: 'even', title: 'Ровная неделя', image: '/rations/ration-03.jpg' },
  { id: 'hearty', title: 'Сытная неделя', image: '/rations/ration-05.jpg' },
] as const

const DEMO_PLAN_CARD_CLASS =
  'flex w-[calc((100%-2rem)/5)] min-w-[calc((100%-2rem)/5)] max-w-[calc((100%-2rem)/5)] shrink-0 flex-col gap-1.5'
const DEMO_PLAN_COVER_CLASS =
  'relative block w-full shrink-0 overflow-hidden rounded-[16px] p-0.5'
const DEMO_PLAN_COVER_SQUARE_CLASS = 'relative block w-full before:block before:pb-[100%]'
const DEMO_PLAN_TITLE_CLASS =
  'block w-full truncate text-center font-[family-name:var(--nora-font)] text-[13px] leading-4'

const DAY_ROW_CLASS = cn(
  'nora-press-grow ios-glass-glare-soft flex min-h-12 items-center gap-3 rounded-[14px] border-0 px-3.5 py-2.5 text-left',
  'bg-[var(--nora-inset)] text-[var(--nora-text-secondary)] outline-none',
  'focus-visible:shadow-[var(--nora-shadow-focus)] disabled:cursor-default',
)

/**
 * Login-demo stand-in for DiaryPlanDayPicker. Same chrome as the diary
 * «Добавить рацион» sheet, fitted to the carousel window instead of the
 * full 480px dialog.
 */
export function AuthRationDayPickerSheet({
  collapsing = false,
  play,
  ration,
  startMs = 0,
  onCaptionId,
  onComplete,
}: {
  collapsing?: boolean
  play: boolean
  ration: RationEntry
  startMs?: number
  onCaptionId?: (id: 'rationAdd') => void
  onComplete?: () => void
}) {
  const monday = React.useMemo(() => authRationAddDemoDay(), [])
  const days = React.useMemo(() => rationPlanWeekDays(), [])
  const [pressedDayKey, setPressedDayKey] = React.useState<string | null>(null)
  const [addingDayKey, setAddingDayKey] = React.useState<string | null>(null)
  const [assigned, setAssigned] = React.useState(false)
  const onCaptionIdRef = useLatest(onCaptionId)
  const onCompleteRef = useLatest(onComplete)

  React.useEffect(() => {
    onCaptionIdRef.current?.('rationAdd')
  }, [onCaptionIdRef])

  React.useEffect(() => {
    if (!play) return

    const reduced =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduced) {
      const id = authDemoTimeout(() => onCompleteRef.current?.(), 80)
      return () => authDemoClear(id)
    }

    const origin = Math.max(0, startMs)
    const pressAt = authRationDayPressAtMs()
    const busyAt = authRationDayBusyAtMs()
    const successAt = authRationDaySuccessAtMs()
    if (origin >= successAt) {
      setAssigned(true)
    } else if (origin >= busyAt) {
      setAddingDayKey(monday.dayKey)
    } else if (origin >= pressAt) {
      setPressedDayKey(monday.dayKey)
    }

    const at = (ms: number, fn: () => void) => {
      if (ms <= origin) return null
      return authDemoTimeout(fn, ms - origin)
    }
    const timers = [
      at(pressAt, () => setPressedDayKey(monday.dayKey)),
      at(busyAt, () => {
        setPressedDayKey(null)
        setAddingDayKey(monday.dayKey)
      }),
      at(successAt, () => {
        setAddingDayKey(null)
        setAssigned(true)
      }),
      at(authRationDayCloseAtMs(), () => onCompleteRef.current?.()),
    ]
    return () => {
      for (const id of timers) {
        if (id != null) authDemoClear(id)
      }
    }
  }, [monday.dayKey, play, onCompleteRef])

  const busy = Boolean(addingDayKey)

  return (
    <div
      className={cn(
        'flex min-h-0 flex-1 flex-col overflow-hidden',
        collapsing ? 'bg-transparent' : 'bg-[var(--nora-modal)]',
      )}
      data-collapsing={collapsing ? '' : undefined}
      data-ration-day-picker="demo"
    >
      <div
        className={cn(
          'flex shrink-0 flex-col gap-2 px-2 pt-2 transition-opacity ease-out',
          collapsing && 'pointer-events-none opacity-0',
        )}
        style={{ transitionDuration: collapsing ? '180ms' : '300ms' }}
      >
        <div className="min-w-0 rounded-[16px] bg-[var(--nora-inset)] p-2.5 text-left">
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 flex-1 items-center gap-2.5">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[var(--nora-text)] text-[var(--nora-modal)]">
                <CalendarDaysIcon aria-hidden className="size-4" strokeWidth={1.7} />
              </span>
              <div className="min-w-0 flex-1">
                <DialogTitle className="flex min-w-0 items-baseline gap-1.5 font-[family-name:var(--nora-font)] !text-[15px] !font-medium !leading-6 tracking-normal text-[var(--nora-text)]">
                  <span className="truncate">Добавить рацион</span>
                  <span className="shrink-0 font-light text-[#707070]">
                    ({rationsCountLabel(DEMO_RATIONS.length)})
                  </span>
                </DialogTitle>
                <DialogDescription className="sr-only">
                  {ration.title}. Можно поставить в выбранный план, в один или несколько дней.
                </DialogDescription>
              </div>
            </div>
            <span
              aria-hidden
              className={cn(
                productSheetOverlayChipClass,
                'size-8 shrink-0 bg-[var(--nora-panel)]/80',
              )}
            >
              <XIcon className="size-3.5" strokeWidth={1.75} />
            </span>
          </div>
        </div>
      </div>
      <div
        className={cn(
          'mt-4 shrink-0 px-3.5 transition-opacity ease-out',
          collapsing && 'pointer-events-none opacity-0',
        )}
        style={{ transitionDuration: collapsing ? '180ms' : '300ms' }}
      >
        <div
          aria-label="План назначения"
          className="no-scrollbar -mx-3.5 flex gap-2 overflow-x-auto px-3.5"
          data-ration-demo-plans=""
        >
          <div className={DEMO_PLAN_CARD_CLASS}>
            <span className={cn(DEMO_PLAN_COVER_CLASS, 'bg-transparent')}>
              <span className={DEMO_PLAN_COVER_SQUARE_CLASS}>
                <span className="absolute inset-0 flex items-center justify-center rounded-[14px] bg-[var(--nora-inset)]">
                  <span className="flex size-8 items-center justify-center rounded-full bg-[var(--nora-tint)] text-white">
                    <PlusIcon aria-hidden className="size-4 text-white" color="white" strokeWidth={2} />
                  </span>
                </span>
              </span>
            </span>
            <span className={cn(DEMO_PLAN_TITLE_CLASS, 'font-light text-[#707070]')}>
              Новый план
            </span>
          </div>
          {DEMO_RATIONS.map((plan) => {
            const selected = plan.id === DEMO_PLAN_ID
            return (
              <div className={DEMO_PLAN_CARD_CLASS} key={plan.id}>
                <span
                  className={cn(
                    DEMO_PLAN_COVER_CLASS,
                    selected ? 'bg-[var(--nora-tint)]' : 'bg-transparent',
                  )}
                >
                  <span className={DEMO_PLAN_COVER_SQUARE_CLASS}>
                    <img
                      alt=""
                      className={cn(
                        'absolute inset-0 size-full rounded-[14px] bg-[var(--nora-inset)] object-cover',
                        !selected && 'grayscale',
                      )}
                      src={plan.image}
                    />
                  </span>
                </span>
                <span
                  className={cn(
                    DEMO_PLAN_TITLE_CLASS,
                    selected
                      ? 'font-medium text-[var(--nora-text)]'
                      : 'font-light text-[#707070]',
                  )}
                >
                  {plan.title}
                </span>
              </div>
            )
          })}
        </div>
      </div>
      <div
        className={cn(
          'shrink-0 px-3.5 pt-4 transition-opacity ease-out',
          collapsing && 'pointer-events-none opacity-0',
        )}
        style={{ transitionDuration: collapsing ? '180ms' : '300ms' }}
      >
        <div aria-hidden className="border-t border-[var(--nora-divider)]" />
      </div>
      <div
        className={cn(
          'flex min-h-0 flex-1 flex-col gap-2.5 overflow-y-auto px-3.5 pt-4 pb-3.5 transition-opacity ease-out',
          collapsing && 'pointer-events-none min-h-0 flex-none opacity-0',
        )}
        style={{ transitionDuration: collapsing ? '220ms' : '300ms' }}
      >
        <div className="flex flex-col gap-2.5">
          {days.map((day) => {
            const dayBusy = addingDayKey === day.dayKey
            const marked = assigned && day.dayKey === monday.dayKey
            const status = marked ? 'уже в рационе' : 'свободен'
            return (
              <button
                className={DAY_ROW_CLASS}
                data-demo-pressed={pressedDayKey === day.dayKey ? '' : undefined}
                data-plan-state={marked ? 'same' : 'free'}
                data-ration-day={day.dayKey}
                disabled={dayBusy || busy}
                key={day.dayKey}
                type="button"
              >
                <span
                  className={cn(
                    'flex size-5 shrink-0 items-center justify-center rounded-full border transition-colors',
                    marked
                      ? 'border-[var(--nora-success)] bg-[var(--nora-panel)]'
                      : dayBusy
                        ? 'border-[var(--nora-success)] bg-[var(--nora-success-dimmed)] text-[var(--nora-success)]'
                        : 'border-[var(--nora-border-strong)] bg-[var(--nora-panel)]',
                  )}
                >
                  {dayBusy ? (
                    <Loader2Icon className="size-3 animate-spin" />
                  ) : marked ? (
                    <span aria-hidden className="size-2 rounded-full bg-[var(--nora-success)]" />
                  ) : null}
                </span>
                <span className="min-w-0 flex-1 truncate font-[family-name:var(--nora-font)] text-[13px] font-normal leading-5 text-[var(--nora-text)]">
                  {day.label}
                </span>
                <span
                  className={cn(
                    'shrink-0 whitespace-nowrap rounded-full px-2.5 py-1 font-[family-name:var(--nora-font)] text-[11px] leading-none',
                    marked
                      ? 'bg-[var(--nora-success)] font-medium text-white'
                      : 'bg-[var(--nora-panel)]/80 text-[var(--nora-text-tertiary)]',
                  )}
                >
                  {dayBusy ? 'добавляем…' : status}
                </span>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
