import { ChevronRightIcon, UserIcon, UsersIcon } from '@/components/icons'
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
import { cn } from '@/lib/utils'
import {
  formatMentorUnreadBadge,
  MENTEE_UNREAD_BADGE_CLASS,
} from './unread-badge'
import { useMentorUnreadByUserId } from './use-mentor-unread-counts'
import { useMentorUsersQuery } from './queries'

const OPEN_KEY = 'nutrition-mentor-users-nav-open'

export function filterMentorUsersByQuery<
  T extends {
    displayName?: string | null
    nickname?: string | null
    email: string
  },
>(users: readonly T[], query: string): T[] {
  const q = query.trim().toLowerCase()
  if (!q) return [...users]
  return users.filter((user) =>
    [user.displayName, user.nickname, user.email].some((part) =>
      part?.toLowerCase().includes(q),
    ),
  )
}


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

export function MentorMenteeNavigation() {
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  const { setOpenMobile, state } = useSidebar()
  const iconCollapsed = state === 'collapsed'
  const users = useMentorUsersQuery({
    page: 1,
    pageSize: 100,
  })
  const unreadByUserId = useMentorUnreadByUserId()
  const searchQuery = useSidebarSearchQuery()
  const searching = searchQuery.trim().length > 0
  const mentees = useMemo(
    () => filterMentorUsersByQuery(users.data?.items ?? [], searchQuery),
    [searchQuery, users.data?.items],
  )
  const onMentees = pathname.startsWith('/mentor/users/')
  const [open, setOpen] = useState(() => readOpen(true))
  const wasOnGroup = useRef(onMentees)

  useEffect(() => {
    if (onMentees && !wasOnGroup.current) setOpen(true)
    wasOnGroup.current = onMentees
  }, [onMentees])

  useEffect(() => {
    try {
      localStorage.setItem(OPEN_KEY, String(open))
    } catch {
      // ignore
    }
  }, [open])

  const menu = (
    <SidebarMenu className="gap-px">
      {users.isPending && (
        <SidebarMenuItem>
          <SidebarMenuButton disabled>
            <span className="truncate text-muted-foreground">Загрузка…</span>
          </SidebarMenuButton>
        </SidebarMenuItem>
      )}
      {users.data && mentees.length === 0 ? (
        <SidebarMenuItem>
          <SidebarMenuButton disabled>
            <span className="truncate text-muted-foreground">
              {searching ? 'Никого не найдено' : 'Пока нет пользователей'}
            </span>
          </SidebarMenuButton>
        </SidebarMenuItem>
      ) : null}
      {mentees.map((user) => {
        const label = user.displayName ?? user.nickname ?? user.email
        const href = `/mentor/users/${user.id}`
        const active = pathname === href
        const unreadLabel = formatMentorUnreadBadge(unreadByUserId.get(user.id) ?? 0)
        return (
          <SidebarMenuItem key={user.id}>
            <SidebarMenuButton
              isActive={active}
              render={(
                <Link
                  onClick={() => setOpenMobile(false)}
                  params={{ userId: user.id }}
                  search={{ view: 'diary' }}
                  to="/mentor/users/$userId"
                />
              )}
              tooltip={label}
              className={cn(
                active && 'font-medium',
              )}
            >
              <UserIcon
                aria-hidden
                className="size-3.5 shrink-0"
              />
              <span className="min-w-0 flex-1 truncate group-data-[collapsible=icon]:hidden">
                {label}
              </span>
              {unreadLabel ? (
                <span
                  aria-label={`${unreadLabel} непрочитанных приёмов`}
                  className={cn(MENTEE_UNREAD_BADGE_CLASS, 'group-data-[collapsible=icon]:hidden')}
                >
                  {unreadLabel}
                </span>
              ) : null}
            </SidebarMenuButton>
          </SidebarMenuItem>
        )
      })}
    </SidebarMenu>
  )

  if (iconCollapsed) {
    const usersActive = pathname === '/mentor/users' || onMentees
    return (
      <nav aria-label="Пользователи наставника">
        <SidebarGroup className="py-0">
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  isActive={usersActive}
                  render={(
                    <Link
                      onClick={() => setOpenMobile(false)}
                      to="/mentor/users"
                    />
                  )}
                  tooltip="Пользователи"
                >
                  <UsersIcon className="size-3.5 shrink-0" />
                  <span className="truncate group-data-[collapsible=icon]:hidden">
                    Пользователи
                  </span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </nav>
    )
  }

  return (
    <nav aria-label="Пользователи наставника">
      <Collapsible
        className="group/collapsible -mt-1"
        open={searching || open}
        onOpenChange={(next) => {
          if (!searching) setOpen(next)
        }}
      >
        <SidebarGroup>
          <SidebarGroupLabel
            className="w-full cursor-pointer justify-between gap-2"
            render={<CollapsibleTrigger />}
          >
            <span className="min-w-0 flex-1 truncate text-left">Пользователи</span>
            <ChevronRightIcon
              className={cn(
                'size-3.5 shrink-0 text-[var(--nora-text-tertiary)] transition-transform',
                open && 'rotate-90',
              )}
            />
          </SidebarGroupLabel>
          <CollapsibleContent>
            <SidebarGroupContent>{menu}</SidebarGroupContent>
          </CollapsibleContent>
        </SidebarGroup>
      </Collapsible>
    </nav>
  )
}
