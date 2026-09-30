import type { LucideIcon } from '@/components/icons'
import { ChevronRightIcon } from '@/components/icons'

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
import { DashboardLink } from './DashboardLink'

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

export function SidebarRelationCard({
  actionLabel = 'Открыть',
  ariaLabel,
  badge,
  description,
  href,
  icon: Icon,
  label,
  value,
}: {
  actionLabel?: string
  ariaLabel: string
  badge?: string
  description?: string
  href: WorkspaceRoutePath
  icon: LucideIcon
  label: string
  value?: string
}) {
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
              <Icon
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
              {label}
            </span>
            {badge ? (
              <span
                className={cn(
                  'ml-auto inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-[var(--nora-text)] px-1.5 text-[var(--nora-panel)]! group-data-[collapsible=icon]:hidden',
                  badge.length > 2 && 'w-auto min-w-6',
                )}
              >
                <span className={cn(badgeClass, 'tabular-nums')}>{badge}</span>
              </span>
            ) : null}
          </div>
          <div className="mt-3.5 flex min-w-0 flex-col border-t border-[var(--nora-divider)] pt-3.5 group-data-[collapsible=icon]:hidden">
            {value ? (
              <p className={cn(noraProductTitleClass, 'truncate')}>{value}</p>
            ) : null}
            {description ? (
              <p
                className={cn(
                  noraProductMetaClass,
                  value && 'mt-0.5',
                )}
              >
                {description}
              </p>
            ) : null}
            <span className={ctaBarClass}>
              <span className={ctaClass}>{actionLabel}</span>
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
