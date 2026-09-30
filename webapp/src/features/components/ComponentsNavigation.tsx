import { ChevronRightIcon, ComponentIcon } from '@/components/icons'
import { Link, useRouterState } from '@tanstack/react-router'
import { useEffect, useMemo, useRef, useState } from 'react'

import { useSidebarSearchQuery } from '@/components/dashboard/SidebarSearch'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar'
import {
  COMP_BASE_PATH,
  COMPONENTS,
  componentPath,
} from './nav'

const OPEN_KEY = 'nutrition-admin-components-nav-open'


function readOpen(fallback: boolean) {
  try {
    const raw = localStorage.getItem(OPEN_KEY)
    if (raw === 'true') return true
    if (raw === 'false') return false
  } catch {
    // ignore
  }
  return fallback
}

export function AdminComponentsNavigation() {
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  const query = useSidebarSearchQuery().trim().toLowerCase()
  const { setOpenMobile, state, setOpen } = useSidebar()
  const collapsed = state === 'collapsed'
  const onComponents = pathname === COMP_BASE_PATH || pathname.startsWith(`${COMP_BASE_PATH}/`)
  const [open, setGroupOpen] = useState(() => readOpen(false))
  const wasOnGroup = useRef(onComponents)

  const items = useMemo(() => {
    const all = [
      { id: '__all__', name: 'Все компоненты', to: COMP_BASE_PATH },
      ...COMPONENTS.map((component) => ({
        id: component.id,
        name: component.name,
        to: componentPath(component.id),
      })),
    ]
    if (!query) return all
    const groupHit = 'компоненты'.includes(query) || 'components'.includes(query)
    if (groupHit) return all
    return all.filter((item) => item.name.toLowerCase().includes(query))
  }, [query])

  useEffect(() => {
    if (onComponents && !wasOnGroup.current) setGroupOpen(true)
    wasOnGroup.current = onComponents
  }, [onComponents])

  useEffect(() => {
    if (query && items.length > 0) setGroupOpen(true)
  }, [query, items.length])

  useEffect(() => {
    try {
      localStorage.setItem(OPEN_KEY, String(open))
    } catch {
      // ignore
    }
  }, [open])

  if (items.length === 0) return null

  if (collapsed) {
    return (
      <nav aria-label="Компоненты">
        <SidebarGroup className="py-0">
          <SidebarMenu className="gap-1">
            <SidebarMenuItem>
              <SidebarMenuButton
                isActive={onComponents}
                onClick={() => {
                  setOpen(true)
                  setGroupOpen(true)
                }}
                tooltip="Компоненты"
                type="button"
              >
                <ComponentIcon className="size-4" />
                <span>Компоненты</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>
      </nav>
    )
  }

  return (
    <nav aria-label="Компоненты">
      <Collapsible
        className="group/collapsible"
        open={Boolean(query) || open}
        onOpenChange={setGroupOpen}
      >
        <SidebarGroup className="py-0">
          <SidebarGroupLabel
            className="w-full cursor-pointer justify-between gap-2"
            render={<CollapsibleTrigger />}
          >
            <span className="min-w-0 flex-1 truncate text-left">Компоненты</span>
            <span className="text-[11px] font-normal text-[var(--nora-text-tertiary)]">
              {query ? items.length : COMPONENTS.length}
            </span>
            <ChevronRightIcon
              className={`size-3.5 shrink-0 text-[var(--nora-text-tertiary)] transition-transform ${(query || open) ? 'rotate-90' : ''}`}
            />
          </SidebarGroupLabel>
          <CollapsibleContent>
            <SidebarGroupContent>
              <SidebarMenu className="gap-px">
                  {items.map((item) => {
                    const active = pathname === item.to
                    return (
                      <SidebarMenuItem key={item.id}>
                        <SidebarMenuButton
                          isActive={active}
                          render={
                            item.id === '__all__'
                              ? (
                                  <Link
                                    onClick={() => setOpenMobile(false)}
                                    to="/admin/components"
                                  />
                                )
                              : (
                                  <Link
                                    onClick={() => setOpenMobile(false)}
                                    params={{ componentId: item.id }}
                                    to="/admin/components/$componentId"
                                  />
                                )
                          }
                          tooltip={item.name}
                        >
                          <span
                            className={`size-1 shrink-0 rounded-full ${active ? 'bg-primary' : 'bg-muted-foreground/40'}`}
                          />
                          <span className="truncate">{item.name}</span>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    )
                  })}
                </SidebarMenu>
            </SidebarGroupContent>
          </CollapsibleContent>
        </SidebarGroup>
      </Collapsible>
    </nav>
  )
}
