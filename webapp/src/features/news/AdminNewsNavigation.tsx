import { NewspaperIcon } from '@/components/icons'
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

export function AdminNewsNavigation() {
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  const { setOpenMobile } = useSidebar()

  return (
    <nav aria-label="Новости">
      <SidebarGroup>
        <SidebarGroupLabel>Новости</SidebarGroupLabel>
        <SidebarGroupContent>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                isActive={pathname === '/admin/news'}
                render={(
                  <Link
                    onClick={() => setOpenMobile(false)}
                    to="/admin/news"
                  />
                )}
                tooltip="Новости"
              >
                <NewspaperIcon />
                <span className="truncate group-data-[collapsible=icon]:hidden">
                  Новости
                </span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
    </nav>
  )
}
