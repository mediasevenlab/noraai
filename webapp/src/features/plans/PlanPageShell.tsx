import * as React from 'react'
import { InfoIcon, XIcon } from 'lucide-react'

import { noraPageDescriptionClass, noraPageTitleClass } from '@/components/PageLayout'
import { NoraBadge } from '@/components/nora/primitives'
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
  'flex flex-col gap-0 overflow-hidden bg-[var(--nora-modal)] p-0',
  'inset-x-0 top-[var(--modal-sheet-inset)] bottom-0 h-[calc(100dvh-var(--modal-sheet-inset))] max-h-[calc(100dvh-var(--modal-sheet-inset))] w-full max-w-none translate-x-0 translate-y-0 rounded-t-[var(--modal-sheet-radius)] rounded-b-none',
  'md:inset-auto md:top-1/2 md:left-1/2 md:h-auto md:max-h-[min(720px,calc(100vh-2rem))] md:w-[min(100%-2rem,460px)] md:max-w-[460px] md:rounded-[22px]',
)

const FACT_ROW_CLASS = cn(
  'flex min-h-12 items-center justify-between gap-3 rounded-[14px] px-2.5 py-2',
  'bg-[var(--nora-input-bg)]/72 text-[var(--nora-text-secondary)]',
)

export function PlanPageShell({
  badge,
  children,
  coverImage,
  description,
  facts = [],
  showHeaderOnMobile = false,
  title,
}: {
  badge: string
  children: React.ReactNode
  coverImage?: string
  description: string
  facts?: ReadonlyArray<{ label: string; value: string }>
  showHeaderOnMobile?: boolean
  title: string
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
                  'ios-glass-glare inline-flex size-5 shrink-0 items-center justify-center rounded-full border-0',
                  'bg-[var(--nora-tint-dimmed)] text-[var(--nora-tint)] md:hidden',
                )}
                onClick={() => setInfoOpen(true)}
                type="button"
              >
                <InfoIcon aria-hidden className="size-3" strokeWidth={2.25} />
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
            data-modal-frame="meal"
            data-plan-info=""
            showCloseButton={false}
          >
            <div className="shrink-0 px-2 pt-2">
              <DialogHeader className="min-w-0 gap-1 rounded-[16px] bg-[var(--nora-inset)] p-2.5 text-left">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 flex-1 items-start gap-2.5">
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[var(--nora-text)] text-[var(--nora-modal)]">
                      <InfoIcon aria-hidden className="size-4" strokeWidth={1.7} />
                    </span>
                    <DialogTitle className="min-w-0 flex-1 font-[family-name:var(--nora-font)] !text-[15px] !font-medium !leading-6 tracking-normal text-[var(--nora-text)]">
                      {title}
                    </DialogTitle>
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
            <div className="flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto px-3 pt-3 pb-[max(0.875rem,env(safe-area-inset-bottom))] sm:px-4 sm:pb-3.5">
              <div className={cn(FACT_ROW_CLASS, 'h-auto min-h-12 flex-col items-start gap-1 py-2.5')}>
                <span className="font-[family-name:var(--nora-font)] text-[13px] font-normal text-[var(--nora-text-secondary)]">
                  Описание
                </span>
                <DialogDescription className="whitespace-pre-line font-[family-name:var(--nora-font)] text-[13px] font-medium leading-5 text-[var(--nora-text)]">
                  {description}
                </DialogDescription>
              </div>
              {coverImage ? (
                <div className="relative aspect-[16/9] min-h-[7.5rem] w-full overflow-hidden rounded-[16px] bg-[var(--nora-inset)]">
                  <MealFeedPhoto sizes="md" src={coverImage} />
                </div>
              ) : null}
              {visibleFacts.length > 0 ? (
                <div className="flex flex-col gap-1.5">
                  {visibleFacts.map((fact) => (
                    <div className={FACT_ROW_CLASS} key={fact.label}>
                      <span className="font-[family-name:var(--nora-font)] text-[13px] font-normal text-[var(--nora-text-secondary)]">
                        {fact.label}
                      </span>
                      <span className="text-right font-[family-name:var(--nora-font)] text-[13px] font-medium text-[var(--nora-text)]">
                        {fact.value}
                      </span>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          </DialogContent>
        </Dialog>
      ) : null}
    </div>
  )
}
