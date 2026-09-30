import type { LucideIcon } from '@/components/icons'

import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar'
import type { WorkspaceRoutePath } from '@/features/navigation'
import { DashboardLink } from './DashboardLink'

export type DashboardNavigationItem = {
  disabled?: boolean
  icon: LucideIcon
  isActive: boolean
  label: string
  to: WorkspaceRoutePath
}

export function NavMain({
  label,
  items,
  navigationLabel = 'Основная навигация',
}: {
  label?: string
  items: ReadonlyArray<DashboardNavigationItem>
  navigationLabel?: string
}) {
  return (
    <nav aria-label={navigationLabel}>
      <SidebarGroup className={label ? undefined : 'py-0'}>
        {label ? <SidebarGroupLabel>{label}</SidebarGroupLabel> : null}
        <SidebarGroupContent>
          <SidebarMenu>
            {items.map((item) => (
              <SidebarMenuItem key={item.to}>
                {item.disabled ? (
                  <SidebarMenuButton
                    aria-disabled
                    disabled
                    tooltip={item.label}
                  >
                    <item.icon />
                    <span className="truncate group-data-[collapsible=icon]:hidden">
                      {item.label}
                    </span>
                  </SidebarMenuButton>
                ) : (
                  <SidebarMenuButton
                    isActive={item.isActive}
                    render={<DashboardLink to={item.to} />}
                    tooltip={item.label}
                  >
                    <item.icon />
                    <span className="truncate group-data-[collapsible=icon]:hidden">
                      {item.label}
                    </span>
                  </SidebarMenuButton>
                )}
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
    </nav>
  )
}
