import { useEffect, useState } from 'react'
import { MessageCircleIcon, PlusIcon, XIcon } from '@/components/icons'
import { useNavigate, useRouterState } from '@tanstack/react-router'
import { useAuth } from '@/features/auth'
import { dialogDatesLabel, ruCalendarDate } from '@/lib/ru-when'
import {
  ThreadListItemPrimitive,
  ThreadListPrimitive,
  useAuiState,
} from '@assistant-ui/react'

import { SidebarSection } from '@/components/dashboard/SidebarSection'
import { useSidebarSearchQuery } from '@/components/dashboard/SidebarSearch'
import { sidebarTip } from '@/components/dashboard/sidebar-tip'
import { cn } from '@/lib/utils'
import {
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar'

function DialogSidebarThread({
  disabled,
  needle,
  onOpen,
  to,
}: {
  disabled: boolean
  needle: string
  onOpen: () => void
  to: '/app/dialogs' | '/mentor/dialogs'
}) {
  const auth = useAuth()
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  const active = useAuiState((state) => state.threadListItem.id === state.threads.mainThreadId)
  const title = useAuiState((state) => state.threadListItem.title || 'Диалог')
  const listed = useAuiState((state) => state.threadListItem.title || 'Новый диалог')
  const remoteId = useAuiState((state) => state.threadListItem.remoteId || state.threadListItem.id)
  const lastMessageAt = useAuiState((state) => state.threadListItem.lastMessageAt?.getTime() ?? 0)
  const [when, setWhen] = useState('')
  useEffect(() => {
    const userId = auth.user?.id
    const stored = userId && remoteId ? dialogDatesLabel(localStorage.getItem(`dialogs:${userId}:messages:${remoteId}`)) : ''
    setWhen(stored || (lastMessageAt ? ruCalendarDate(new Date(lastMessageAt)) : ''))
  }, [auth.user?.id, lastMessageAt, remoteId])
  if (needle && !listed.toLowerCase().includes(needle)) return null
  return (
    <ThreadListItemPrimitive.Root>
      <SidebarMenuItem>
        <SidebarMenuButton
          disabled={disabled}
          isActive={pathname === to && active}
          render={(
            <ThreadListItemPrimitive.Trigger disabled={disabled} onClick={onOpen} />
          )}
          className={cn(
            'group-has-data-[sidebar=menu-action]/menu-item:!pr-10',
            pathname === to
              ? ''
              : 'data-active:!bg-transparent data-active:!text-[var(--nora-text-secondary)] data-active:[&_svg]:!text-[var(--nora-text-tertiary)] dark:data-active:[&_svg]:!text-[var(--nora-text-secondary)]',
          )}
          tooltip={sidebarTip(title, when)}
        >
          <MessageCircleIcon />
          <span className="min-w-0 flex-1 truncate group-data-[collapsible=icon]:hidden">
            <ThreadListItemPrimitive.Title fallback="Новый диалог" />
          </span>
        </SidebarMenuButton>
        {disabled ? null : (
          <SidebarMenuAction
            aria-label="Удалить диалог"
            render={<ThreadListItemPrimitive.Delete />}
            showOnHover
          >
            <XIcon />
          </SidebarMenuAction>
        )}
      </SidebarMenuItem>
    </ThreadListItemPrimitive.Root>
  )
}

export function DialogsNavigation({
  disabled = false,
  to,
}: {
  disabled?: boolean
  to: '/app/dialogs' | '/mentor/dialogs'
}) {
  const query = useSidebarSearchQuery().trim().toLowerCase()
  const sectionHit = query.length > 0 && 'диалоги'.includes(query)
  const titles = useAuiState((state) =>
    state.threads.threadItems.map((item) => item.title || 'Новый диалог').join('\n'),
  )
  const showNew = !query || sectionHit || 'новый диалог'.includes(query)
  const showThreads = !query || sectionHit || titles.toLowerCase().split('\n').some((title) => title.includes(query))
  const navigate = useNavigate()
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  const { setOpenMobile } = useSidebar()
  const creating = useAuiState((state) => state.threads.mainThreadId === state.threads.newThreadId)
  if (query && !showNew && !showThreads) return null

  function open() {
    setOpenMobile(false)
    if (pathname !== to) void navigate({ to })
  }

  return (
      <nav aria-label="Диалоги">
        <SidebarSection forceOpen={query.length > 0} label="Диалоги" storageKey="nora-sidebar-dialogs">
            <ThreadListPrimitive.Root>
              <SidebarMenu>
                {showNew ? (
                <SidebarMenuItem>
                  <SidebarMenuButton
                    disabled={disabled}
                    isActive={!disabled && pathname === to && creating}
                    render={(
                      <ThreadListPrimitive.New disabled={disabled} onClick={open} />
                    )}
                    className={
                      pathname === to
                        ? undefined
                        : 'data-active:!bg-transparent data-active:!text-[var(--nora-text-secondary)] data-active:[&_svg]:!text-[var(--nora-text-tertiary)] dark:data-active:[&_svg]:!text-[var(--nora-text-secondary)]'
                    }
                    tooltip="Новый диалог"
                  >
                    <PlusIcon />
                    <span className="truncate group-data-[collapsible=icon]:hidden">
                      Новый диалог
                    </span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                ) : null}
                <ThreadListPrimitive.Items>
                  {() => (
                    <DialogSidebarThread
                      disabled={disabled}
                      needle={sectionHit ? '' : query}
                      onOpen={open}
                      to={to}
                    />
                  )}
                </ThreadListPrimitive.Items>
              </SidebarMenu>
            </ThreadListPrimitive.Root>
        </SidebarSection>
      </nav>
  )
}
