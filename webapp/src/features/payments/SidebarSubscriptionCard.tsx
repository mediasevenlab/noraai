import { ChevronRightIcon, CreditCardIcon } from '@/components/icons'

import { DashboardLink } from '@/components/dashboard/DashboardLink'
import {
  noraProductMetaClass,
  noraProductTitleClass,
} from '@/components/nora/primitives'
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar'
import type { WorkspaceRoutePath } from '@/features/navigation'
import { cn } from '@/lib/utils'
import {
  DEMO_USER_NEXT_CHARGE,
  DEMO_USER_SUBSCRIPTION_DAYS_LEFT,
  DEMO_USER_SUBSCRIPTION_PERIOD_DAYS,
  formatPayoutAmount,
  formatSubscriptionDaysLeft,
  isSubscriptionExpiringSoon,
  subscriptionPeriodElapsedPercent,
} from './model'

const headingClass =
  'font-[family-name:var(--nora-font)] text-[13px] font-medium leading-5 text-[var(--nora-text)]'
const badgeClass =
  'font-[family-name:var(--nora-font)] text-[11px] font-medium leading-none tracking-normal'
const ctaClass =
  'font-[family-name:var(--nora-font)] text-[13px] font-medium leading-5'
const ctaBarClass =
  'pointer-events-none mt-4 flex h-9 w-full items-center justify-between rounded-[10px] bg-[var(--nora-input-bg)] py-1.5 pr-1.5 pl-3.5 text-[var(--nora-text)] shadow-[inset_0_0_0_1px_var(--nora-border)] transition-[background-color] duration-[var(--nora-duration,0.15s)] group-hover/menu-button:bg-[var(--nora-row-hover)]'
const ctaChipClass =
  'flex size-6 items-center justify-center rounded-full bg-[var(--nora-panel)] shadow-[inset_0_0_0_1px_var(--nora-border)]'
const rowLabelClass =
  'min-w-0 font-[family-name:var(--nora-font)] text-[12px] font-light leading-5 text-[var(--nora-text-tertiary)]'
const rowValueClass =
  'shrink-0 text-right font-[family-name:var(--nora-font)] text-[12px] font-light leading-5 tabular-nums text-[var(--nora-text-secondary)]'

export function SidebarSubscriptionCard({
  href,
}: {
  href: WorkspaceRoutePath
}) {
  const daysLeft = DEMO_USER_SUBSCRIPTION_DAYS_LEFT
  const daysLabel = formatSubscriptionDaysLeft(daysLeft)
  const elapsedPercent = subscriptionPeriodElapsedPercent(daysLeft)
  const expiringSoon = isSubscriptionExpiringSoon(daysLeft)
  const elapsedDays = Math.min(
    Math.max(DEMO_USER_SUBSCRIPTION_PERIOD_DAYS - daysLeft, 0),
    DEMO_USER_SUBSCRIPTION_PERIOD_DAYS,
  )
  const ariaLabel = `Подписка: осталось ${daysLabel}, следующее списание ${DEMO_USER_NEXT_CHARGE.label}`

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <SidebarMenuButton
          aria-label={ariaLabel}
          className={cn(
            'h-auto flex-col items-stretch gap-0 overflow-hidden rounded-[var(--nora-radius-xl,14px)] p-3.5',
            'bg-[var(--nora-panel)] text-[var(--nora-text)] shadow-[inset_0_0_0_1px_var(--nora-border),0_3px_10px_rgb(0_0_0/5%)]',
            'hover:bg-[var(--nora-surface)] hover:text-[var(--nora-text)]',
            'group-data-[collapsible=icon]:size-8! group-data-[collapsible=icon]:flex-row group-data-[collapsible=icon]:items-center group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:rounded-[var(--nora-radius-md,8px)] group-data-[collapsible=icon]:p-0!',
          )}
          render={<DashboardLink to={href} />}
          size="lg"
          tooltip={ariaLabel}
        >
          {/*
            First child must be a div: SidebarMenuButton hides direct `span`
            children when collapsed, and keeps the first div as the icon tile.
          */}
          <div className="flex items-center gap-3 group-data-[collapsible=icon]:size-8 group-data-[collapsible=icon]:justify-center">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-[10px] bg-[var(--nora-input-bg)] shadow-[inset_0_0_0_1px_var(--nora-border)]">
              <CreditCardIcon
                aria-hidden
                className="size-3.5 text-[var(--nora-text-secondary)]"
                strokeWidth={2}
              />
            </span>
            <span
              className={cn(
                headingClass,
                'min-w-0 flex-1 truncate group-data-[collapsible=icon]:hidden',
              )}
            >
              Подписка
            </span>
            <span
              className={cn(
                'ml-auto inline-flex h-6 shrink-0 items-center gap-1.5 rounded-full px-2.5 group-data-[collapsible=icon]:hidden',
                expiringSoon
                  ? 'bg-[var(--nora-text)] text-[var(--nora-panel)]!'
                  : 'bg-[var(--nora-input-bg)] text-[var(--nora-text-secondary)]!',
              )}
            >
              <span aria-hidden className="size-1.5 rounded-full bg-current opacity-65" />
              <span className={cn(badgeClass, 'tabular-nums')}>{daysLabel}</span>
            </span>
          </div>
          <div className="mt-3.5 flex min-w-0 flex-col border-t border-[var(--nora-divider)] pt-3.5 group-data-[collapsible=icon]:hidden">
            <div className="flex items-baseline justify-between gap-3">
              <div className="flex min-w-0 items-baseline gap-1.5">
                <span className={cn(noraProductTitleClass, 'truncate tabular-nums')}>
                  {formatPayoutAmount(DEMO_USER_NEXT_CHARGE.amount)}
                </span>
                <span className={cn(noraProductMetaClass, 'shrink-0')}>/ месяц</span>
              </div>
              <span
                className={cn(
                  noraProductMetaClass,
                  'flex shrink-0 items-baseline gap-1.5 text-[var(--nora-text-secondary)]',
                )}
              >
                <span aria-hidden className="mb-px size-1.5 rounded-full bg-[var(--nora-text)]" />
                Активна
              </span>
            </div>
            <div className="mt-2.5 flex items-baseline justify-between gap-3">
              <span className={rowLabelClass}>Следующее списание</span>
              <span className={cn(rowValueClass, 'truncate')}>
                {DEMO_USER_NEXT_CHARGE.label}
              </span>
            </div>
            <div className="mt-3.5 border-t border-[var(--nora-divider)] pt-3.5">
              <div className="flex items-baseline justify-between gap-3">
                <span className={rowLabelClass}>Текущий период</span>
                <span className={rowValueClass}>
                  {elapsedDays} из {DEMO_USER_SUBSCRIPTION_PERIOD_DAYS} дней
                </span>
              </div>
              <div
                aria-label={`Период подписки: осталось ${daysLabel}`}
                aria-valuemax={100}
                aria-valuemin={0}
                aria-valuenow={elapsedPercent}
                className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-[var(--nora-input-bg)]"
                role="progressbar"
              >
                <div
                  className="h-full rounded-full bg-[var(--nora-text)]"
                  style={{ width: `${elapsedPercent}%` }}
                />
              </div>
            </div>
            <span className={ctaBarClass}>
              <span className={ctaClass}>Продлить</span>
              <span className={ctaChipClass}>
                <ChevronRightIcon
                  aria-hidden
                  className="size-3.5 text-[var(--nora-text-secondary)] transition-colors duration-[var(--nora-duration,0.15s)] group-hover/menu-button:text-[var(--nora-text)]"
                />
              </span>
            </span>
          </div>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
