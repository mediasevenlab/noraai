import { CalendarRangeIcon } from '@/components/icons'
import { Link, useRouterState } from '@tanstack/react-router'

import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar'

import { isMentorPlanPath } from '@/features/navigation'

export function MentorMealPlanNavigation() {
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  const { setOpenMobile } = useSidebar()
  const active = isMentorPlanPath(pathname)

  return (
    <nav aria-label="Планы">
      <SidebarGroup>
        <SidebarGroupLabel>Планы</SidebarGroupLabel>
        <SidebarGroupContent>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                isActive={active}
                render={(
                  <Link
                    onClick={() => setOpenMobile(false)}
                    to="/mentor/plans"
                  />
                )}
                tooltip="Планы"
              >
                <CalendarRangeIcon />
                <span className="truncate group-data-[collapsible=icon]:hidden">
                  Планы
                </span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
    </nav>
  )
}
