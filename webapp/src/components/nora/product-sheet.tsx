import type { ComponentProps, ComponentType } from 'react'
import { GraduationCapIcon, ImagesIcon, NewspaperIcon, UtensilsCrossedIcon } from 'lucide-react'

import { NoraEmpty } from '@/components/nora/primitives'
import { cn } from '@/lib/utils'

export type ProductCardOrigin = 'diary' | 'feed' | 'rations' | 'mentor-rations'

const PRODUCT_CARD_ORIGIN = {
  diary: { label: 'Приём пищи', Icon: NewspaperIcon },
  feed: { label: 'Лента', Icon: ImagesIcon },
  rations: { label: 'Рационы', Icon: UtensilsCrossedIcon },
  'mentor-rations': { label: 'От наставника', Icon: GraduationCapIcon },
} as const satisfies Record<
  ProductCardOrigin,
  { label: string; Icon: typeof NewspaperIcon }
>

const SHEET_MOBILE_CLASS =
  'inset-x-0 top-[var(--modal-sheet-inset)] bottom-0 h-[calc(100dvh-var(--modal-sheet-inset))] max-h-[calc(100dvh-var(--modal-sheet-inset))] w-full max-w-none translate-x-0 translate-y-0 rounded-t-[var(--modal-sheet-radius)] rounded-b-none'

/** Meal card and ration view — compact sheet. */
export const productSheetCardFrameClass = cn(
  'flex flex-col gap-0 overflow-hidden p-0',
  SHEET_MOBILE_CLASS,
  'md:inset-auto md:top-1/2 md:left-1/2 md:h-[min(860px,calc(100vh-2rem))] md:max-h-[min(860px,calc(100vh-2rem))] md:w-[min(100%-2rem,460px)] md:max-w-[460px] md:rounded-[22px]',
)

/** Ration editor — same width as meal/ration cards, taller. */
export const productSheetEditorFrameClass = cn(
  '!flex flex-col gap-0 overflow-hidden p-0',
  SHEET_MOBILE_CLASS,
  'md:inset-auto md:top-1/2 md:left-1/2 md:h-[min(920px,calc(100vh-2rem))] md:max-h-[min(920px,calc(100vh-2rem))] md:w-[min(100%-2rem,460px)] md:max-w-[460px] md:rounded-[22px]',
)

export const productSheetTabTriggerClass = cn(
  'nora-press-grow ios-glass-glare-soft h-8 min-h-8 max-h-8 flex-none gap-1.5 rounded-full border-0 py-0 pr-3 pl-2.5 text-[13px] font-normal leading-none text-[var(--nora-text-secondary)] backdrop-blur-[16px]',
  '!bg-[var(--nora-input-bg)]/72 hover:!bg-[var(--nora-input-bg)]',
  'data-active:!bg-[var(--nora-input-bg)] data-active:font-normal data-active:text-[var(--nora-text)]',
  'data-active:hover:!bg-[var(--nora-input-bg)]',
)

/** Selected section tab — dark pill when active, frost when idle. */
export const productSheetTabTriggerDarkClass = cn(
  productSheetTabTriggerClass,
  '[&_svg]:text-current',
  'data-active:!bg-[var(--nora-text)] data-active:!text-[var(--nora-panel)] data-active:font-normal',
  'data-active:hover:!bg-[var(--nora-text)] data-active:hover:!text-[var(--nora-panel)]',
)

export const productSheetOverlayChipClass =
  'ios-glass-glare inline-flex cursor-pointer items-center justify-center rounded-full border-0 bg-[var(--nora-panel)]/72 text-[var(--nora-text-tertiary)] backdrop-blur-[16px] outline-none'

/** Same frost as the modal KBJU capsules. */
export const productSheetFrostFillClass =
  'bg-[var(--nora-panel)]/72 backdrop-blur-[16px]'

/** Inset into the card preview corner, aligned with the trash chip. */
export const productCardOriginAnchorClass =
  'pointer-events-none absolute top-2 left-2 z-[2] flex items-center gap-1.5'

/** Goal chip on ration covers — top-left, opposite the meal thumb capsule. */
export const productCardGoalAnchorClass =
  'pointer-events-none absolute top-2 left-2 z-[2] flex items-center'

/** Author chip on feed covers — bottom-left of the preview. */
export const productCardAuthorAnchorClass =
  'pointer-events-none absolute bottom-2 left-2 z-[2] flex max-w-[calc(100%-1rem)] items-center'

/** Inset into the modal hero, aligned with the close chip. */
export const productCardOriginModalAnchorClass =
  'pointer-events-none absolute top-3.5 left-3.5 z-[2] flex items-center gap-1.5'

export const productCardOriginBadgeClass = cn(
  'ios-glass-glare pointer-events-none inline-flex size-7 shrink-0 cursor-default items-center justify-center rounded-full border-0',
  productSheetFrostFillClass,
  'text-[var(--nora-text-secondary)]',
)

export function ProductCardOriginBadge({
  origin,
  className,
}: {
  origin: ProductCardOrigin
  className?: string
}) {
  const { label, Icon } = PRODUCT_CARD_ORIGIN[origin]
  return (
    <span
      aria-label={label}
      className={cn(productCardOriginBadgeClass, className)}
      data-origin={origin}
      data-slot="product-card-origin"
      title={label}
    >
      <Icon aria-hidden className="size-4" strokeWidth={1.75} />
    </span>
  )
}

export const productSheetTabDockClass =
  'relative z-10 -mt-3.5 shrink-0 px-3 pt-3.5 pb-[max(0.875rem,env(safe-area-inset-bottom))] sm:px-4 sm:pb-3.5'

/** Opaque strip so scrolling content tucks behind the tab dock. */
export function ProductSheetTabFade() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-x-0 top-0 h-3.5 overflow-hidden bg-[var(--nora-modal)]"
    />
  )
}

export const productFeedPageClass =
  'flex w-full min-w-0 contain-inline-size flex-col gap-3 px-3 py-3 sm:gap-4 sm:px-6 sm:py-4 md:gap-5 md:px-10 md:py-5 lg:px-12 lg:py-6'

export const productFeedToolbarRowClass =
  'flex w-full min-w-0 items-center gap-2 overflow-x-auto overscroll-x-contain py-4 -my-4 no-scrollbar'

/** Diary calorie menu is the reference for toolbar selects. */
export const productToolbarSelectContentClass =
  'w-max min-w-[var(--anchor-width)] overflow-hidden rounded-[16px]! border-[color-mix(in_srgb,var(--nora-menu-border)_45%,var(--nora-panel))] p-1! !text-[13px] !font-normal'

export const productToolbarSelectItemClass =
  'h-8 rounded-[12px]! !text-[13px] !font-normal text-[var(--nora-text-secondary)] hover:text-[var(--nora-text)] hover:[&_span]:text-[var(--nora-text)] data-highlighted:text-[var(--nora-text)] data-highlighted:[&_span]:text-[var(--nora-text)] data-selected:bg-[var(--nora-tint)] data-selected:!font-medium data-selected:text-[var(--nora-on-accent)] data-selected:[&_span]:text-[var(--nora-on-accent)] hover:data-selected:bg-[var(--nora-tint)] hover:data-selected:text-[var(--nora-on-accent)] hover:data-selected:[&_span]:text-[var(--nora-on-accent)] data-highlighted:data-selected:bg-[var(--nora-tint)] data-highlighted:data-selected:!font-medium data-highlighted:data-selected:text-[var(--nora-on-accent)] data-highlighted:data-selected:[&_span]:text-[var(--nora-on-accent)]'

/** Calorie chip and other toolbar dropdowns with a circled chevron. */
export const productToolbarCapsuleSelectClass =
  'box-border h-9 max-h-9 min-h-9 w-full min-w-0 shrink-0 !gap-2 !overflow-visible !py-0 !pr-2 !pl-3.5'

export const productFeedGridClass =
  'grid min-w-0 w-full grid-cols-2 items-stretch gap-2 sm:gap-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5'

/** Inverted black/white CTA in ration and plan card footers. */
export const productCardFooterCtaClass =
  'bg-[var(--nora-text)] text-[var(--nora-panel)] hover:bg-[color-mix(in_srgb,var(--nora-text)_88%,var(--nora-panel))] hover:text-[var(--nora-panel)]'

export const PRODUCT_FEED_SKELETON_COUNT = 10

/** True-empty and pending feeds — shimmering card grid, not an empty plaque. */
export function ProductFeedSkeletonSlots({
  Card,
}: {
  Card: ComponentType
}) {
  return (
    <section className={productFeedGridClass} data-slot="feed-skeleton">
      {Array.from({ length: PRODUCT_FEED_SKELETON_COUNT }, (_, index) => (
        <Card key={index} />
      ))}
    </section>
  )
}

/** Filtered-empty / error — shopping-style plaque, not a blank meal card. */
export function ProductFeedEmpty({
  className,
  icon,
  origin,
  ...props
}: ComponentProps<typeof NoraEmpty> & {
  origin?: ProductCardOrigin
}) {
  const OriginIcon = origin ? PRODUCT_CARD_ORIGIN[origin].Icon : undefined
  return (
    <section data-slot="feed-empty">
      <NoraEmpty
        icon={
          icon ??
          (OriginIcon ? <OriginIcon aria-hidden strokeWidth={1.75} /> : undefined)
        }
        {...props}
        className={className}
      />
    </section>
  )
}
