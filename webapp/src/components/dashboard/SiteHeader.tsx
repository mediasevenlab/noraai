import { MoonIcon, SunIcon } from 'lucide-react'
import { useTheme } from 'next-themes'
import type { UserDto } from '@web-app-demo/contracts'

import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Separator } from '@/components/ui/separator'
import { SidebarTrigger } from '@/components/ui/sidebar'
import {
  AccountMenuContent,
  useAccountLogout,
  userInitials,
} from './AccountMenu'
import type { DashboardNavigationItem } from './NavMain'
import { CardRadiusMenu } from './CardRadiusMenu'
import { CardShadowMenu } from './CardShadowMenu'
import { PlannedCoverBlurMenu } from './PlannedCoverBlurMenu'
import { PlannedCoverWashMenu } from './PlannedCoverWashMenu'
import { LightPaletteMenu } from './LightPaletteMenu'
import { ModalMotionMenu } from './ModalMotionMenu'
import { ModalOverlayMenu } from './ModalOverlayMenu'
import { SidebarPromoToggle } from './SidebarPromoToggle'

export function SiteHeader({
  crumbs,
  onLogout,
  title,
  user,
  workspaceItems = [],
}: {
  crumbs?: ReadonlyArray<string>
  onLogout: () => Promise<void>
  /** @deprecated Prefer `crumbs` for Nora-style breadcrumbs. */
  title?: string
  user: UserDto
  workspaceItems?: ReadonlyArray<DashboardNavigationItem>
}) {
  const { resolvedTheme, setTheme } = useTheme()
  const isDark = resolvedTheme === 'dark'
  const { logout, logoutPending } = useAccountLogout(onLogout)
  const breadcrumbCrumbs = crumbs?.length
    ? crumbs
    : title
      ? [title]
      : ['']
  const displayName = user.displayName ?? user.email

  return (
    <header className="sticky top-0 z-20 hidden h-14 shrink-0 items-center gap-2 border-b bg-background px-4 md:flex md:px-6">
      <SidebarTrigger className="-ml-1" />
      <Separator
        className="mr-2 data-[orientation=vertical]:h-4"
        orientation="vertical"
      />
      <nav
        aria-label="Breadcrumb"
        className="flex min-w-0 items-center gap-1.5 font-[family-name:var(--nora-font)] text-[13px] font-normal leading-5 text-[var(--nora-text-secondary)]"
      >
        {breadcrumbCrumbs.map((crumb, i) => {
          const last = i === breadcrumbCrumbs.length - 1
          return (
            <span key={`${crumb}-${i}`} className="flex items-center gap-1.5">
              {i > 0 ? (
                <span className="text-[var(--nora-text-tertiary)]">/</span>
              ) : null}
              <span
                className={last ? 'text-[var(--nora-text-secondary)]' : 'text-[var(--nora-text-tertiary)]'}
              >
                {crumb}
              </span>
            </span>
          )
        })}
      </nav>
      <div className="ml-auto flex items-center gap-2">
        {user.role === 'user' || user.role === 'mentor' ? <SidebarPromoToggle /> : null}
        <LightPaletteMenu />
        <ModalOverlayMenu />
        <ModalMotionMenu />
        <CardRadiusMenu />
        <CardShadowMenu />
        <PlannedCoverWashMenu />
        <PlannedCoverBlurMenu />
        <Button
          aria-label={isDark ? 'Переключить на светлую тему' : 'Переключить на тёмную тему'}
          className="size-7"
          onClick={() => setTheme(isDark ? 'light' : 'dark')}
          size="icon"
          type="button"
          variant="ghost"
        >
          {isDark ? (
            <SunIcon aria-hidden className="size-3.5" />
          ) : (
            <MoonIcon aria-hidden className="size-3.5" />
          )}
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                aria-label={`Меню аккаунта: ${displayName}`}
                className="size-7 rounded-full p-0"
                size="icon"
                type="button"
                variant="ghost"
              />
            }
          >
            <Avatar className="size-7">
              <AvatarFallback className="text-[10px]">
                {userInitials(user)}
              </AvatarFallback>
            </Avatar>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="account-workspace-menu min-w-56" sideOffset={8}>
            <AccountMenuContent
              logoutPending={logoutPending}
              onLogout={() => void logout()}
              user={user}
              workspaceItems={workspaceItems}
            />
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
