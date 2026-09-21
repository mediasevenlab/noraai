import * as React from 'react'
import {
  CalendarDaysIcon,
  CalendarRangeIcon,
  FlameIcon,
  InfoIcon,
  PencilIcon,
  UtensilsIcon,
  XIcon,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

import { noraPageDescriptionClass, noraPageTitleClass } from '@/components/PageLayout'
import { NoraBadge, noraProductTitleClass } from '@/components/nora/primitives'
import {
  productFeedPageClass,
  productSheetOverlayChipClass,
} from '@/components/nora/product-sheet'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { MealFeedPhoto } from '@/features/diary'
import { cn } from '@/lib/utils'

const INFO_FRAME_CLASS = cn(
  '!flex flex-col gap-0 overflow-hidden bg-[var(--nora-modal)] !p-0',
  'inset-x-0 bottom-0 top-auto h-auto max-h-[calc(100dvh-var(--modal-sheet-inset))] w-full max-w-none translate-x-0 translate-y-0 rounded-t-[var(--modal-sheet-radius)] rounded-b-none',
  'md:inset-auto md:top-1/2 md:left-1/2 md:bottom-auto md:h-auto md:max-h-[min(720px,calc(100vh-2rem))] md:w-[min(100%-2rem,460px)] md:max-w-[460px] md:rounded-[22px]',
)

const INFO_SECTION_HEADING_CLASS =
  'font-[family-name:var(--nora-font)] text-[13px] font-medium leading-5 text-[var(--nora-text)]'
const INFO_BODY_CLASS =
  'font-[family-name:var(--nora-font)] text-[13px] font-normal leading-5 text-[var(--nora-text-secondary)]'
const INFO_VALUE_CLASS =
  'font-[family-name:var(--nora-font)] text-[13px] font-normal leading-5 text-[var(--nora-text)]'
const FACT_ROW_CLASS = cn(
  'flex min-h-12 items-center justify-between gap-3 rounded-[14px] px-2.5 py-2',
  'bg-[var(--nora-input-bg)]/72',
)
const FACT_ICON_WRAP_CLASS = cn(
  'inline-flex size-7 shrink-0 items-center justify-center rounded-full',
  'bg-[color-mix(in_srgb,var(--nora-text)_9%,var(--nora-panel))] text-[var(--nora-text-secondary)]',
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

export function PlanPageShell({
  badge,
  children,
  coverImage,
  description,
  facts = [],
  onEdit,
  showHeaderOnMobile = false,
  title,
}: {
  badge: string
  children: React.ReactNode
  coverImage?: string
  description: string
  facts?: ReadonlyArray<{ label: string; value: string }>
  onEdit?: () => void
  showHeaderOnMobile?: boolean
  title: string
}) {
  const [infoOpen, setInfoOpen] = React.useState(false)
  const visibleFacts = facts.filter((fact) => fact.label !== 'Тип' && fact.label !== 'Цель')

  function handleEdit() {
    setInfoOpen(false)
    onEdit?.()
  }

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
          <div className="mb-1.5 flex items-center gap-2">
            <h1
              className={cn(
                noraPageTitleClass,
                showHeaderOnMobile && 'min-w-0 max-md:max-w-[50%] max-md:truncate',
              )}
            >
              {title}
            </h1>
            <NoraBadge className={showHeaderOnMobile ? 'max-md:hidden' : undefined} variant="blue">
              {badge}
            </NoraBadge>
            {showHeaderOnMobile ? (
              <button
                aria-label="О рационе"
                className={cn(
                  'ios-glass-glare inline-flex size-8 shrink-0 items-center justify-center rounded-full border-0',
                  'bg-[var(--nora-tint-dimmed)] text-[var(--nora-tint)] md:hidden',
                )}
                data-plan-info-open=""
                onClick={() => setInfoOpen(true)}
                type="button"
              >
                <InfoIcon aria-hidden className="size-4" strokeWidth={2} />
              </button>
            ) : null}
          </div>
          <p
            className={cn(
              'mt-1.5 whitespace-pre-line',
              noraPageDescriptionClass,
              showHeaderOnMobile && 'max-md:hidden',
            )}
          >
            {description}
          </p>
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
              <DialogHeader className="min-w-0 gap-0 rounded-[16px] bg-[var(--nora-inset)] p-2.5 text-left">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex min-w-0 flex-1 items-center gap-2.5">
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[var(--nora-text)] text-[var(--nora-modal)]">
                      <InfoIcon aria-hidden className="size-4" strokeWidth={1.7} />
                    </span>
                    <DialogTitle className={cn(noraProductTitleClass, 'min-w-0 flex-1')}>
                      {title}
                    </DialogTitle>
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5">
                    {onEdit ? (
                      <button
                        aria-label="Изменить"
                        className={HEADER_CHIP_CLASS}
                        data-plan-info-edit=""
                        onClick={handleEdit}
                        type="button"
                      >
                        <PencilIcon aria-hidden className="size-3.5" strokeWidth={1.75} />
                      </button>
                    ) : null}
                    <DialogClose aria-label="Закрыть" className={HEADER_CHIP_CLASS}>
                      <XIcon aria-hidden className="size-3.5" strokeWidth={1.75} />
                    </DialogClose>
                  </div>
                </div>
              </DialogHeader>
            </div>
            <div className="flex min-h-0 flex-col gap-3 overflow-y-auto px-3 pt-3 pb-[max(0.875rem,env(safe-area-inset-bottom))] sm:px-4 sm:pb-3.5">
              {coverImage ? (
                <div className="relative aspect-[16/9] min-h-[7.5rem] w-full overflow-hidden rounded-[16px] bg-[var(--nora-inset)]">
                  <MealFeedPhoto sizes="md" src={coverImage} />
                </div>
              ) : null}
              <section className="flex flex-col gap-1.5">
                <p className={INFO_SECTION_HEADING_CLASS}>Описание</p>
                <DialogDescription
                  className={cn(
                    INFO_BODY_CLASS,
                    'whitespace-pre-line rounded-[14px] bg-[var(--nora-input-bg)]/72 px-2.5 py-2.5',
                  )}
                >
                  {description}
                </DialogDescription>
              </section>
              {visibleFacts.length > 0 ? (
                <section className="flex flex-col gap-1.5" data-plan-info-summary="">
                  <p className={INFO_SECTION_HEADING_CLASS}>Показатели</p>
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
                        <span className={cn(INFO_VALUE_CLASS, 'text-right')}>{fact.value}</span>
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
