import { ChevronRightIcon, LayoutTemplateIcon } from 'lucide-react'
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
  BLOCKS,
  BLOCKS_BASE_PATH,
  blockPath,
} from './nav'

const OPEN_KEY = 'nutrition-admin-blocks-nav-open'


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

export function AdminBlocksNavigation() {
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  const query = useSidebarSearchQuery().trim().toLowerCase()
  const { setOpenMobile, state, setOpen } = useSidebar()
  const collapsed = state === 'collapsed'
  const onBlocks = pathname === BLOCKS_BASE_PATH || pathname.startsWith(`${BLOCKS_BASE_PATH}/`)
  const [open, setGroupOpen] = useState(() => readOpen(false))
  const wasOnGroup = useRef(onBlocks)

  const items = useMemo(() => {
    const all = [
      { id: '__all__', name: 'Все блоки', to: BLOCKS_BASE_PATH },
      ...BLOCKS.map((block) => ({
        id: block.id,
        name: block.name,
        to: blockPath(block.id),
      })),
    ]
    if (!query) return all
    const groupHit = 'блоки'.includes(query) || 'blocks'.includes(query)
    if (groupHit) return all
    return all.filter((item) => item.name.toLowerCase().includes(query))
  }, [query])

  useEffect(() => {
    if (onBlocks && !wasOnGroup.current) setGroupOpen(true)
    wasOnGroup.current = onBlocks
  }, [onBlocks])

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
      <nav aria-label="Блоки">
        <SidebarGroup className="py-0">
          <SidebarMenu className="gap-1">
            <SidebarMenuItem>
              <SidebarMenuButton
                isActive={onBlocks}
                onClick={() => {
                  setOpen(true)
                  setGroupOpen(true)
                }}
                tooltip="Блоки"
                type="button"
              >
                <LayoutTemplateIcon className="size-4" />
                <span>Блоки</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>
      </nav>
    )
  }

  return (
    <nav aria-label="Блоки">
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
            <span className="min-w-0 flex-1 truncate text-left">Блоки</span>
            <span className="text-[11px] font-normal text-[var(--nora-text-tertiary)]">
              {query ? items.length : BLOCKS.length}
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
                                    to="/admin/blocks"
                                  />
                                )
                              : (
                                  <Link
                                    onClick={() => setOpenMobile(false)}
                                    params={{ blockId: item.id }}
                                    to="/admin/blocks/$blockId"
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
