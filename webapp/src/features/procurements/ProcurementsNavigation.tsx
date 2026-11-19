import { useRouterState } from '@tanstack/react-router'

import { DashboardLink } from '@/components/dashboard/DashboardLink'
import { useSidebarSearchQuery } from '@/components/dashboard/SidebarSearch'
import { ScaleIcon } from '@/components/icons'
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar'
import { cn } from '@/lib/utils'

/** Empty procurement section. The cabinet token is not used here yet. */
export function ProcurementsNavigation({ disabled = false }: { disabled?: boolean }) {
  const query = useSidebarSearchQuery().trim().toLowerCase()
  if (query && !'госзакупки'.includes(query)) return null
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  const active = pathname === '/app/procurements'

  return (
    <nav aria-label="Госзакупки">
      <SidebarGroup className="pt-1">
        <SidebarGroupLabel className="px-0">
          {disabled ? (
            <span className="inline-flex h-8 max-w-full items-center rounded-md px-2.5 opacity-50">
              Госзакупки
            </span>
          ) : (
            <span
              className={cn(
                'inline-flex h-8 max-w-full items-center rounded-md px-2.5 text-left',
                active && 'bg-[var(--nora-row-active-bg)] text-[var(--nora-text)]',
              )}
            >
              <DashboardLink
                aria-current={active ? 'page' : undefined}
                to="/app/procurements"
              >
                <span className="min-w-0 truncate">Госзакупки</span>
              </DashboardLink>
            </span>
          )}
        </SidebarGroupLabel>
        <SidebarGroupContent className="hidden group-data-[collapsible=icon]:block">
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                disabled={disabled}
                isActive={active && !disabled}
                render={<DashboardLink to="/app/procurements" />}
                tooltip="Госзакупки"
              >
                <ScaleIcon />
                <span className="sr-only">Госзакупки</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
    </nav>
  )
}
