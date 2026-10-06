import { CalendarRangeIcon, ImagesIcon } from '@/components/icons'
import { Link, useRouterState } from '@tanstack/react-router'

import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
  useSidebar,
} from '@/components/ui/sidebar'

import { isMentorFeedPath, isMentorPlanPath, userFeedSearch } from '@/features/navigation'

export function MentorMealPlanNavigation() {
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  const { setOpenMobile } = useSidebar()
  const active = isMentorPlanPath(pathname)

  return (
    <>
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
                tooltip="Рационы"
              >
                <CalendarRangeIcon />
                <span className="truncate group-data-[collapsible=icon]:hidden">
                  Рационы
                </span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
    </nav>
    <SidebarSeparator />
    <nav aria-label="Социальная сеть">
      <SidebarGroup>
        <SidebarGroupLabel>Социальная сеть</SidebarGroupLabel>
        <SidebarGroupContent>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                isActive={isMentorFeedPath(pathname)}
                render={(
                  <Link
                    onClick={() => setOpenMobile(false)}
                    search={userFeedSearch()}
                    to="/mentor/feed"
                  />
                )}
                tooltip="Лента"
              >
                <ImagesIcon />
                <span className="truncate group-data-[collapsible=icon]:hidden">
                  Лента
                </span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
    </nav>
    </>
  )
}
