import { Columns2Icon, ImagesIcon, LayoutGridIcon } from 'lucide-react'
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
import { userGeneralSearch } from '@/features/navigation'

const GENERAL_ITEMS = [
  {
    key: 'general',
    label: 'Общее',
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
    search: undefined,
    icon: ImagesIcon,
  },
]

function UserNavGroup<
  T extends {
    key: string
    label: string
    to: '/app/feed' | '/app/general'
    search?: ReturnType<typeof userGeneralSearch>
    icon: typeof Columns2Icon
  },
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
                      render={(
                        <Link
                          onClick={() => setOpenMobile(false)}
                          search={item.search}
                          to={item.to}
                        />
                      )}
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

/** Diary and plan share Общее; catalog is its own entry; feed stays under Социальная сеть. */
export function UserAppNavigation({ disabled = false }: { disabled?: boolean }) {
  return (
    <>
      <UserNavGroup disabled={disabled} items={GENERAL_ITEMS} label="Общее" />
      <SidebarSeparator />
      <UserNavGroup disabled={disabled} items={SOCIAL_ITEMS} label="Социальная сеть" />
    </>
  )
}
