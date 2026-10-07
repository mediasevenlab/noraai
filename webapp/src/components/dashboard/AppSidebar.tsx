import type { UserDto } from '@web-app-demo/contracts'
import { useState, type ReactNode } from 'react'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarSeparator,
} from '@/components/ui/sidebar'
import type { WorkspaceRoutePath } from '@/features/navigation'
import { cn } from '@/lib/utils'
import { BrandMark } from './BrandMark'
import { DashboardLink } from './DashboardLink'
import { NavMain, type DashboardNavigationItem } from './NavMain'
import { NavUser, sidebarDockButtonClass } from './NavUser'
import {
  SidebarSearchField,
  SidebarSearchProvider,
  filterByQuery,
} from './SidebarSearch'

export function AppSidebar({
  additionalNavigation,
  footerExtra,
  filterNavigationBySearch = true,
  homePath,
  navigationLocked = false,
  primaryItems,
  primaryLabel,
  secondaryItems,
  onLogout,
  user,
  workspaceLabel,
}: {
  additionalNavigation?: ReactNode
  footerExtra?: ReactNode
  /** When false, search still reaches extra nav (e.g. mentees) but does not hide sections. */
  filterNavigationBySearch?: boolean
  homePath: WorkspaceRoutePath
  /** Greys out navigation until onboarding questionnaire is complete. */
  navigationLocked?: boolean
  onLogout: () => Promise<void>
  primaryItems: ReadonlyArray<DashboardNavigationItem>
  primaryLabel?: string
  secondaryItems: ReadonlyArray<DashboardNavigationItem>
  user: UserDto
  workspaceLabel: string
}) {
  const [query, setQuery] = useState('')
  const filteredPrimary = filterNavigationBySearch
    ? filterByQuery(primaryItems, query)
    : [...primaryItems]

  return (
    <Sidebar
      aria-disabled={navigationLocked || undefined}
      className={navigationLocked ? 'text-muted-foreground' : undefined}
      collapsible="icon"
    >
      {/*
        Nora header: px-2 + size-lg (p-2) → logo at 16px.
        Search stays below. Collapsed: size-8 centered on SidebarTrigger.
      */}
      <SidebarHeader className="h-14 justify-end gap-0 px-2 pt-2 pb-0 group-data-[collapsible=icon]:mt-2.5 group-data-[collapsible=icon]:h-8 group-data-[collapsible=icon]:items-center group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:p-0">
        <SidebarMenu>
          <SidebarMenuItem>
            {navigationLocked ? (
              <SidebarMenuButton
                aria-disabled
                className={cn(sidebarDockButtonClass, 'opacity-50')}
                disabled
                size="lg"
                tooltip="Nutrition"
              >
                <BrandMark className="opacity-60" />
                <div className="grid min-w-0 flex-1 text-left text-sm leading-tight group-data-[collapsible=icon]:hidden">
                  <span className="truncate font-[family-name:var(--nora-font)] font-medium text-foreground">Nutrition</span>
                  <span className="truncate font-light text-xs text-muted-foreground">
                    {workspaceLabel}
                  </span>
                </div>
              </SidebarMenuButton>
            ) : (
              <SidebarMenuButton
                className={sidebarDockButtonClass}
                render={<DashboardLink to={homePath} />}
                size="lg"
                tooltip="Nutrition"
              >
                <BrandMark />
                <div className="grid min-w-0 flex-1 text-left text-sm leading-tight group-data-[collapsible=icon]:hidden">
                  <span className="truncate font-[family-name:var(--nora-font)] font-medium text-foreground">Nutrition</span>
                  <span className="truncate font-light text-xs text-muted-foreground">
                    {workspaceLabel}
                  </span>
                </div>
              </SidebarMenuButton>
            )}
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      {/* Framer: hairlines above and below the search band. */}
      <div
        className={cn(
          'group-data-[collapsible=icon]:hidden',
          navigationLocked && 'pointer-events-none opacity-45',
        )}
      >
        <SidebarSeparator className="my-0" />
        <SidebarSearchField value={query} onChange={setQuery} />
        <SidebarSeparator className="my-0" />
      </div>

      <SidebarSearchProvider value={query}>
        <SidebarContent
          className={cn(
            // 12px above first section label — same as meal-card text inset (pt-3)
            'pt-3 group-data-[collapsible=icon]:pt-2',
            navigationLocked && 'pointer-events-none opacity-45',
          )}
        >
          {filteredPrimary.length > 0 ? (
            <NavMain items={filteredPrimary} label={primaryLabel} />
          ) : null}
          {additionalNavigation}
        </SidebarContent>
        {/*
          Footer dock. A visible relation card gets a hairline above and below.
          When the card renders nothing, only the line above the account row stays,
          at the same inset as that row.
        */}
        <SidebarFooter className="mt-auto gap-0 p-0 group-data-[collapsible=icon]:gap-2.5 group-data-[collapsible=icon]:pb-2.5">
          <SidebarSeparator className="my-0" />
          {footerExtra ? (
            <div className="group/footer-extra hidden has-[a]:block group-data-[collapsible=icon]:has-[a]:flex group-data-[collapsible=icon]:has-[a]:justify-center">
              <div
                className={cn(
                  'px-2 py-3',
                  'group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:py-0',
                  navigationLocked && 'pointer-events-none opacity-45',
                )}
              >
                {footerExtra}
              </div>
              <SidebarSeparator className="my-0" />
            </div>
          ) : null}
          <div
            className={cn(
              'px-2 py-3',
              'group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:pb-2.5 group-data-[collapsible=icon]:pt-0',
            )}
          >
            <NavUser
              onLogout={onLogout}
              user={user}
              workspaceItems={navigationLocked ? [] : secondaryItems}
            />
          </div>
        </SidebarFooter>
      </SidebarSearchProvider>
      <SidebarRail />
    </Sidebar>
  )
}
