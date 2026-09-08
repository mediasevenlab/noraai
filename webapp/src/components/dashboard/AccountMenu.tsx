import { LogOutIcon } from 'lucide-react'
import type { UserDto } from '@web-app-demo/contracts'
import { useState } from 'react'

import { noraProductMetaClass } from '@/components/nora/primitives'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import type { DashboardNavigationItem } from './NavMain'
import { DashboardLink } from './DashboardLink'

export function userInitials(user: UserDto) {
  return (user.displayName ?? user.email)
    .split(/\s+|@/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('')
}

export function useAccountLogout(
  onLogout: () => Promise<void>,
  onError?: () => void,
) {
  const [logoutError, setLogoutError] = useState(false)
  const [logoutPending, setLogoutPending] = useState(false)

  const logout = async () => {
    setLogoutError(false)
    setLogoutPending(true)
    try {
      await onLogout()
    } catch {
      setLogoutError(true)
      onError?.()
    } finally {
      setLogoutPending(false)
    }
  }

  return { logout, logoutError, logoutPending }
}

const accountMenuItemClass =
  'gap-2 rounded-[var(--nora-radius-menu-item,12px)] px-2.5 text-[13px] font-normal leading-5 text-[var(--nora-text-secondary)] data-highlighted:bg-[var(--nora-menu-item-hover)] data-highlighted:text-[var(--nora-text)]'

export function AccountMenuContent({
  logoutPending,
  onLogout,
  user,
  workspaceItems = [],
}: {
  logoutPending: boolean
  onLogout: () => void
  user: UserDto
  workspaceItems?: ReadonlyArray<DashboardNavigationItem>
}) {
  const displayName = user.displayName ?? user.email

  return (
    <>
      <DropdownMenuGroup>
        <DropdownMenuLabel className="p-0 font-normal">
          <div className="flex items-center gap-2.5 px-1 py-1.5 text-left">
            <Avatar className="size-8 rounded-lg after:rounded-lg">
              <AvatarFallback className="rounded-lg text-[12px] font-medium text-[var(--nora-text)]">
                {userInitials(user)}
              </AvatarFallback>
            </Avatar>
            <div className="grid min-w-0 flex-1 leading-tight">
              <span className="truncate font-[family-name:var(--nora-font)] text-[13px] font-medium text-[var(--nora-text)]">
                {displayName}
              </span>
              <span className={`truncate ${noraProductMetaClass}`}>{user.email}</span>
            </div>
          </div>
        </DropdownMenuLabel>
      </DropdownMenuGroup>
      {workspaceItems.length > 0 ? (
        <>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            {workspaceItems.map((item) =>
              item.disabled ? (
                <DropdownMenuItem
                  key={item.to}
                  className={accountMenuItemClass}
                  disabled
                >
                  <item.icon />
                  {item.label}
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem
                  key={item.to}
                  className={cn(
                    accountMenuItemClass,
                    item.isActive && 'bg-[var(--nora-menu-item-hover)] text-[var(--nora-text)]',
                  )}
                  render={<DashboardLink to={item.to} />}
                >
                  <item.icon />
                  {item.label}
                </DropdownMenuItem>
              ),
            )}
          </DropdownMenuGroup>
        </>
      ) : null}
      <DropdownMenuSeparator />
      <DropdownMenuItem
        className={`${accountMenuItemClass} text-[var(--nora-error)]`}
        disabled={logoutPending}
        onClick={onLogout}
        variant="destructive"
      >
        <LogOutIcon />
        {logoutPending ? 'Выходим…' : 'Выйти'}
      </DropdownMenuItem>
    </>
  )
}
