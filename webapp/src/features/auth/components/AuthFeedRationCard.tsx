import { BookmarkIcon, CircleCheckIcon, ListIcon, Share2Icon, ShoppingBagIcon } from '@/components/icons'

import { NoraButton, NoraIconButton } from '@/components/nora/primitives'
import {
  productCardCoverKcalBadgeClass,
  productCardFooterCtaClass,
  productCardOriginAnchorClass,
} from '@/components/nora/product-sheet'
import {
  MealFeedPhoto,
  daysCountLabel,
  displayPlanCover,
  mealsCountLabel,
  mealsPerDayLabel,
} from '@/features/diary'
import type { RationEntry } from '@/features/mentor'
import { cn } from '@/lib/utils'

const FOOTER_ICON_CLASS =
  'nora-press-grow size-6! shrink-0 !bg-transparent shadow-none hover:!bg-transparent hover:text-[var(--nora-text)] active:!bg-transparent [&_svg]:size-4'

/** Signup demo stand-in for the feed ration card, with the plan-card footer. */
export function AuthFeedRationCard({
  ration,
  actionLabel = 'Выбрать',
  addedLabel = 'Выбран',
  activeRange = null,
  selectAdded = false,
  selectPressed = false,
}: {
  ration: RationEntry
  actionLabel?: string
  addedLabel?: string
  activeRange?: string | null
  selectAdded?: boolean
  selectPressed?: boolean
}) {
  const mealsCount = ration.meals.length
  const mealsPerDay = ration.mealsPerDay > 0 ? ration.mealsPerDay : mealsCount
  const filled = ration.days > 0 && mealsCount > 0

  return (
    <article className="flex h-full min-h-0 min-w-0 flex-col" data-slot="meal-card">
      <div className="relative flex min-h-0 flex-1 flex-col px-2 pt-2">
        <div
          className="relative min-h-0 w-full flex-1 overflow-hidden bg-[var(--nora-inset)]"
          data-slot="meal-card-preview"
        >
          <MealFeedPhoto priority sizes="md" src={displayPlanCover(ration.image)} />
          <div className={productCardOriginAnchorClass}>
            {selectAdded && activeRange ? (
              <span
                className={cn(
                  productCardCoverKcalBadgeClass,
                  'tabular-nums !bg-[var(--nora-tint)] !text-white',
                )}
              >
                {activeRange}
              </span>
            ) : (
              <span className={productCardCoverKcalBadgeClass}>{ration.kcal} ккал</span>
            )}
          </div>
          <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[2] bg-gradient-to-t from-black/62 to-transparent px-3 pt-7 pb-2 text-left">
            <h3 className="truncate font-[family-name:var(--nora-font)] text-[15px] font-medium leading-5 text-white">
              {ration.title}
            </h3>
            <p className="mt-1 truncate font-[family-name:var(--nora-font)] text-[12px] font-light leading-4 text-white/80">
              {mealsPerDayLabel(mealsPerDay, 1)}
            </p>
          </div>
        </div>
      </div>
      <div className="flex flex-col px-3 pt-2.5 sm:px-4">
        <div
          className={cn(
            'flex h-10 min-h-10 items-center gap-2 rounded-[12px] px-2',
            filled
              ? 'bg-[var(--nora-inset)] text-[var(--nora-text-secondary)]'
              : 'bg-[color-mix(in_srgb,var(--nora-inset)_78%,var(--nora-panel))] text-[var(--nora-text-tertiary)]',
          )}
          data-plan-summary=""
        >
          <span
            className={cn(
              'inline-flex size-7 shrink-0 items-center justify-center rounded-full',
              filled
                ? 'bg-[var(--nora-tint-dimmed)] text-[var(--nora-tint)]'
                : 'bg-transparent text-[var(--nora-text-tertiary)]',
            )}
          >
            <ListIcon aria-hidden className="size-3.5" strokeWidth={2} />
          </span>
          <span
            className={cn(
              'min-w-0 flex-1 truncate text-left font-[family-name:var(--nora-font)] text-[12px] font-normal leading-4',
              filled ? 'text-[var(--nora-text)]' : 'text-[var(--nora-text-tertiary)]',
            )}
          >
            {daysCountLabel(ration.days)}
          </span>
          <span
            className={cn(
              'inline-flex h-7 shrink-0 items-center justify-center rounded-full px-2.5 max-md:hidden',
              'bg-[color-mix(in_srgb,var(--nora-panel)_80%,transparent)]',
              'font-[family-name:var(--nora-font)] text-[11px] font-medium leading-none tabular-nums',
              filled ? 'text-[var(--nora-text)]' : 'text-[var(--nora-text-tertiary)]',
            )}
          >
            {ration.kcal} ккал
          </span>
          <span
            aria-label={mealsCountLabel(mealsCount)}
            className={cn(
              'inline-flex size-7 shrink-0 items-center justify-center rounded-full',
              'bg-[color-mix(in_srgb,var(--nora-panel)_80%,transparent)]',
              'font-[family-name:var(--nora-font)] text-[11px] font-medium leading-none tabular-nums',
              filled ? 'text-[var(--nora-text)]' : 'text-[var(--nora-text-tertiary)]',
            )}
          >
            {mealsCount}
          </span>
        </div>
      </div>
      <div className="mt-auto flex flex-col px-4 pt-2">
        <div
          aria-hidden
          className="border-t border-[color-mix(in_srgb,var(--nora-divider)_70%,transparent)] dark:border-[var(--nora-border-strong)]"
        />
        <div className="flex items-center gap-2 py-3" data-slot="meal-card-footer">
          <NoraButton
            className={cn(
              'nora-press-grow min-w-0 flex-1 [&_svg]:size-4',
              !selectAdded && productCardFooterCtaClass,
            )}
            data-demo-pressed={selectPressed ? '' : undefined}
            type="button"
            variant={selectAdded ? 'primary' : 'default'}
          >
            {selectAdded ? <CircleCheckIcon aria-hidden strokeWidth={2.25} /> : null}
            {selectAdded ? addedLabel : actionLabel}
          </NoraButton>
          <div className="flex items-center gap-1">
            <NoraIconButton aria-label="Поделиться" className={FOOTER_ICON_CLASS} type="button">
              <Share2Icon className="size-4" />
            </NoraIconButton>
            <NoraIconButton aria-label="Сохранить" className={FOOTER_ICON_CLASS} type="button">
              <BookmarkIcon className="size-4" />
            </NoraIconButton>
            <NoraIconButton aria-label="Корзина" className={FOOTER_ICON_CLASS} type="button">
              <ShoppingBagIcon className="size-4" />
            </NoraIconButton>
          </div>
        </div>
      </div>
    </article>
  )
}
