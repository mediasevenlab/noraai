import * as React from 'react'
import { BookmarkIcon, CircleCheckIcon, EllipsisIcon, ListIcon, Share2Icon, ShoppingBagIcon, Trash2Icon } from 'lucide-react'

import { NoraButton, NoraIconButton } from '@/components/nora/primitives'
import {
  ProductCardOriginBadge,
  productCardFooterCtaClass,
  productCardGoalAnchorClass,
  productSheetOverlayChipClass,
} from '@/components/nora/product-sheet'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { daysCountLabel, MealFeedPhoto } from '@/features/diary'
import { cn } from '@/lib/utils'
import { usePressWithoutScroll } from '@/platform/press-without-scroll'
import type { SavedAccountScope } from '@/platform/saved-ids'

import { PlanShoppingDialog } from './PlanShoppingDialog'
import { WEEK_PLAN_CARD_SLOTS, averageMealsPerDayLabel, type WeekPlan } from './week-plan'

const PLAN_CARD_PREVIEW_SIZE_CLASS =
  'h-[204px] w-full overflow-hidden bg-[var(--nora-inset)] sm:h-[216px] md:h-[224px]'

const PLAN_COVER_BADGE_CLASS = cn(
  'ios-glass-glare-soft inline-flex h-[22px] min-h-[22px] max-h-[22px] min-w-[22px] items-center justify-center rounded-full border-0 px-[9px]',
  'font-[family-name:var(--nora-font)] text-[11.5px] font-medium leading-none backdrop-blur-[10px]',
  'bg-[color-mix(in_srgb,var(--nora-panel)_88%,transparent)] text-[var(--nora-text)]',
)

const PLAN_CARD_FOOTER_ICON_CLASS =
  'nora-press-grow size-6! shrink-0 !bg-transparent shadow-none hover:!bg-transparent hover:text-[var(--nora-text)] active:!bg-transparent [&_svg]:size-4'

function mealsCountAria(count: number) {
  const mod10 = count % 10
  const mod100 = count % 100
  if (mod10 === 1 && mod100 !== 11) return `${count} приём`
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return `${count} приёма`
  return `${count} приёмов`
}

function PlanSummaryPlaque({
  fromMentor = false,
  plan,
}: {
  fromMentor?: boolean
  plan: WeekPlan
}) {
  const filled = plan.days.length > 0
  return (
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
            ? fromMentor
              ? 'bg-[var(--nora-badge-green-bg)] text-[var(--nora-badge-green-text)]'
              : 'bg-[var(--nora-tint-dimmed)] text-[var(--nora-tint)]'
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
        {daysCountLabel(plan.days.length)}
      </span>
      <span
        className={cn(
          'inline-flex h-7 w-[4.25rem] shrink-0 items-center justify-center rounded-full max-md:hidden',
          'bg-[color-mix(in_srgb,var(--nora-panel)_80%,transparent)]',
          'font-[family-name:var(--nora-font)] text-[11px] font-medium leading-none tabular-nums',
          filled ? 'text-[var(--nora-text)]' : 'text-[var(--nora-text-tertiary)]',
        )}
      >
        {plan.kcal} ккал
      </span>
      <span
        aria-label={mealsCountAria(plan.mealsCount)}
        className={cn(
          'inline-flex size-7 shrink-0 items-center justify-center rounded-full',
          'bg-[color-mix(in_srgb,var(--nora-panel)_80%,transparent)]',
          'font-[family-name:var(--nora-font)] text-[11px] font-medium leading-none tabular-nums',
          filled ? 'text-[var(--nora-text)]' : 'text-[var(--nora-text-tertiary)]',
        )}
      >
        {plan.mealsCount}
      </span>
    </div>
  )
}

export function WeekPlanCard({
  actionLabel,
  activeRange,
  fromMentor = false,
  plan,
  saved = false,
  selected = false,
  shared = false,
  savedScope,
  onOpen,
  onSelect,
  onShare,
  onToggleSave,
  onDelete,
  canShare = true,
}: {
  actionLabel?: string
  /** Cover badge for the live selected plan, e.g. `07.09 - 15.09`. */
  activeRange?: string
  fromMentor?: boolean
  plan: WeekPlan
  saved?: boolean
  selected?: boolean
  shared?: boolean
  savedScope: SavedAccountScope
  onOpen: () => void
  onSelect?: () => void
  onShare?: () => void
  onToggleSave?: () => void
  onDelete?: () => void
  canShare?: boolean
}) {
  const [shoppingOpen, setShoppingOpen] = React.useState(false)
  const shoppingMeals = plan.days.flatMap((day) => day.meals)
  const press = usePressWithoutScroll(onOpen)
  const shareDisabled = !onShare || (!canShare && !shared)
  const shareLabel = shared
    ? 'Скрыть из ленты'
    : canShare && onShare
      ? 'Поделиться'
      : 'Этот рацион нельзя отправить в ленту'
  const saveLabel = saved ? 'Убрать из избранного' : 'В избранное'

  return (
    <>
      <article
        className="group flex h-full min-w-0 cursor-pointer flex-col"
        data-slot="meal-card"
        onClick={press.onClick}
        onPointerCancel={press.onPointerCancel}
        onPointerDown={press.onPointerDown}
        onPointerMove={press.onPointerMove}
        onPointerUp={press.onPointerUp}
      >
        <div className="relative shrink-0 px-2 pt-2">
          <div
            className={cn('relative', PLAN_CARD_PREVIEW_SIZE_CLASS)}
            data-haptic="card"
            data-slot="meal-card-preview"
          >
            <MealFeedPhoto priority sizes="md" src={plan.coverImage} />
            <div className={cn(productCardGoalAnchorClass, 'gap-1.5')}>
              {fromMentor ? (
                <ProductCardOriginBadge
                  className="bg-[var(--nora-success)] text-white"
                  origin="mentor-rations"
                />
              ) : null}
              {activeRange ? (
                <span
                  className={cn(
                    PLAN_COVER_BADGE_CLASS,
                    'tabular-nums !bg-[var(--nora-tint)] !text-white',
                  )}
                >
                  {activeRange}
                </span>
              ) : (
                <span
                  aria-label={`${plan.kcal} килокалорий`}
                  className={cn(PLAN_COVER_BADGE_CLASS, 'tabular-nums', 'md:hidden')}
                >
                  {plan.kcal} ккал
                </span>
              )}
            </div>
            <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[2] bg-gradient-to-t from-black/62 to-transparent px-3 pt-7 pb-2 text-left">
              <h3 className="truncate font-[family-name:var(--nora-font)] text-[15px] font-medium leading-5 text-white">
                {plan.title}
              </h3>
              <p className="mt-1 truncate font-[family-name:var(--nora-font)] text-[12px] font-light leading-4 text-white/80 tabular-nums">
                {averageMealsPerDayLabel(plan.mealsCount, plan.days.length)}
              </p>
            </div>
          </div>
          {onDelete ? (
            <button
              type="button"
              aria-label="Удалить"
              onClick={(event) => {
                event.stopPropagation()
                onDelete()
              }}
              className={cn(
                productSheetOverlayChipClass,
                'nora-press-grow absolute top-4 right-4 z-[2] hidden size-7 sm:inline-flex',
                'sm:opacity-0 sm:pointer-events-none',
                'sm:group-hover:opacity-100 sm:group-hover:pointer-events-auto',
                'hover:bg-[var(--nora-error)] hover:text-white',
                'focus-visible:opacity-100 focus-visible:pointer-events-auto focus-visible:shadow-[var(--nora-shadow-focus)]',
              )}
            >
              <Trash2Icon className="size-4" />
            </button>
          ) : null}
        </div>
        <div className="flex flex-col gap-2 px-3 pt-2.5">
          <PlanSummaryPlaque fromMentor={fromMentor} plan={plan} />
        </div>
        <div className="mt-auto flex flex-col px-4 pt-2">
          <div
            aria-hidden
            className="border-t border-[color-mix(in_srgb,var(--nora-divider)_70%,transparent)]"
          />
          <div
            className="flex items-center gap-2 py-3"
            data-slot="meal-card-footer"
            onClick={(event) => event.stopPropagation()}
          >
            {onSelect ? (
              <NoraButton
                aria-pressed={selected}
                className={cn(
                  'nora-press-grow min-w-0 flex-1 [&_svg]:size-[11px]',
                  !selected && productCardFooterCtaClass,
                )}
                onClick={onSelect}
                variant={selected ? 'primary' : 'default'}
              >
                {selected ? <CircleCheckIcon aria-hidden strokeWidth={2.25} /> : null}
                {actionLabel ?? (selected ? 'Выбран' : 'Выбрать')}
              </NoraButton>
            ) : null}
            <div className="flex items-center gap-1">
              <div className="hidden items-center gap-1 md:flex">
                <NoraIconButton
                  aria-label={shareLabel}
                  active={shared}
                  className={PLAN_CARD_FOOTER_ICON_CLASS}
                  disabled={shareDisabled}
                  onClick={onShare}
                >
                  <Share2Icon className="size-4" />
                </NoraIconButton>
                {onToggleSave ? (
                  <NoraIconButton
                    aria-label={saveLabel}
                    active={saved}
                    className={cn(
                      PLAN_CARD_FOOTER_ICON_CLASS,
                      saved
                        ? 'text-[var(--nora-tint)] hover:!text-[var(--nora-tint)]'
                        : undefined,
                    )}
                    onClick={onToggleSave}
                  >
                    <BookmarkIcon className={cn('size-4', saved && 'fill-current')} />
                  </NoraIconButton>
                ) : null}
              </div>
              <NoraIconButton
                aria-label="Корзина"
                className={PLAN_CARD_FOOTER_ICON_CLASS}
                disabled={shoppingMeals.length === 0}
                onClick={() => setShoppingOpen(true)}
              >
                <ShoppingBagIcon className="size-4" />
              </NoraIconButton>
              <DropdownMenu>
                <DropdownMenuTrigger
                  aria-label="Ещё"
                  className={cn(
                    'inline-flex cursor-pointer items-center justify-center border-0 text-[var(--nora-text-secondary)] md:hidden',
                    PLAN_CARD_FOOTER_ICON_CLASS,
                    'rounded-[var(--nora-radius-md)]',
                  )}
                  data-plan-card-more=""
                  nativeButton
                >
                  <EllipsisIcon aria-hidden className="size-4" />
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  className="account-workspace-menu w-max min-w-0 rounded-[16px]!"
                  side="bottom"
                  sideOffset={6}
                >
                  {onToggleSave ? (
                    <DropdownMenuItem
                      className="whitespace-nowrap"
                      onClick={() => {
                        onToggleSave()
                      }}
                    >
                      <BookmarkIcon className={cn('size-4', saved && 'fill-current')} />
                      В избранное
                    </DropdownMenuItem>
                  ) : null}
                  <DropdownMenuItem
                    className="whitespace-nowrap"
                    disabled={shareDisabled}
                    onClick={() => {
                      onShare?.()
                    }}
                  >
                    <Share2Icon className="size-4" />
                    Поделиться
                  </DropdownMenuItem>
                  {onDelete ? (
                    <DropdownMenuItem
                      className="whitespace-nowrap"
                      onClick={() => {
                        onDelete()
                      }}
                      variant="destructive"
                    >
                      <Trash2Icon className="size-4" />
                      Удалить
                    </DropdownMenuItem>
                  ) : null}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </article>
      <PlanShoppingDialog
        days={plan.days}
        onOpenChange={setShoppingOpen}
        open={shoppingOpen}
        planId={plan.id}
        savedScope={savedScope}
        title={plan.title}
      />
    </>
  )
}

export function WeekPlanCardSkeleton() {
  return (
    <article
      aria-label="Черновик плана"
      className="flex h-full flex-col"
      data-slot="meal-card-skeleton"
    >
      <div className="relative shrink-0 px-2 pt-2">
        <div
          className={cn(PLAN_CARD_PREVIEW_SIZE_CLASS, 'animate-pulse')}
          data-slot="meal-card-preview"
        />
      </div>
      <div className="flex flex-col gap-1.5 px-3 pt-2.5">
          {Array.from({ length: WEEK_PLAN_CARD_SLOTS }, (_, index) => (
            <div
              className="h-10 animate-pulse rounded-[12px] bg-[var(--nora-inset)]"
              key={index}
            />
          ))}
      </div>
      <div className="mt-auto flex flex-col px-4 pt-2">
        <div
          aria-hidden
          className="border-t border-[color-mix(in_srgb,var(--nora-divider)_70%,transparent)]"
        />
        <div className="flex items-center gap-2 py-3" data-slot="meal-card-footer">
          <div className="h-[30px] min-w-0 flex-1 animate-pulse rounded-[8px] bg-[var(--nora-inset)]" />
          <div className="flex gap-1">
            <div className="size-4 animate-pulse rounded bg-[var(--nora-inset)]" />
            <div className="size-4 animate-pulse rounded bg-[var(--nora-inset)]" />
          </div>
        </div>
      </div>
    </article>
  )
}
