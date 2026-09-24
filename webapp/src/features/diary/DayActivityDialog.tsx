import * as React from 'react'
import { format } from 'date-fns'
import { ru as dateFnsRu } from 'date-fns/locale'
import { XIcon } from 'lucide-react'

import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'

import {
  ACTIVITY_RING_DIALOG_SIZE,
  activityRingHoleRadius,
  activityRingLayout,
  closedDayRings,
  currentActivityDayKey,
  dayActivityRings,
  mealsOnActivityDay,
  mondayWeekPlanDays,
  ringStroke,
  sumDiaryDayStats,
  WEEK_ACTIVITY_DAYS,
  weekActivityRings,
  type DayActivityMeal,
  type DayActivityRing,
  type DayActivityRingKey,
} from './day-activity-rings'

const RING_COLOR: Record<DayActivityRingKey, string> = {
  kcal: 'var(--nora-tint)',
  done: 'var(--nora-badge-green-text)',
  meals: 'var(--nora-component)',
}

const FRAME_CLASS = cn(
  'flex flex-col gap-0 overflow-hidden p-0',
  'w-full max-w-none rounded-t-[var(--modal-sheet-radius)] rounded-b-none',
  'md:w-[min(calc(100%-2rem),420px)] md:max-w-[420px] md:rounded-[22px]',
)

const SCOPE_CHIP_CLASS = cn(
  'nora-press-grow ios-glass-glare-soft inline-flex h-7 min-h-7 max-h-7 shrink-0 items-center rounded-full border-0 px-2.5',
  'font-[family-name:var(--nora-font)] text-[12px] font-normal leading-none backdrop-blur-[16px] outline-none',
  'bg-[var(--nora-input-bg)]/72 text-[var(--nora-text-secondary)]',
  'data-active:bg-[var(--nora-tint-dimmed)] data-active:text-[var(--nora-tint)]',
  'focus-visible:shadow-[var(--nora-shadow-focus)]',
)

const CLOSE_CLASS = cn(
  'nora-press-grow ios-glass-glare inline-flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-full border-0',
  'bg-[var(--nora-panel)]/72 text-[var(--nora-text-tertiary)] backdrop-blur-[16px] outline-none sm:size-6',
  'hover:text-[var(--nora-text)] focus-visible:shadow-[var(--nora-shadow-focus)]',
)

const CHIP_CLASS = cn(
  'ios-glass-glare inline-flex h-7 min-h-7 max-h-7 shrink-0 items-center gap-1 rounded-full border-0',
  'bg-[color-mix(in_srgb,var(--nora-input-bg)_55%,var(--nora-canvas))] py-0 pr-2.5 pl-2',
  'text-[12px] font-normal leading-none text-[var(--nora-text-secondary)] backdrop-blur-[16px]',
)

function formatCount(n: number) {
  return n.toLocaleString('ru-RU')
}

export function DayActivityRingsMark({
  animated = false,
  rings,
  size = 18,
}: {
  animated?: boolean
  rings: readonly DayActivityRing[]
  size?: number
}) {
  const layout = activityRingLayout(size)
  const center = size / 2
  const compact = size < 80
  const track = 'color-mix(in srgb, var(--nora-text) 12%, transparent)'

  return (
    <svg
      aria-hidden
      height={size}
      overflow="visible"
      viewBox={`0 0 ${size} ${size}`}
      width={size}
    >
      {rings.map((ring, index) => {
        const spec = layout[index]
        if (!spec) return null
        const stroke = ringStroke(ring.progress, spec.radius)
        return (
          <g key={ring.key}>
            <circle
              cx={center}
              cy={center}
              fill="none"
              r={spec.radius}
              stroke={track}
              strokeWidth={spec.width}
            />
            <circle
              cx={center}
              cy={center}
              fill="none"
              r={spec.radius}
              stroke={RING_COLOR[ring.key]}
              className={
                animated
                  ? 'transition-[stroke-dashoffset] duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]'
                  : undefined
              }
              strokeDasharray={stroke.circumference}
              strokeDashoffset={stroke.gap}
              strokeLinecap={compact ? 'butt' : 'round'}
              strokeWidth={spec.width}
              transform={`rotate(-90 ${center} ${center})`}
            />
          </g>
        )
      })}
    </svg>
  )
}

function DayBalanceChip({
  calorieTarget,
  eaten,
}: {
  calorieTarget: number
  eaten: number
}) {
  const delta = calorieTarget - eaten
  const label =
    delta > 0 ? `Недобор −${formatCount(delta)}` : delta < 0 ? `Перебор +${formatCount(-delta)}` : 'Норма'
  const tone = delta > 0 ? 'yellow' : delta < 0 ? 'red' : 'green'
  return (
    <div
      className={cn(
        CHIP_CLASS,
        tone === 'yellow' && 'bg-[var(--nora-badge-yellow-bg)] text-[var(--nora-badge-yellow-text)]',
        tone === 'red' && 'bg-[var(--nora-badge-red-bg)] text-[var(--nora-badge-red-text)]',
        tone === 'green' && 'bg-[var(--nora-badge-green-bg)] text-[var(--nora-badge-green-text)]',
      )}
    >
      {label}
    </div>
  )
}

type ActivityMeal = DayActivityMeal & {
  at?: string
  recordedAt?: string
  kcal: number
  protein: number
  fat: number
  carbs: number
}

type ActivityScope = 'week' | string

export function DayActivityDialog({
  completedIds,
  dailyCalories,
  meals,
  onOpenChange,
  open,
}: {
  completedIds: ReadonlySet<string>
  dailyCalories: number
  meals: readonly ActivityMeal[]
  onOpenChange: (open: boolean) => void
  open: boolean
}) {
  const [scope, setScope] = React.useState<ActivityScope>(() => currentActivityDayKey())
  const days = mondayWeekPlanDays()
  const selectedDay = days.find((day) => day.dayKey === scope) ?? null
  const scopedMeals = selectedDay ? mealsOnActivityDay(meals, selectedDay.dayKey) : meals
  const totals = sumDiaryDayStats(scopedMeals, completedIds)
  const rings = selectedDay
    ? dayActivityRings({ completedIds, dailyCalories, meals: scopedMeals, totals })
    : weekActivityRings({ completedIds, dailyCalories, meals: scopedMeals, totals })
  const calorieTarget = selectedDay ? dailyCalories : dailyCalories * WEEK_ACTIVITY_DAYS
  const heading = selectedDay
    ? `${selectedDay.short}. ${format(selectedDay.date, 'd MMM', { locale: dateFnsRu })}`
    : `Неделя · ${format(days[0]!.date, 'd', { locale: dateFnsRu })}–${format(days[6]!.date, 'd MMM', { locale: dateFnsRu })}`
  const description = selectedDay
    ? 'Кольца калорий, выполнения плана и приёмов за день.'
    : 'Кольца калорий, выполнения плана и приёмов за неделю.'
  const closed = closedDayRings(rings)
  const holePx = activityRingHoleRadius(ACTIVITY_RING_DIALOG_SIZE) * 2

  function handleOpenChange(next: boolean) {
    if (next) setScope(currentActivityDayKey())
    onOpenChange(next)
  }

  return (
    <Dialog onOpenChange={handleOpenChange} open={open}>
      <DialogContent
        className={FRAME_CLASS}
        data-day-activity-dialog=""
        showCloseButton={false}
      >
        <DialogHeader className="min-w-0 shrink-0 gap-0 bg-[var(--nora-modal)] px-3 pt-3.5 text-left sm:px-4">
          <div className="flex items-start justify-between gap-3">
            <DialogTitle className="font-[family-name:var(--nora-font)] !text-[15px] !font-medium !leading-6 tracking-normal text-[var(--nora-text)]">
              {heading}
            </DialogTitle>
            <DialogClose aria-label="Закрыть" className={CLOSE_CLASS}>
              <XIcon aria-hidden className="size-3.5" strokeWidth={1.75} />
            </DialogClose>
          </div>
          <DialogDescription className="mt-2 font-[family-name:var(--nora-font)] text-[12px] font-light leading-5 text-[var(--nora-text-tertiary)]">
            {description}
          </DialogDescription>
          <div className="mt-3 flex gap-1 overflow-x-auto no-scrollbar">
            <button
              aria-pressed={scope === 'week'}
              className={SCOPE_CHIP_CLASS}
              data-active={scope === 'week' || undefined}
              data-activity-scope="week"
              onClick={() => setScope('week')}
              type="button"
            >
              Нед
            </button>
            {days.map((day) => (
              <button
                aria-pressed={scope === day.dayKey}
                className={SCOPE_CHIP_CLASS}
                data-active={scope === day.dayKey || undefined}
                data-activity-scope={day.dayKey}
                data-today={day.isToday ? '' : undefined}
                key={day.dayKey}
                onClick={() => setScope(day.dayKey)}
                type="button"
              >
                {day.short}
              </button>
            ))}
          </div>
          <div aria-hidden className="mt-3 border-t border-[var(--nora-divider)]" />
        </DialogHeader>
        <div className="flex flex-col items-center gap-5 px-3 pt-4 pb-[max(0.875rem,env(safe-area-inset-bottom))] sm:px-4 sm:pb-4">
          <div
            className="relative"
            style={{ width: ACTIVITY_RING_DIALOG_SIZE, height: ACTIVITY_RING_DIALOG_SIZE }}
          >
            <DayActivityRingsMark animated rings={rings} size={ACTIVITY_RING_DIALOG_SIZE} />
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div
                className="flex flex-col items-center justify-center text-center"
                style={{ width: holePx - 12, height: holePx - 12 }}
              >
                <span className="font-[family-name:var(--nora-font)] text-[22px] font-medium leading-none text-[var(--nora-text)]">
                  {closed}
                </span>
                <span className="mt-1.5 font-[family-name:var(--nora-font)] text-[12px] font-light leading-none text-[var(--nora-text-tertiary)]">
                  из {rings.length}
                </span>
              </div>
            </div>
          </div>
          <ul className="flex w-full flex-col gap-2">
            {rings.map((ring) => (
              <li
                className="flex min-h-12 items-center gap-2.5 rounded-[14px] bg-[var(--nora-input-bg)]/72 px-2.5 py-2"
                key={ring.key}
              >
                <span
                  aria-hidden
                  className="size-2.5 shrink-0 rounded-full"
                  style={{ background: RING_COLOR[ring.key] }}
                />
                <span className="min-w-0 flex-1 font-[family-name:var(--nora-font)] text-[13px] font-normal text-[var(--nora-text)]">
                  {ring.label}
                </span>
                <span className="shrink-0 font-[family-name:var(--nora-font)] text-[12px] font-light tabular-nums text-[var(--nora-text-secondary)]">
                  {formatCount(ring.value)} / {formatCount(ring.target)}
                </span>
              </li>
            ))}
          </ul>
          <DayBalanceChip calorieTarget={calorieTarget} eaten={totals.kcal} />
        </div>
      </DialogContent>
    </Dialog>
  )
}
