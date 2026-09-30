import { FootprintsIcon, LayersIcon, type LucideIcon } from '@/components/icons'
import { Link, useRouterState } from '@tanstack/react-router'

import { useSidebarSearchQuery } from '@/components/dashboard/SidebarSearch'
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar'
import { STACK_BASE_PATH } from './model'

const STEPS_PATH = '/admin/steps' as const

const PROJECT_ITEMS: ReadonlyArray<{
  label: string
  to: typeof STACK_BASE_PATH | typeof STEPS_PATH
  icon: LucideIcon
  keywords: ReadonlyArray<string>
}> = [
  {
    label: 'Стек',
    to: STACK_BASE_PATH,
    icon: LayersIcon,
    keywords: ['стек', 'stack', 'технологии'],
  },
  {
    label: 'Разработка',
    to: STEPS_PATH,
    icon: FootprintsIcon,
    keywords: ['steps', 'шаги', 'разработка', 'версия', 'roadmap'],
  },
]

/** Stack + development history as one admin sidebar group. */
export function AdminStackNavigation() {
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  const query = useSidebarSearchQuery().trim().toLowerCase()
  const { setOpenMobile, state, setOpen } = useSidebar()
  const collapsed = state === 'collapsed'

  const items = PROJECT_ITEMS.filter((item) => {
    if (!query) return true
    if (item.label.toLowerCase().includes(query)) return true
    return item.keywords.some(
      (keyword) => keyword.includes(query) || query.includes(keyword),
    )
  })

  if (items.length === 0) return null

  if (collapsed) {
    return (
      <nav aria-label="Проект">
        <SidebarGroup className="py-0">
          <SidebarMenu className="gap-1">
            {items.map((item) => {
              const active =
                pathname === item.to || pathname.startsWith(`${item.to}/`)
              const Icon = item.icon
              return (
                <SidebarMenuItem key={item.to}>
                  <SidebarMenuButton
                    isActive={active}
                    onClick={() => setOpen(true)}
                    tooltip={item.label}
                    type="button"
                  >
                    <Icon className="size-4" />
                    <span>{item.label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )
            })}
          </SidebarMenu>
        </SidebarGroup>
      </nav>
    )
  }

  return (
    <nav aria-label="Проект">
      <SidebarGroup className="py-0">
        <SidebarGroupLabel>Проект</SidebarGroupLabel>
        <SidebarGroupContent>
          <SidebarMenu className="gap-px">
            {items.map((item) => {
              const active =
                pathname === item.to || pathname.startsWith(`${item.to}/`)
              const Icon = item.icon
              return (
                <SidebarMenuItem key={item.to}>
                  <SidebarMenuButton
                    isActive={active}
                    render={(
                      <Link
                        onClick={() => setOpenMobile(false)}
                        to={item.to}
                      />
                    )}
                    tooltip={item.label}
                  >
                    <Icon className="size-3.5 shrink-0" />
                    <span className="truncate">{item.label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )
            })}
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
    </nav>
  )
}
