import { MessageCircleIcon, PlusIcon, XIcon } from '@/components/icons'
import { useNavigate, useRouterState } from '@tanstack/react-router'
import {
  ThreadListItemPrimitive,
  ThreadListPrimitive,
  useAuiState,
} from '@assistant-ui/react'

import { useSidebarSearchQuery } from '@/components/dashboard/SidebarSearch'
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
  useSidebar,
} from '@/components/ui/sidebar'

function DialogSidebarThread({
  disabled,
  onOpen,
}: {
  disabled: boolean
  onOpen: () => void
}) {
  const active = useAuiState((state) => state.threadListItem.id === state.threads.mainThreadId)
  return (
    <ThreadListItemPrimitive.Root>
      <SidebarMenuItem>
        <SidebarMenuButton
          disabled={disabled}
          isActive={active}
          render={(
            <ThreadListItemPrimitive.Trigger disabled={disabled} onClick={onOpen} />
          )}
          tooltip="Диалог"
        >
          <MessageCircleIcon />
          <span className="truncate group-data-[collapsible=icon]:hidden">
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
  const visible = !query || 'диалоги'.includes(query) || 'новый диалог'.includes(query)
  const navigate = useNavigate()
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  const { setOpenMobile } = useSidebar()
  const creating = useAuiState((state) => state.threads.mainThreadId === state.threads.newThreadId)
  if (!visible) return null

  function open() {
    setOpenMobile(false)
    if (pathname !== to) void navigate({ to })
  }

  return (
    <>
      <nav aria-label="Диалоги">
        <SidebarGroup>
          <SidebarGroupLabel>Диалоги</SidebarGroupLabel>
          <SidebarGroupContent>
            <ThreadListPrimitive.Root>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    disabled={disabled}
                    isActive={!disabled && pathname === to && creating}
                    render={(
                      <ThreadListPrimitive.New disabled={disabled} onClick={open} />
                    )}
                    tooltip="Новый диалог"
                  >
                    <PlusIcon />
                    <span className="truncate group-data-[collapsible=icon]:hidden">
                      Новый диалог
                    </span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <ThreadListPrimitive.Items>
                  {() => <DialogSidebarThread disabled={disabled} onOpen={open} />}
                </ThreadListPrimitive.Items>
              </SidebarMenu>
            </ThreadListPrimitive.Root>
          </SidebarGroupContent>
        </SidebarGroup>
      </nav>
      <SidebarSeparator />
    </>
  )
}
