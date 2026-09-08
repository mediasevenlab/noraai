import { CalendarIcon, ShoppingBagIcon, ZapIcon } from 'lucide-react'

import { cn } from '@/lib/utils'

const DAY_STAT_CHIP_CLASS =
  'ios-glass-glare inline-flex h-7 min-h-7 max-h-7 shrink-0 items-center gap-1 rounded-full border-0 bg-[color-mix(in_srgb,var(--nora-input-bg)_55%,var(--nora-canvas))] py-0 pr-2.5 pl-2 text-[12px] font-normal leading-none text-[var(--nora-text-secondary)] backdrop-blur-[16px]'

function balanceTone(delta: number) {
  if (delta > 0) return 'yellow'
  if (delta < 0) return 'red'
  return 'green'
}

export function AuthDiaryDayBar({
  balanceDelta,
  balanceLabel,
  basketPressed = false,
  heading,
  shoppingComplete,
}: {
  balanceDelta: number
  balanceLabel: string
  basketPressed?: boolean
  heading: string
  shoppingComplete: boolean
}) {
  const tone = balanceTone(balanceDelta)
  return (
    <div className="flex w-max items-center gap-2" data-auth-day-bar="">
      <div className={DAY_STAT_CHIP_CLASS}>
        <CalendarIcon aria-hidden className="size-[13px]" strokeWidth={1.75} />
        {heading}
      </div>
      <div
        className={cn(
          DAY_STAT_CHIP_CLASS,
          shoppingComplete
            ? 'bg-[color-mix(in_srgb,var(--nora-badge-green-text)_18%,var(--nora-panel))] text-[var(--nora-badge-green-text)]'
            : 'bg-[color-mix(in_srgb,var(--nora-tint)_15%,var(--nora-panel))] text-[var(--nora-tint)]',
          'nora-press-grow hidden size-7 justify-center px-0',
        )}
        data-demo-pressed={basketPressed ? '' : undefined}
        data-shopping-complete={shoppingComplete ? '' : undefined}
      >
        <ShoppingBagIcon aria-hidden className="size-[13px]" strokeWidth={1.75} />
      </div>
      <div
        className={cn(
          DAY_STAT_CHIP_CLASS,
          'tabular-nums transition-colors duration-300',
          tone === 'yellow' &&
            'bg-[color-mix(in_srgb,var(--nora-badge-yellow-text)_18%,var(--nora-panel))] text-[var(--nora-badge-yellow-text)]',
          tone === 'red' &&
            'bg-[color-mix(in_srgb,var(--nora-badge-red-text)_18%,var(--nora-panel))] text-[var(--nora-badge-red-text)]',
          tone === 'green' &&
            'bg-[color-mix(in_srgb,var(--nora-badge-green-text)_18%,var(--nora-panel))] text-[var(--nora-badge-green-text)]',
        )}
        data-balance-tone={tone}
      >
        <ZapIcon aria-hidden className="size-[13px]" strokeWidth={1.75} />
        {balanceLabel}
      </div>
    </div>
  )
}
