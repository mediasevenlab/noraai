import type { ComponentType, ReactNode } from 'react'
import { GraduationCapIcon, ImagesIcon, NewspaperIcon, UtensilsCrossedIcon } from 'lucide-react'

import {
  noraPlaqueIconClass,
  noraProductMetaClass,
  noraProductTitleClass,
} from '@/components/nora/primitives'
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
  'nora-press-grow ios-glass-glare-soft h-8 min-h-8 max-h-8 flex-none gap-1.5 rounded-full border-0 py-0 pr-3 pl-2.5 text-[13px] font-normal leading-none text-[var(--nora-text-secondary)]',
  '!bg-[var(--nora-inset)] hover:!bg-[color-mix(in_srgb,var(--nora-inset)_88%,var(--nora-text)_6%)]',
  'data-active:!bg-[var(--nora-input-bg)] data-active:font-normal data-active:text-[var(--nora-text)]',
  'data-active:hover:!bg-[var(--nora-input-bg)]',
)

/** Selected section tab — dark pill when active, solid inset well when idle. */
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

/** Calorie pill on a feed list cover — same frost as ration cover badges. */
export const productCardCoverKcalBadgeClass = cn(
  'ios-glass-glare-soft inline-flex h-[22px] min-h-[22px] max-h-[22px] min-w-[22px] items-center justify-center rounded-full border-0 px-[9px]',
  'font-[family-name:var(--nora-font)] text-[11.5px] font-medium leading-none tabular-nums backdrop-blur-[10px]',
  'bg-[color-mix(in_srgb,var(--nora-panel)_88%,transparent)] text-[var(--nora-text)]',
)

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

/** Horizontal scroller. `py-8 -my-8` unclips the mobile 8/20 pill shadow without changing layout. */
export const productFeedToolbarRowClass =
  'pointer-events-none flex w-full min-w-0 items-center gap-2 overflow-x-auto overscroll-x-contain py-8 -my-8 no-scrollbar max-md:-mx-3 max-md:w-[calc(100%+1.5rem)] max-md:px-3 md:overflow-visible [&>*]:pointer-events-auto'

/** Mobile: remove trailing capsules so search grows up to the first remaining chip. */
export const productToolbarSearchCollapseClass = 'max-md:hidden'

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

/** Phone one-row cards in the diary, rations, and the feed share this height. */
export const productListCardHeightClass =
  'max-md:h-[155px] max-md:min-h-[155px] max-md:max-h-[155px] max-md:overflow-hidden'

/** Inverted black/white CTA in ration and plan card footers. */
export const productCardFooterCtaClass =
  'bg-[var(--nora-text)] text-[var(--nora-panel)] hover:bg-[color-mix(in_srgb,var(--nora-text)_88%,var(--nora-panel))] hover:text-[var(--nora-panel)]'

export const PRODUCT_FEED_SKELETON_COUNT = 10

/** True-empty and pending feeds — shimmering card grid, not an empty plaque. */
export function ProductFeedSkeletonSlots({
  Card,
  className,
}: {
  Card: ComponentType
  className?: string
}) {
  return (
    <section className={cn(productFeedGridClass, className)} data-slot="feed-skeleton">
      {Array.from({ length: PRODUCT_FEED_SKELETON_COUNT }, (_, index) => (
        <Card key={index} />
      ))}
    </section>
  )
}

/** Filtered-empty / error — placeholder card in the feed grid. */
export function ProductFeedEmpty({
  action,
  className,
  description,
  icon,
  origin,
  title,
}: {
  action?: ReactNode
  className?: string
  description?: ReactNode
  icon?: ReactNode
  origin?: ProductCardOrigin
  title: ReactNode
}) {
  const OriginIcon = origin ? PRODUCT_CARD_ORIGIN[origin].Icon : undefined
  const resolvedIcon =
    icon ?? (OriginIcon ? <OriginIcon aria-hidden strokeWidth={1.75} /> : undefined)
  return (
    <section className={productFeedGridClass} data-slot="feed-empty">
      <article
        aria-label={typeof title === 'string' ? title : undefined}
        className={cn('flex h-full min-w-0 flex-col', className)}
        data-empty-card=""
        data-slot="meal-card"
        role="status"
      >
        <div className="relative shrink-0 px-2 pt-2">
          <div
            className="relative flex aspect-[4/3] w-full max-h-[132px] items-center justify-center bg-[var(--nora-inset)] sm:max-h-[148px] md:aspect-auto md:h-[168px] md:max-h-none"
            data-slot="meal-card-preview"
          >
            {resolvedIcon ? (
              <span className={cn(noraPlaqueIconClass, 'size-10 [&_svg]:size-4')}>
                {resolvedIcon}
              </span>
            ) : null}
          </div>
        </div>
        <div
          className={cn(
            'flex flex-1 flex-col px-3 pt-3 sm:px-4 sm:pt-3.5',
            action ? undefined : 'pb-3 sm:pb-3.5',
          )}
        >
          <h3 className={cn(noraProductTitleClass, 'text-pretty')}>{title}</h3>
          {description ? (
            <p
              className={cn(noraProductMetaClass, 'mt-2 text-pretty')}
              data-slot="empty-description"
            >
              {description}
            </p>
          ) : null}
          {action ? (
            <div className="mt-auto pt-3">
              <div
                aria-hidden
                className="border-t border-[color-mix(in_srgb,var(--nora-divider)_70%,transparent)]"
              />
              <div
                className="flex w-full items-center py-3 [&_button]:w-full [&_button]:justify-center [&_button]:rounded-[12px]"
                data-slot="empty-card-footer"
              >
                {action}
              </div>
            </div>
          ) : null}
        </div>
      </article>
    </section>
  )
}
