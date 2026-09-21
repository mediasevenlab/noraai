import * as React from 'react'
import { ShoppingBagIcon, XIcon } from 'lucide-react'

import { NoraSelect } from '@/components/nora/primitives'
import {
  productSheetOverlayChipClass,
  productToolbarSelectContentClass,
  productToolbarSelectItemClass,
} from '@/components/nora/product-sheet'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import type { SavedAccountScope } from '@/platform/saved-ids'

import {
  PLAN_SHOPPING_ALL_DAYS,
  planShoppingDayOptions,
  planShoppingItemsForDay,
  readBoughtPlanShoppingKeys,
  toggleBoughtPlanShoppingKey,
  writeBoughtPlanShoppingKeys,
  type PlanShoppingDay,
} from './plan-shopping'

const FRAME_CLASS = cn(
  'flex flex-col gap-0 overflow-hidden bg-[var(--nora-modal)] p-0',
  'inset-x-0 top-[var(--modal-sheet-inset)] bottom-0 h-[calc(100dvh-var(--modal-sheet-inset))] max-h-[calc(100dvh-var(--modal-sheet-inset))] w-full max-w-none translate-x-0 translate-y-0 rounded-t-[var(--modal-sheet-radius)] rounded-b-none',
  'md:inset-auto md:top-1/2 md:left-1/2 md:h-auto md:max-h-[min(720px,calc(100vh-2rem))] md:w-[min(100%-2rem,460px)] md:max-w-[460px] md:rounded-[22px]',
)

const ROW_CLASS = cn(
  'nora-press-grow ios-glass-glare-soft flex min-h-12 items-center gap-3 rounded-[14px] border-0 px-3.5 py-2.5 text-left',
  'bg-[var(--nora-inset)] text-[var(--nora-text-secondary)] outline-none',
  'hover:bg-[color-mix(in_srgb,var(--nora-inset)_88%,var(--nora-text)_6%)] hover:text-[var(--nora-text)]',
  'focus-visible:shadow-[var(--nora-shadow-focus)]',
)

const BADGE_CLASS = cn(
  'ios-glass-glare-soft inline-flex h-6 min-h-6 max-h-6 w-fit shrink-0 items-center rounded-full border-0 px-2.5',
  'font-[family-name:var(--nora-font)] text-[12px] font-medium leading-none tracking-normal backdrop-blur-[8px]',
)

function ShoppingHeading({ children }: { children: React.ReactNode }) {
  return (
    <p className="font-[family-name:var(--nora-font)] text-[13px] font-medium leading-5 text-[var(--nora-text)]">
      {children}
    </p>
  )
}

export function PlanShoppingDialog({
  days,
  onOpenChange,
  open,
  planId,
  title,
  savedScope,
}: {
  days: readonly PlanShoppingDay[]
  onOpenChange: (open: boolean) => void
  open: boolean
  planId: string
  title: string
  savedScope: SavedAccountScope
}) {
  const storageIdentity = `${planId}:${savedScope.userId}:${savedScope.email ?? ''}`
  const [bought, setBought] = React.useState(() =>
    planId ? readBoughtPlanShoppingKeys(savedScope, planId) : new Set<string>(),
  )
  const [dayValue, setDayValue] = React.useState(PLAN_SHOPPING_ALL_DAYS)
  const [loadedIdentity, setLoadedIdentity] = React.useState(storageIdentity)
  if (loadedIdentity !== storageIdentity) {
    setLoadedIdentity(storageIdentity)
    setBought(planId ? readBoughtPlanShoppingKeys(savedScope, planId) : new Set<string>())
  }

  React.useEffect(() => {
    if (open) setDayValue(PLAN_SHOPPING_ALL_DAYS)
  }, [open])

  const dayOptions = planShoppingDayOptions(days.length)
  const items = planShoppingItemsForDay(days, dayValue)
  const boughtCount = items.filter((item) => bought.has(item.key)).length

  function toggleItem(key: string) {
    if (!planId) return
    const next = toggleBoughtPlanShoppingKey(bought, key)
    setBought(next)
    writeBoughtPlanShoppingKeys(savedScope, planId, next)
  }

  return (
    <Dialog disablePointerDismissal onOpenChange={onOpenChange} open={open}>
      <DialogContent
        className={FRAME_CLASS}
        data-modal-frame="meal"
        data-plan-shopping-dialog=""
        showCloseButton={false}
      >
        <div className="shrink-0 px-2 pt-2">
          <DialogHeader className="min-w-0 gap-1 rounded-[16px] bg-[var(--nora-inset)] p-2.5 text-left">
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 flex-1 items-center gap-2.5">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[var(--nora-text)] text-[var(--nora-modal)]">
                  <ShoppingBagIcon aria-hidden className="size-4" strokeWidth={1.7} />
                </span>
                <div className="min-w-0 flex-1">
                  <DialogTitle className="font-[family-name:var(--nora-font)] !text-[15px] !font-medium !leading-6 tracking-normal text-[var(--nora-text)]">
                    Корзина
                  </DialogTitle>
                  <DialogDescription className="sr-only">
                    Список продуктов плана {title}
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
        <div
          className="min-h-0 flex-1 overflow-y-auto px-3 pt-3 pb-[max(0.875rem,env(safe-area-inset-bottom))] sm:px-4 sm:pb-3.5"
          data-plan-shopping-list=""
        >
          <div className="flex flex-col gap-2.5">
            <div className="flex flex-col gap-1.5" data-plan-shopping-day="">
              <ShoppingHeading>День</ShoppingHeading>
              <NoraSelect
                className="!h-10 !min-h-10 !max-h-10 rounded-[12px] bg-[var(--nora-inset)] px-3.5 text-[13px] font-normal leading-5"
                contentClassName={productToolbarSelectContentClass}
                itemClassName={productToolbarSelectItemClass}
                items={dayOptions}
                modal
                onValueChange={(value) => {
                  if (value) setDayValue(value)
                }}
                placeholder="Все дни"
                value={dayValue}
              />
            </div>
            <div
              className="flex items-center justify-between gap-2"
              data-plan-shopping-products=""
            >
              <ShoppingHeading>Продукты</ShoppingHeading>
              <span
                className={cn(
                  BADGE_CLASS,
                  items.length > 0 && boughtCount === items.length
                    ? 'bg-[var(--nora-success)] font-medium text-white'
                    : items.length > 0
                      ? 'bg-[var(--nora-tint-dimmed)] text-[var(--nora-tint)]'
                      : 'bg-[var(--nora-panel)]/80 text-[var(--nora-text-tertiary)]',
                )}
              >
                {boughtCount} из {items.length}
              </span>
            </div>
            {items.length === 0 ? (
              <p className="rounded-[14px] bg-[var(--nora-inset)] px-3.5 py-2.5 font-[family-name:var(--nora-font)] text-[13px] font-normal leading-5 text-[var(--nora-text-secondary)]">
                {dayValue === PLAN_SHOPPING_ALL_DAYS
                  ? 'В этом плане пока нет продуктов для списка.'
                  : 'В этом дне пока нет продуктов для списка.'}
              </p>
            ) : (
              items.map((item) => {
                const done = bought.has(item.key)
                return (
                  <button
                    aria-pressed={done}
                    className={ROW_CLASS}
                    data-shopping-item={item.key}
                    key={item.key}
                    onClick={() => toggleItem(item.key)}
                    type="button"
                  >
                    <span
                      className={cn(
                        'flex size-5 shrink-0 items-center justify-center rounded-full border transition-colors',
                        done
                          ? 'border-[var(--nora-success)] bg-[var(--nora-panel)]'
                          : 'border-[var(--nora-border-strong)] bg-[var(--nora-panel)]',
                      )}
                    >
                      {done ? (
                        <span
                          aria-hidden
                          className="size-2 rounded-full bg-[var(--nora-success)]"
                        />
                      ) : null}
                    </span>
                    <span className="min-w-0 flex-1 truncate font-[family-name:var(--nora-font)] text-[13px] font-normal leading-5 text-[var(--nora-text)]">
                      {item.label}
                    </span>
                    <span
                      className={cn(
                        'shrink-0 whitespace-nowrap rounded-full px-2.5 py-1 font-[family-name:var(--nora-font)] text-[11px] leading-none',
                        done
                          ? 'bg-[var(--nora-success)] font-medium text-white'
                          : 'bg-[var(--nora-panel)]/80 text-[var(--nora-text-tertiary)]',
                      )}
                    >
                      {done ? 'куплено' : 'купить'}
                    </span>
                  </button>
                )
              })
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
