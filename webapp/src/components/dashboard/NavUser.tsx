import { EllipsisVerticalIcon } from '@/components/icons'
import type { UserDto } from '@web-app-demo/contracts'

import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar'
import { Typography } from '@/components/typography'
import { cn } from '@/lib/utils'
import {
  AccountMenuContent,
  useAccountLogout,
  userInitials,
} from './AccountMenu'
import type { DashboardNavigationItem } from './NavMain'

/** Header and account row: the old hover fill at rest, one step darker on hover. */
export const sidebarDockButtonClass =
  '!bg-[var(--nora-row-hover)] hover:!bg-[var(--nora-row-active-bg)] active:!bg-[var(--nora-row-active-bg)] data-[state=open]:!bg-[var(--nora-row-active-bg)] dark:hover:!bg-[color-mix(in_srgb,var(--sidebar)_78%,black)] dark:active:!bg-[color-mix(in_srgb,var(--sidebar)_78%,black)] dark:data-[state=open]:!bg-[color-mix(in_srgb,var(--sidebar)_78%,black)]'

export function NavUser({
  onLogout,
  user,
  workspaceItems = [],
}: {
  onLogout: () => Promise<void>
  user: UserDto
  workspaceItems?: ReadonlyArray<DashboardNavigationItem>
}) {
  const { isMobile, setOpen } = useSidebar()
  const { logout, logoutError, logoutPending } = useAccountLogout(onLogout, () => {
    setOpen(true)
  })
  const displayName = user.displayName ?? user.email
  const initials = userInitials(user)

  return (
    <>
      {logoutError && (
        <Typography role="alert" variant="caption" tone="destructive">
          Не удалось выйти. Попробуйте ещё раз.
        </Typography>
      )}
      <SidebarMenu>
        <SidebarMenuItem>
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <SidebarMenuButton
                  aria-label="Открыть меню аккаунта"
                  className={cn(sidebarDockButtonClass, 'group-data-[collapsible=icon]:p-0!')}
                  size="lg"
                  tooltip={displayName}
                />
              }
            >
              {/*
                Wrap in div: SidebarMenuButton hides direct `span` children when
                collapsed, and Avatar root is a span — so the initials vanished.
              */}
              <div className="flex size-8 shrink-0 items-center justify-center">
                <Avatar className="size-8 rounded-lg after:rounded-lg">
                  <AvatarFallback className="rounded-lg text-[12px] font-semibold text-sidebar-foreground">
                    {initials}
                  </AvatarFallback>
                </Avatar>
              </div>
              <div className="grid min-w-0 flex-1 text-left text-sm leading-tight group-data-[collapsible=icon]:hidden">
                <span className="truncate font-[family-name:var(--nora-font)] font-medium text-foreground">
                  {displayName}
                </span>
                <span className="truncate font-light text-xs text-muted-foreground">
                  {user.email}
                </span>
              </div>
              <EllipsisVerticalIcon className="ml-auto size-3.5 text-[var(--nora-text-tertiary)] dark:text-[var(--nora-text-secondary)] group-data-[collapsible=icon]:hidden" />
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="account-workspace-menu min-w-56"
              side={isMobile ? 'bottom' : 'right'}
              sideOffset={8}
            >
              <AccountMenuContent
                logoutPending={logoutPending}
                onLogout={() => void logout()}
                user={user}
                workspaceItems={workspaceItems}
              />
            </DropdownMenuContent>
          </DropdownMenu>
        </SidebarMenuItem>
      </SidebarMenu>
    </>
  )
}
