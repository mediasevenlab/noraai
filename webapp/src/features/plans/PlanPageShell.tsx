import * as React from 'react'
import {
  CalendarDaysIcon,
  CalendarRangeIcon,
  FlameIcon,
  InfoIcon,
  PencilIcon,
  UtensilsIcon,
  XIcon,
} from '@/components/icons'
import type { LucideIcon } from '@/components/icons'

import { noraPageDescriptionClass, noraPageTitleClass } from '@/components/PageLayout'
import { noraProductTitleClass } from '@/components/nora/primitives'
import {
  productFeedPageClass,
  productSheetOverlayChipClass,
} from '@/components/nora/product-sheet'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog'
import { MealFeedPhoto } from '@/features/diary'
import { cn } from '@/lib/utils'

const INFO_FRAME_CLASS = cn(
  '!flex flex-col gap-0 overflow-hidden bg-[var(--nora-modal)] !p-0',
  'inset-x-0 bottom-0 top-auto h-auto max-h-[calc(100dvh-var(--modal-sheet-inset))] w-full max-w-none translate-x-0 translate-y-0 rounded-t-[var(--modal-sheet-radius)] rounded-b-none',
  'md:inset-auto md:top-1/2 md:left-1/2 md:bottom-auto md:h-auto md:max-h-[min(720px,calc(100vh-2rem))] md:w-[min(100%-2rem,460px)] md:max-w-[460px] md:rounded-[22px]',
)

const INFO_BODY_CLASS =
  'font-[family-name:var(--nora-font)] text-[13px] font-normal leading-5 text-[var(--nora-text)]'
const INFO_LABEL_CLASS =
  'mb-1.5 pl-4 font-[family-name:var(--nora-font)] text-[13px] font-medium leading-5 text-[var(--nora-text)]'
const INFO_COPY_CLASS =
  'font-[family-name:var(--nora-font)] text-[13px] font-light leading-5 text-[var(--nora-text-secondary)] dark:text-[color-mix(in_srgb,var(--nora-text)_42%,var(--nora-text-secondary))]'
const FACT_ROW_CLASS =
  'flex min-h-[3.25rem] items-center justify-between gap-3 rounded-[14px] bg-[var(--nora-inset)] pl-2.5 pr-4'
const FACT_ICON_WRAP_CLASS = cn(
  'inline-flex size-7 shrink-0 items-center justify-center rounded-full',
  'bg-[var(--nora-panel)] text-[var(--nora-text-secondary)]',
  '[&_svg]:size-3.5',
)

const FACT_ICONS: Record<string, LucideIcon> = {
  Дней: CalendarDaysIcon,
  Приёмов: UtensilsIcon,
  Калорийность: FlameIcon,
  Период: CalendarRangeIcon,
}

const HEADER_CHIP_CLASS = cn(
  productSheetOverlayChipClass,
  'nora-press-grow size-8 shrink-0 bg-[var(--nora-panel)]/80 sm:size-8',
  'hover:text-[var(--nora-text)] focus-visible:shadow-[var(--nora-shadow-focus)]',
)
const INFO_MARK_CLASS =
  'flex size-8 shrink-0 items-center justify-center rounded-full bg-[var(--nora-text)] text-[var(--nora-modal)]'
const INFO_BAR_CLASS = 'flex min-w-0 items-center gap-2.5 rounded-[16px] bg-[var(--nora-inset)] p-2.5 text-left'

export function PlanPageShell({
  children,
  coverImage,
  description,
  facts = [],
  showHeaderOnMobile = false,
  title,
  onEdit,
}: {
  children: React.ReactNode
  coverImage?: string
  description: string
  facts?: ReadonlyArray<{ label: string; value: string }>
  showHeaderOnMobile?: boolean
  title: string
  onEdit?: () => void
}) {
  const [infoOpen, setInfoOpen] = React.useState(false)
  const visibleFacts = facts.filter((fact) => fact.label !== 'Тип' && fact.label !== 'Цель')

  return (
    <div className="news-page relative min-h-full">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background: `
            radial-gradient(900px 420px at 12% -10%, color-mix(in srgb, var(--nora-tint) var(--dash-glow-tint), transparent), transparent 60%),
            radial-gradient(700px 380px at 90% 0%, color-mix(in srgb, var(--nora-component) var(--dash-glow-component), transparent), transparent 55%),
            linear-gradient(180deg, var(--nora-canvas) 0%, var(--dash-atmosphere-mid) 48%, var(--nora-canvas) 100%)
          `,
        }}
      />
      <div className={productFeedPageClass}>
        <header className={showHeaderOnMobile ? undefined : 'hidden md:block'}>
          {showHeaderOnMobile ? (
            <div data-plan-mobile-header="" className={cn(INFO_BAR_CLASS, 'mb-3 w-full md:hidden')}>
              <button
                aria-label="О рационе"
                className={INFO_MARK_CLASS}
                data-plan-info-open=""
                onClick={() => setInfoOpen(true)}
                type="button"
              >
                <InfoIcon aria-hidden className="size-4" strokeWidth={1.7} />
              </button>
              <h1 className={cn(noraProductTitleClass, 'min-w-0 flex-1 truncate')}>{title}</h1>
              {onEdit ? (
                <button
                  aria-label="Изменить"
                  className={HEADER_CHIP_CLASS}
                  data-plan-outline-open=""
                  onClick={onEdit}
                  type="button"
                >
                  <PencilIcon aria-hidden className="size-3.5" strokeWidth={1.75} />
                </button>
              ) : null}
            </div>
          ) : null}
          <div className={showHeaderOnMobile ? 'hidden md:block' : undefined}>
            <div className="mb-1.5 flex items-center gap-2">
              <h1 className={noraPageTitleClass}>{title}</h1>
            </div>
            <p className={cn('mt-1.5', noraPageDescriptionClass)}>
              {description}
            </p>
          </div>
        </header>
        {children}
      </div>
      {showHeaderOnMobile ? (
        <Dialog disablePointerDismissal onOpenChange={setInfoOpen} open={infoOpen}>
          <DialogContent
            className={INFO_FRAME_CLASS}
            data-plan-info=""
            showCloseButton={false}
          >
            <div className="shrink-0 px-2 pt-2">
              <div className={cn(INFO_BAR_CLASS, 'w-full')}>
                <span className={INFO_MARK_CLASS}>
                  <InfoIcon aria-hidden className="size-4" strokeWidth={1.7} />
                </span>
                <DialogTitle className={cn(noraProductTitleClass, 'min-w-0 flex-1 truncate text-left')}>
                  {title}
                </DialogTitle>
                <DialogClose aria-label="Закрыть" className={HEADER_CHIP_CLASS}>
                  <XIcon aria-hidden className="size-3.5" strokeWidth={1.75} />
                </DialogClose>
              </div>
            </div>
            <div className="flex min-h-0 flex-col gap-3 overflow-y-auto px-3 pt-3 pb-[max(0.875rem,env(safe-area-inset-bottom))] sm:px-4 sm:pb-3.5">
              {coverImage ? (
                <div className="relative aspect-[16/9] min-h-[7.5rem] w-full overflow-hidden rounded-[16px] bg-[var(--nora-inset)]">
                  <MealFeedPhoto sizes="md" src={coverImage} />
                </div>
              ) : null}
              {description.trim() ? (
                <div className="flex flex-col gap-1.5">
                  <p className={INFO_LABEL_CLASS}>Описание:</p>
                  <DialogDescription className={cn(INFO_COPY_CLASS, 'whitespace-pre-line rounded-[14px] bg-[var(--nora-inset)] px-4 py-3')}>
                    {description}
                  </DialogDescription>
                </div>
              ) : (
                <DialogDescription className="sr-only">{title}</DialogDescription>
              )}
              {visibleFacts.length > 0 ? (
                <section className="flex flex-col gap-1.5" data-plan-info-summary="">
                  <p className={INFO_LABEL_CLASS}>Показатели:</p>
                  {visibleFacts.map((fact) => {
                    const Icon = FACT_ICONS[fact.label]
                    return (
                      <div className={FACT_ROW_CLASS} key={fact.label}>
                        <span className={cn(INFO_BODY_CLASS, 'flex min-w-0 items-center gap-2.5')}>
                          {Icon ? (
                            <span className={FACT_ICON_WRAP_CLASS}>
                              <Icon aria-hidden strokeWidth={1.75} />
                            </span>
                          ) : null}
                          {fact.label}
                        </span>
                        <span className={cn(INFO_BODY_CLASS, 'text-right')}>{fact.value}</span>
                      </div>
                    )
                  })}
                </section>
              ) : null}
            </div>
          </DialogContent>
        </Dialog>
      ) : null}
    </div>
  )
}
