import * as React from 'react'
import { CircleCheckIcon, CircleIcon, XIcon } from '@/components/icons'

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
  dayShoppingItems,
  readBoughtShoppingKeys,
  shoppingDayKey,
  toggleBoughtShoppingKey,
  writeBoughtShoppingKeys,
  type DayShoppingMeal,
} from './day-shopping'

const FRAME_CLASS = cn(
  'flex flex-col gap-0 overflow-hidden p-0',
  'inset-x-0 top-[var(--modal-sheet-inset)] bottom-0 h-[calc(100dvh-var(--modal-sheet-inset))] max-h-[calc(100dvh-var(--modal-sheet-inset))] w-full max-w-none translate-x-0 translate-y-0 rounded-t-[var(--modal-sheet-radius)] rounded-b-none',
  'md:inset-auto md:top-1/2 md:left-1/2 md:h-auto md:max-h-[min(720px,calc(100vh-2rem))] md:w-[min(100%-2rem,460px)] md:max-w-[460px] md:rounded-[22px]',
)

const CLOSE_CLASS = cn(
  'nora-press-grow ios-glass-glare inline-flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-full border-0',
  'bg-[var(--nora-panel)]/72 text-[var(--nora-text-tertiary)] backdrop-blur-[16px] outline-none sm:size-6',
  'hover:text-[var(--nora-text)] focus-visible:shadow-[var(--nora-shadow-focus)]',
)

const ROW_CLASS = cn(
  'nora-press-grow ios-glass-glare-soft flex min-h-12 items-center gap-2.5 rounded-[14px] border-0 px-2.5 py-2 text-left',
  'bg-[var(--nora-input-bg)]/72 text-[var(--nora-text-secondary)] backdrop-blur-[16px] outline-none',
  'hover:bg-[var(--nora-input-bg)] hover:text-[var(--nora-text)]',
  'focus-visible:shadow-[var(--nora-shadow-focus)] disabled:opacity-60',
)

const BADGE_CLASS = cn(
  'ios-glass-glare-soft inline-flex h-6 min-h-6 max-h-6 w-fit shrink-0 items-center rounded-full border-0 px-2.5',
  'font-[family-name:var(--nora-font)] text-[12px] font-medium leading-none tracking-normal backdrop-blur-[8px]',
)

export function DayShoppingBody({
  bought,
  collapsing = false,
  demoPressedKey = null,
  heading,
  hideClose = false,
  itemLimit,
  meals,
  onClose,
  onToggle,
  readOnly = false,
}: {
  bought: ReadonlySet<string>
  collapsing?: boolean
  demoPressedKey?: string | null
  heading: string
  hideClose?: boolean
  itemLimit?: number
  meals: readonly DayShoppingMeal[]
  onClose?: () => void
  onToggle: (key: string) => void
  readOnly?: boolean
}) {
  const items = dayShoppingItems(meals, itemLimit)
  const boughtCount = items.filter((item) => bought.has(item.key)).length

  return (
    <>
      <DialogHeader
        className={cn(
          'min-w-0 shrink-0 gap-1 px-3 pt-3 text-left transition-opacity ease-out sm:px-4 sm:pt-3.5',
          collapsing
            ? 'pointer-events-none bg-transparent opacity-0'
            : 'bg-[var(--nora-modal)]',
        )}
        style={{ transitionDuration: collapsing ? '180ms' : '300ms' }}
      >
        <div className="flex items-start justify-between gap-3">
          <DialogTitle className="font-[family-name:var(--nora-font)] !text-[15px] !font-medium !leading-6 tracking-normal text-[var(--nora-text)]">
            Покупки
          </DialogTitle>
          {hideClose ? null : (
            <DialogClose aria-label="Закрыть" className={CLOSE_CLASS} onClick={onClose}>
              <XIcon aria-hidden className="size-3.5" strokeWidth={1.75} />
            </DialogClose>
          )}
        </div>
        <DialogDescription className="font-[family-name:var(--nora-font)] text-[12px] font-light leading-5 text-[var(--nora-text-tertiary)]">
          {heading}. Список из рациона на этот день — отметьте, что уже купили.
        </DialogDescription>
        <div className="pt-1.5">
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
        <div aria-hidden className="mt-1.5 border-t border-[var(--nora-divider)]" />
      </DialogHeader>
      <div
        className={cn(
          'flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto px-3 pt-3 pb-[max(0.875rem,env(safe-area-inset-bottom))] transition-opacity ease-out sm:px-4 sm:pb-3.5',
          collapsing && 'pointer-events-none min-h-0 flex-none opacity-0',
        )}
        data-day-shopping-list=""
        style={{ transitionDuration: collapsing ? '220ms' : '300ms' }}
      >
        {items.length === 0 ? (
          <p className="rounded-[14px] bg-[var(--nora-input-bg)]/72 px-2.5 py-3 font-[family-name:var(--nora-font)] text-[13px] font-normal leading-5 text-[var(--nora-text-secondary)]">
            На этот день нет продуктов из рациона. Добавьте день в разделе Рационы.
          </p>
        ) : (
          items.map((item) => {
            const done = bought.has(item.key)
            return (
              <button
                aria-pressed={done}
                className={ROW_CLASS}
                data-demo-pressed={demoPressedKey === item.key ? '' : undefined}
                data-shopping-item={item.key}
                disabled={readOnly}
                key={item.key}
                onClick={() => onToggle(item.key)}
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
    </>
  )
}

export function DayShoppingDialog({
  dayIso,
  heading,
  meals,
  onBoughtChange,
  onOpenChange,
  open,
  readOnly = false,
  savedScope,
}: {
  dayIso: string
  heading: string
  meals: readonly DayShoppingMeal[]
  onBoughtChange?: (keys: Set<string>) => void
  onOpenChange: (open: boolean) => void
  open: boolean
  readOnly?: boolean
  savedScope: SavedAccountScope
}) {
  const dayKey = shoppingDayKey(dayIso)
  const storageIdentity = `${dayKey}:${savedScope.userId}:${savedScope.email}`
  const [bought, setBought] = React.useState(() => readBoughtShoppingKeys(savedScope, dayKey))
  const [loadedIdentity, setLoadedIdentity] = React.useState(storageIdentity)
  if (loadedIdentity !== storageIdentity) {
    setLoadedIdentity(storageIdentity)
    setBought(readBoughtShoppingKeys(savedScope, dayKey))
  }

  function toggleItem(key: string) {
    if (readOnly) return
    const next = toggleBoughtShoppingKey(bought, key)
    setBought(next)
    writeBoughtShoppingKeys(savedScope, dayKey, next)
    onBoughtChange?.(next)
  }

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent
        className={FRAME_CLASS}
        data-day-shopping-dialog=""
        data-modal-frame="meal"
        showCloseButton={false}
      >
        <DayShoppingBody
          bought={bought}
          heading={heading}
          meals={meals}
          onToggle={toggleItem}
          readOnly={readOnly}
        />
      </DialogContent>
    </Dialog>
  )
}
