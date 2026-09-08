import * as React from 'react'
import { CircleCheckIcon, CircleIcon, ShoppingBagIcon, XIcon } from 'lucide-react'

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
  'nora-press-grow ios-glass-glare-soft flex min-h-12 items-center gap-2.5 rounded-[14px] border-0 px-2.5 py-2 text-left',
  'bg-[var(--nora-input-bg)]/72 text-[var(--nora-text-secondary)] backdrop-blur-[16px] outline-none',
  'hover:bg-[var(--nora-input-bg)] hover:text-[var(--nora-text)]',
  'focus-visible:shadow-[var(--nora-shadow-focus)]',
)

const BADGE_CLASS = cn(
  'ios-glass-glare-soft inline-flex h-6 min-h-6 max-h-6 w-fit shrink-0 items-center rounded-full border-0 px-2.5',
  'font-[family-name:var(--nora-font)] text-[12px] font-medium leading-none tracking-normal backdrop-blur-[8px]',
)

function shoppingDescription(title: string, dayValue: string) {
  if (dayValue === PLAN_SHOPPING_ALL_DAYS) {
    return `${title}. Список продуктов на весь план — отметьте, что уже купили.`
  }
  return `${title}. Список продуктов на ${dayValue} день — отметьте, что уже купили.`
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
    setDayValue(PLAN_SHOPPING_ALL_DAYS)
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
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent
        className={FRAME_CLASS}
        data-modal-frame="meal"
        data-plan-shopping-dialog=""
        showCloseButton={false}
      >
        <div className="shrink-0 px-2 pt-2">
          <DialogHeader className="min-w-0 gap-1 rounded-[16px] bg-[var(--nora-inset)] p-2.5 text-left">
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 flex-1 items-start gap-2.5">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[var(--nora-text)] text-[var(--nora-modal)]">
                  <ShoppingBagIcon aria-hidden className="size-4" strokeWidth={1.7} />
                </span>
                <div className="min-w-0 flex-1">
                  <DialogTitle className="font-[family-name:var(--nora-font)] !text-[15px] !font-medium !leading-6 tracking-normal text-[var(--nora-text)]">
                    Корзина
                  </DialogTitle>
                  <DialogDescription className="mt-0.5 line-clamp-2 font-[family-name:var(--nora-font)] text-[12px] font-light leading-5 text-[var(--nora-text-tertiary)]">
                    {shoppingDescription(title, dayValue)}
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
            <div
              className="mt-2.5 border-t border-[var(--nora-divider)] pt-2.5"
              data-plan-shopping-day=""
            >
              <p className="font-[family-name:var(--nora-font)] text-[13px] font-medium leading-5 text-[var(--nora-text)]">
                День
              </p>
              <NoraSelect
                className="mt-2 !h-10 !min-h-10 !max-h-10 rounded-[12px] bg-[var(--nora-panel)] px-3.5 text-[13px] font-normal leading-5"
                contentClassName={productToolbarSelectContentClass}
                itemClassName={productToolbarSelectItemClass}
                items={dayOptions}
                onValueChange={(value) => {
                  if (value) setDayValue(value)
                }}
                placeholder="Все дни"
                value={dayValue}
              />
            </div>
            <div className="mt-2.5 flex items-center justify-between gap-2">
              <p className="font-[family-name:var(--nora-font)] text-[13px] font-medium leading-5 text-[var(--nora-text)]">
                Куплено
              </p>
              <span
                className={cn(
                  BADGE_CLASS,
                  items.length > 0 && boughtCount === items.length
                    ? 'bg-[var(--nora-badge-green-bg)] text-[var(--nora-badge-green-text)]'
                    : items.length > 0
                      ? 'bg-[var(--nora-tint-dimmed)] text-[var(--nora-tint)]'
                      : 'bg-[var(--nora-input-bg)]/72 text-[var(--nora-text-secondary)]',
                )}
              >
                {boughtCount} из {items.length}
              </span>
            </div>
          </DialogHeader>
        </div>
        <div
          className="flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto px-3 pt-3 pb-[max(0.875rem,env(safe-area-inset-bottom))] sm:px-4 sm:pb-3.5"
          data-plan-shopping-list=""
        >
          {items.length === 0 ? (
            <p className="rounded-[14px] bg-[var(--nora-input-bg)]/72 px-2.5 py-3 font-[family-name:var(--nora-font)] text-[13px] font-normal leading-5 text-[var(--nora-text-secondary)]">
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
                      BADGE_CLASS,
                      'w-8 justify-center px-0',
                      done
                        ? 'bg-[var(--nora-badge-green-bg)] text-[var(--nora-badge-green-text)]'
                        : 'bg-[var(--nora-panel)]/80 text-[var(--nora-text)]',
                    )}
                  >
                    {done ? (
                      <CircleCheckIcon aria-hidden className="size-3.5" strokeWidth={1.75} />
                    ) : (
                      <CircleIcon aria-hidden className="size-3.5" strokeWidth={1.75} />
                    )}
                  </span>
                  <span className="min-w-0 flex-1 font-[family-name:var(--nora-font)] text-[13px] font-normal text-[var(--nora-text)]">
                    {item.label}
                  </span>
                  <span
                    className={cn(
                      BADGE_CLASS,
                      'shrink-0 whitespace-nowrap font-normal',
                      done
                        ? 'bg-[var(--nora-badge-green-bg)] text-[var(--nora-badge-green-text)]'
                        : 'bg-[var(--nora-panel)]/80',
                    )}
                  >
                    {done ? 'куплено' : 'купить'}
                  </span>
                </button>
              )
            })
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
