import * as React from 'react'
import { format } from 'date-fns'
import { ru as dateFnsRu } from 'date-fns/locale'
import { ru as dayPickerRu } from 'react-day-picker/locale'
import { CalendarDaysIcon, XIcon } from 'lucide-react'

import { NoraButton } from '@/components/nora/primitives'
import { productSheetOverlayChipClass } from '@/components/nora/product-sheet'
import { Calendar } from '@/components/ui/calendar'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { startOfLocalDay } from '@/platform/plan-slots'

const FRAME_CLASS = cn(
  'flex flex-col gap-0 overflow-hidden bg-[var(--nora-modal)] p-0',
  'inset-x-0 top-[var(--modal-sheet-inset)] bottom-0 h-[calc(100dvh-var(--modal-sheet-inset))] max-h-[calc(100dvh-var(--modal-sheet-inset))] w-full max-w-none translate-x-0 translate-y-0 rounded-t-[var(--modal-sheet-radius)] rounded-b-none',
  'md:inset-auto md:top-1/2 md:left-1/2 md:h-auto md:max-h-[min(760px,calc(100vh-2rem))] md:w-[min(100%-2rem,480px)] md:max-w-[480px] md:rounded-[24px]',
)

const CALENDAR_WEEKDAY_CLASS =
  'flex-1 rounded-(--cell-radius) text-[11px] font-medium text-[var(--nora-text-tertiary)] select-none'

export function PlanStartDialog({
  initialDate,
  onClear,
  onConfirm,
  onOpenChange,
  open,
  planTitle,
  selected,
}: {
  initialDate: Date
  onClear?: () => void
  onConfirm: (date: Date) => void
  onOpenChange: (open: boolean) => void
  open: boolean
  planTitle: string
  selected: boolean
}) {
  const [date, setDate] = React.useState(() => startOfLocalDay(initialDate))

  React.useEffect(() => {
    if (!open) return
    setDate(startOfLocalDay(initialDate))
  }, [initialDate, open])

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className={FRAME_CLASS} data-modal-frame="plan-start" showCloseButton={false}>
        <div className="shrink-0 px-2 pt-2">
          <DialogHeader className="min-w-0 gap-1 rounded-[16px] bg-[var(--nora-inset)] p-2.5 text-left">
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 flex-1 items-start gap-2.5">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[var(--nora-text)] text-[var(--nora-modal)]">
                  <CalendarDaysIcon aria-hidden className="size-4" strokeWidth={1.7} />
                </span>
                <div className="min-w-0 flex-1">
                  <DialogTitle className="font-[family-name:var(--nora-font)] !text-[15px] !font-medium !leading-6 tracking-normal text-[var(--nora-text)]">
                    С какого дня начать
                  </DialogTitle>
                  <DialogDescription className="mt-0.5 line-clamp-2 font-[family-name:var(--nora-font)] text-[12px] font-light leading-5 text-[var(--nora-text-tertiary)]">
                    {planTitle}. День 1 начнётся с выбранной даты, дальше — день 2, день 3 и так далее.
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
        <div className="flex min-h-0 flex-1 flex-col gap-3 px-3 pt-3 pb-[max(0.875rem,env(safe-area-inset-bottom))] sm:px-4 sm:pb-3.5">
          <div className="rounded-[16px] bg-[var(--nora-inset)] p-2 sm:p-3" data-plan-start-calendar="">
            <Calendar
              className="w-full bg-transparent p-0 [--cell-size:2.5rem] sm:[--cell-size:2.75rem]"
              classNames={{
                root: 'w-full',
                month: 'flex w-full flex-col gap-2',
                month_grid: 'w-full border-collapse',
                weekday: CALENDAR_WEEKDAY_CLASS,
              }}
              locale={dayPickerRu}
              mode="single"
              onSelect={(next) => {
                if (next) setDate(startOfLocalDay(next))
              }}
              selected={date}
            />
          </div>
          <NoraButton className="w-full" onClick={() => onConfirm(date)} variant="primary">
            Начать {format(date, 'd MMMM', { locale: dateFnsRu })}
          </NoraButton>
          {selected && onClear ? (
            <NoraButton className="w-full" onClick={onClear} variant="tinted">
              Снять план
            </NoraButton>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  )
}
