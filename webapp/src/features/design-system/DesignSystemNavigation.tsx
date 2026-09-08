import { BookOpenIcon, ChevronRightIcon } from 'lucide-react'
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
import { DS_BASE_PATH, DS_PAGES, type DsPageId } from './nav'

const OPEN_KEY = 'nutrition-admin-ds-nav-open'


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

export function AdminDesignSystemNavigation() {
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  const query = useSidebarSearchQuery().trim().toLowerCase()
  const { setOpenMobile, state, setOpen } = useSidebar()
  const collapsed = state === 'collapsed'
  const onDesignSystem = pathname.startsWith(DS_BASE_PATH)
  const [open, setGroupOpen] = useState(() => readOpen(false))
  const wasOnGroup = useRef(onDesignSystem)

  const pages = useMemo(() => {
    if (!query) return [...DS_PAGES]
    const groupHit = 'дизайн-система'.includes(query) || 'design'.includes(query)
    if (groupHit) return [...DS_PAGES]
    return DS_PAGES.filter((page) => page.name.toLowerCase().includes(query))
  }, [query])

  useEffect(() => {
    if (onDesignSystem && !wasOnGroup.current) setGroupOpen(true)
    wasOnGroup.current = onDesignSystem
  }, [onDesignSystem])

  useEffect(() => {
    if (query && pages.length > 0) setGroupOpen(true)
  }, [query, pages.length])

  useEffect(() => {
    try {
      localStorage.setItem(OPEN_KEY, String(open))
    } catch {
      // ignore
    }
  }, [open])

  if (pages.length === 0) return null

  if (collapsed) {
    return (
      <nav aria-label="Дизайн-система">
        <SidebarGroup className="py-0">
          <SidebarMenu className="gap-1">
            <SidebarMenuItem>
              <SidebarMenuButton
                isActive={onDesignSystem}
                onClick={() => {
                  setOpen(true)
                  setGroupOpen(true)
                }}
                tooltip="Дизайн-система"
                type="button"
              >
                <BookOpenIcon className="size-4" />
                <span>Дизайн-система</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>
      </nav>
    )
  }

  return (
    <nav aria-label="Дизайн-система">
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
            <span className="min-w-0 flex-1 truncate text-left">Дизайн</span>
            <ChevronRightIcon
              className={`size-3.5 shrink-0 text-[var(--nora-text-tertiary)] transition-transform ${(query || open) ? 'rotate-90' : ''}`}
            />
          </SidebarGroupLabel>
          <CollapsibleContent>
            <SidebarGroupContent>
              <SidebarMenu className="gap-px">
                  {pages.map((page) => {
                    const active = pathname === `${DS_BASE_PATH}/${page.id}`
                    return (
                      <SidebarMenuItem key={page.id}>
                        <SidebarMenuButton
                          isActive={active}
                          render={(
                            <Link
                              onClick={() => setOpenMobile(false)}
                              params={{ pageId: page.id as DsPageId }}
                              to="/admin/ds/$pageId"
                            />
                          )}
                          tooltip={page.name}
                        >
                          <span
                            className={`size-1 shrink-0 rounded-full ${active ? 'bg-primary' : 'bg-muted-foreground/40'}`}
                          />
                          <span className="truncate">{page.name}</span>
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
