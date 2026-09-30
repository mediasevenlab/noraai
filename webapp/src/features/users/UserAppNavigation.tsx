import { Columns2Icon, ImagesIcon, LayoutGridIcon } from '@/components/icons'
import { Link, useRouterState } from '@tanstack/react-router'

import { useFilteredBySidebarSearch } from '@/components/dashboard/SidebarSearch'
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
import { userFeedSearch, userGeneralSearch } from '@/features/navigation'

const GENERAL_ITEMS = [
  {
    key: 'general',
    label: 'Мой дневник',
    to: '/app/general' as const,
    search: userGeneralSearch(),
    icon: Columns2Icon,
  },
  {
    key: 'catalog',
    label: 'Каталог',
    to: '/app/general' as const,
    search: userGeneralSearch('plan', undefined, 'catalog'),
    icon: LayoutGridIcon,
  },
]

const SOCIAL_ITEMS = [
  {
    key: 'feed',
    label: 'Лента',
    to: '/app/feed' as const,
    search: userFeedSearch(),
    icon: ImagesIcon,
  },
]

function UserNavGroup<
  T extends (typeof GENERAL_ITEMS)[number] | (typeof SOCIAL_ITEMS)[number],
>({
  disabled,
  items,
  label,
}: {
  disabled: boolean
  items: readonly T[]
  label: string
}) {
  const location = useRouterState({ select: (state) => state.location })
  const { setOpenMobile } = useSidebar()
  const visible = useFilteredBySidebarSearch(items)

  if (visible.length === 0) return null

  return (
    <nav aria-label={label}>
      <SidebarGroup>
        <SidebarGroupLabel>{label}</SidebarGroupLabel>
        <SidebarGroupContent>
          <SidebarMenu>
            {visible.map((item) => {
              const locked = disabled
              const catalogActive =
                item.key === 'catalog'
                && location.pathname === '/app/general'
                && location.search.library === 'catalog'
              const generalActive =
                item.key === 'general'
                && (location.pathname === '/app/general' || location.pathname.startsWith('/app/diary'))
                && location.search.library !== 'catalog'
              const feedActive = item.key === 'feed' && location.pathname === item.to
              const active = !locked && (catalogActive || generalActive || feedActive)
              const Icon = item.icon

              return (
                <SidebarMenuItem key={item.key}>
                  {locked ? (
                    <SidebarMenuButton
                      aria-disabled
                      disabled
                      tooltip={item.label}
                    >
                      <Icon />
                      <span className="truncate group-data-[collapsible=icon]:hidden">
                        {item.label}
                      </span>
                    </SidebarMenuButton>
                  ) : (
                    <SidebarMenuButton
                      isActive={active}
                      render={
                        item.to === '/app/feed' ? (
                          <Link
                            onClick={() => setOpenMobile(false)}
                            search={item.search}
                            to="/app/feed"
                          />
                        ) : (
                          <Link
                            onClick={() => setOpenMobile(false)}
                            search={item.search}
                            to="/app/general"
                          />
                        )
                      }
                      tooltip={item.label}
                    >
                      <Icon />
                      <span className="truncate group-data-[collapsible=icon]:hidden">
                        {item.label}
                      </span>
                    </SidebarMenuButton>
                  )}
                </SidebarMenuItem>
              )
            })}
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
    </nav>
  )
}

/** Diary and plan share Мой дневник; catalog is its own entry; feed stays under Социальная сеть. */
export function UserAppNavigation({ disabled = false }: { disabled?: boolean }) {
  return (
    <>
      <UserNavGroup disabled={disabled} items={GENERAL_ITEMS} label="Питание" />
      <SidebarSeparator />
      <UserNavGroup disabled={disabled} items={SOCIAL_ITEMS} label="Социальная сеть" />
    </>
  )
}
