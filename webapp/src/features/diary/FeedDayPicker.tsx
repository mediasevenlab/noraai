import {
  CheckIcon,
  Loader2Icon,
  XIcon,
} from '@/components/icons'
import { format } from 'date-fns'
import { ru as dateFnsRu } from 'date-fns/locale'

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
  feedPlanWeekDays,
  feedSourceOnDay,
  type FeedDiaryStamp,
  type FeedPlanWeekDay,
} from './feed-import'
import { MEAL_DIALOG_OVERLAY_CHIP_CLASS } from './meal-sheet'
import type { MealEntry } from './meals-catalog'

function planDayStamp(date: Date) {
  return format(date, 'd MMM', { locale: dateFnsRu })
}

const FEED_DAY_PICKER_FRAME_CLASS = cn(
  'flex flex-col gap-0 overflow-hidden p-0',
  'inset-x-0 top-[var(--modal-sheet-inset)] bottom-0 h-[calc(100dvh-var(--modal-sheet-inset))] max-h-[calc(100dvh-var(--modal-sheet-inset))] w-full max-w-none translate-x-0 translate-y-0 rounded-t-[var(--modal-sheet-radius)] rounded-b-none',
  'md:inset-auto md:top-1/2 md:left-1/2 md:h-auto md:max-h-[min(720px,calc(100vh-2rem))] md:w-[min(100%-2rem,460px)] md:max-w-[460px] md:rounded-[22px]',
)

const FEED_DAY_ROW_CLASS = cn(
  'nora-press-grow ios-glass-glare-soft flex min-h-12 items-center gap-2.5 rounded-[14px] border-0 px-2.5 py-2 text-left',
  'bg-[var(--nora-input-bg)]/72 text-[var(--nora-text-secondary)] backdrop-blur-[16px] outline-none',
  'hover:bg-[var(--nora-input-bg)] hover:text-[var(--nora-text)]',
  'focus-visible:shadow-[var(--nora-shadow-focus)] disabled:opacity-60',
)

const FEED_DAY_BADGE_CLASS = cn(
  'ios-glass-glare-soft inline-flex h-6 min-h-6 max-h-6 w-fit shrink-0 items-center self-start rounded-full border-0 px-2.5',
  'font-[family-name:var(--nora-font)] text-[12px] font-medium leading-none tracking-normal backdrop-blur-[8px]',
)

export function FeedDayPicker({
  addingDayKey,
  meal,
  meals,
  onOpenChange,
  onSelectDay,
  open,
}: {
  addingDayKey: string | null
  meal: MealEntry | null
  meals: readonly FeedDiaryStamp[]
  onOpenChange: (open: boolean) => void
  onSelectDay: (day: FeedPlanWeekDay) => void
  open: boolean
}) {
  const days = feedPlanWeekDays()

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent
        className={FEED_DAY_PICKER_FRAME_CLASS}
        data-feed-day-picker=""
        data-modal-frame="meal"
        showCloseButton={false}
      >
        {meal ? (
          <>
            <DialogHeader className="min-w-0 shrink-0 gap-1 bg-[var(--nora-modal)] px-3 pt-3 text-left sm:px-4 sm:pt-3.5">
              <div className="flex items-start justify-between gap-3">
                <DialogTitle className="font-[family-name:var(--nora-font)] !text-[15px] !font-medium !leading-6 tracking-normal text-[var(--nora-text)]">
                  Выберите день
                </DialogTitle>
                <DialogClose
                  aria-label="Закрыть"
                  className={cn(
                    MEAL_DIALOG_OVERLAY_CHIP_CLASS,
                    'nora-press-grow size-8 shrink-0 sm:size-6',
                    'hover:text-[var(--nora-text)] focus-visible:shadow-[var(--nora-shadow-focus)]',
                  )}
                >
                  <XIcon aria-hidden className="size-3.5" strokeWidth={1.75} />
                </DialogClose>
              </div>
              <DialogDescription className="font-[family-name:var(--nora-font)] text-[12px] font-light leading-5 text-[var(--nora-text-tertiary)]">
                {meal.title}. Можно добавить в несколько дней, рядом с рационом.
              </DialogDescription>
              <div aria-hidden className="mt-1.5 border-t border-[var(--nora-divider)]" />
            </DialogHeader>
            <div className="flex flex-col gap-1.5 px-3 pt-3 pb-[max(0.875rem,env(safe-area-inset-bottom))] sm:px-4 sm:pb-3.5">
              {days.map((day) => {
                const already = feedSourceOnDay(meals, meal.id, day.date)
                const busy = addingDayKey === day.dayKey
                const hint = already ? 'уже есть' : 'свободен'
                return (
                  <button
                    className={FEED_DAY_ROW_CLASS}
                    data-feed-day={day.dayKey}
                    data-plan-state={already ? 'same' : 'free'}
                    disabled={busy || Boolean(addingDayKey)}
                    key={day.dayKey}
                    onClick={() => onSelectDay(day)}
                    type="button"
                  >
                    <span
                      className={cn(
                        FEED_DAY_BADGE_CLASS,
                        'w-8 justify-center self-center bg-[var(--nora-panel)]/80 px-0 text-[var(--nora-text)]',
                      )}
                    >
                      {day.short}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex min-w-0 items-baseline gap-1.5 font-[family-name:var(--nora-font)] text-[13px] font-normal text-[var(--nora-text)]">
                        <span className="truncate">{planDayStamp(day.date)}</span>
                        {day.isToday ? (
                          <span className="shrink-0 text-[12px] font-light text-[var(--nora-text-tertiary)]">
                            сегодня
                          </span>
                        ) : null}
                      </span>
                    </span>
                    <span
                      className={cn(
                        FEED_DAY_BADGE_CLASS,
                        'shrink-0 self-center whitespace-nowrap font-normal',
                        already &&
                          'bg-[var(--nora-badge-green-bg)] text-[var(--nora-badge-green-text)]',
                        !already && 'bg-[var(--nora-panel)]/80',
                      )}
                    >
                      {busy ? 'добавляем…' : hint}
                    </span>
                    {busy ? (
                      <Loader2Icon className="size-4 shrink-0 animate-spin text-[var(--nora-text-tertiary)]" />
                    ) : already ? (
                      <CheckIcon className="size-3.5 shrink-0 text-[var(--nora-badge-green-text)]" />
                    ) : null}
                  </button>
                )
              })}
            </div>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
