import {
  BookmarkIcon,
  CalendarRangeIcon,
  ClipboardListIcon,
  Columns2Icon,
  FileTextIcon,
  HomeIcon,
  MessageCircleIcon,
  NewspaperIcon,
  SettingsIcon,
  UserIcon,
  UsersIcon,
} from '@/components/icons'
import { useLocation } from '@tanstack/react-router'
import type { UserDto } from '@web-app-demo/contracts'
import { useEffect, type PropsWithChildren } from 'react'

import { useDismissAppBootSplash } from '@/platform/app-boot-splash'

import {
  AppSidebar,
  type DashboardNavigationItem,
  MobileNavFab,
  SiteHeader,
} from '@/components/dashboard'
import { SidebarInset, SidebarProvider, SidebarSeparator } from '@/components/ui/sidebar'
import { useSidebarPromoCards } from '@/components/sidebar-promo-store'
import {
  homePathForRole,
  navigationItemMatchingPath,
  navigationItemsForRole,
  primaryNavigationItemsForRole,
  secondaryNavigationItemsForRole,
} from '@/features/navigation'
import {
  MentorMealPlanNavigation,
  MentorMenteeNavigation,
  MentorMenteesBanner,
} from '@/features/mentor'
import { AdminNewsNavigation } from '@/features/news'
import { UserAppNavigation } from '@/features/users'
import {
  AdminDesignSystemNavigation,
  DS_BASE_PATH,
  dsPageTitle,
} from '@/features/design-system'
import {
  AdminBlocksNavigation,
  BLOCKS_BASE_PATH,
  blockPageTitle,
} from '@/features/blocks'
import {
  AdminComponentsNavigation,
  COMP_BASE_PATH,
  componentPageTitle,
} from '@/features/components'
import {
  AdminStackNavigation,
  STACK_BASE_PATH,
} from '@/features/stack'
import { STEPS_BASE_PATH } from '@/features/steps'

const iconsByPath = {
  '/app': HomeIcon,
  '/app/diary': NewspaperIcon,
  '/app/dialogs': MessageCircleIcon,
  '/app/meetings': FileTextIcon,
  '/app/plan': CalendarRangeIcon,
  '/app/general': Columns2Icon,
  '/app/plan/current': CalendarRangeIcon,
  '/app/onboarding': ClipboardListIcon,
  '/app/profile': UserIcon,
  '/app/referrals': UsersIcon,
  '/app/settings': SettingsIcon,
  '/app/notes': BookmarkIcon,
  '/admin': UsersIcon,
  '/admin/news': NewspaperIcon,
  '/admin/profile': UserIcon,
  '/admin/users': UsersIcon,
  '/admin/settings': SettingsIcon,
  '/mentor': HomeIcon,
  '/mentor/plans': CalendarRangeIcon,
  '/mentor/dialogs': MessageCircleIcon,
  '/mentor/meetings': FileTextIcon,
  '/mentor/profile': UserIcon,
  '/mentor/users': UsersIcon,
  '/mentor/settings': SettingsIcon,
  '/mentor/notes': BookmarkIcon,
} as const

function getSidebarDefaultOpen() {
  const persistedState = document.cookie
    .split('; ')
    .find((entry) => entry.startsWith('sidebar_state='))
    ?.slice('sidebar_state='.length)

  return persistedState !== 'false'
}

export function WorkspaceShell({
  children,
  onLogout,
  user,
}: PropsWithChildren<{
  onLogout: () => Promise<void>
  user: UserDto
}>) {
  useDismissAppBootSplash()
  useEffect(() => {
    const root = document.documentElement
    root.dataset.appShell = ''
    let frame = 0
    const sync = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        const viewport = window.visualViewport
        const height = viewport?.height ?? window.innerHeight
        const offset = viewport?.offsetTop ?? 0
        root.style.setProperty('--app-vvh', `${Math.round(height)}px`)
        root.style.setProperty('--app-vvt', `${Math.round(offset)}px`)
      })
    }
    const release = () => {
      sync()
      const scroller = document.querySelector('[data-app-scroll]')
      if (!(scroller instanceof HTMLElement)) return
      const top = scroller.scrollTop
      scroller.scrollTop = top + 1
      scroller.scrollTop = top
    }
    const onVisible = () => {
      if (document.visibilityState === 'visible') release()
    }
    sync()
    window.visualViewport?.addEventListener('resize', sync)
    window.visualViewport?.addEventListener('scroll', sync)
    window.addEventListener('resize', sync)
    window.addEventListener('orientationchange', release)
    window.addEventListener('pageshow', release)
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      cancelAnimationFrame(frame)
      delete root.dataset.appShell
      root.style.removeProperty('--app-vvh')
      root.style.removeProperty('--app-vvt')
      window.visualViewport?.removeEventListener('resize', sync)
      window.visualViewport?.removeEventListener('scroll', sync)
      window.removeEventListener('resize', sync)
      window.removeEventListener('orientationchange', release)
      window.removeEventListener('pageshow', release)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [])
  const pathname = useLocation({ select: (location) => location.pathname })
  const showSidebarPromoCards = useSidebarPromoCards()
  const navigationItems = navigationItemsForRole(user.role)
  const activeItem = navigationItemMatchingPath(user.role, pathname)
  const headerCrumbs = pathname.startsWith(DS_BASE_PATH)
    ? [
        'Дизайн-система',
        dsPageTitle(pathname.slice(DS_BASE_PATH.length + 1)),
      ] as const
    : pathname === COMP_BASE_PATH
      ? (['Компоненты'] as const)
      : pathname.startsWith(`${COMP_BASE_PATH}/`)
        ? [
            'Компоненты',
            componentPageTitle(pathname.slice(COMP_BASE_PATH.length + 1)),
          ] as const
        : pathname === BLOCKS_BASE_PATH
          ? (['Блоки'] as const)
          : pathname.startsWith(`${BLOCKS_BASE_PATH}/`)
            ? [
                'Блоки',
                blockPageTitle(pathname.slice(BLOCKS_BASE_PATH.length + 1)),
              ] as const
            : pathname === STACK_BASE_PATH
              ? (['Стек'] as const)
              : pathname === STEPS_BASE_PATH
                ? (['Разработка'] as const)
                : ([activeItem?.label ?? 'Главная'] as const)
  const homePath = homePathForRole(user.role)
  const navigationLocked = false
  const toDashboardItems = (
    items: ReadonlyArray<{
      disabled?: boolean
      label: string
      to: typeof navigationItems[number]['to']
    }>,
  ): ReadonlyArray<DashboardNavigationItem> => items.map((item) => ({
    ...item,
    disabled: navigationLocked || item.disabled,
    icon: iconsByPath[item.to],
    isActive:
      !navigationLocked &&
      !item.disabled &&
      item.to === pathname,
  }))
  const primaryItems = toDashboardItems(primaryNavigationItemsForRole(user.role))
  const secondaryItems = toDashboardItems(secondaryNavigationItemsForRole(user.role))
  const mobileNavItems = [
    ...navigationItems
      .filter((item) => item.to !== '/app/referrals')
      .map((item) => ({
        active:
          !navigationLocked &&
          !item.disabled &&
          item.to === pathname,
        disabled: item.disabled,
        icon: iconsByPath[item.to],
        label: item.label,
        to: item.to,
      })),
  ]

  return (
    <SidebarProvider
      className="max-lg:fixed max-lg:inset-x-0 max-lg:top-[var(--app-vvt,0px)] !h-[var(--app-vvh,100dvh)] !max-h-[var(--app-vvh,100dvh)] !min-h-[var(--app-vvh,100dvh)] overflow-hidden"
      defaultOpen={getSidebarDefaultOpen()}
    >
      <AppSidebar
        additionalNavigation={
          user.role === 'admin'
            ? (
                <>
                  <AdminNewsNavigation />
                  <SidebarSeparator className="my-3" />
                  <AdminDesignSystemNavigation />
                  <SidebarSeparator className="my-3" />
                  <AdminComponentsNavigation />
                  <SidebarSeparator className="my-3" />
                  <AdminBlocksNavigation />
                  <SidebarSeparator className="my-3" />
                  <AdminStackNavigation />
                </>
              )
            : user.role === 'mentor'
              ? (
                  <>
                    <MentorMenteeNavigation />
                    <SidebarSeparator />
                    <MentorMealPlanNavigation />
                  </>
                )
              : (
                  <UserAppNavigation disabled={navigationLocked} />
                )
        }
        filterNavigationBySearch={user.role !== 'mentor'}
        footerExtra={
          !navigationLocked && user.role === 'mentor' && showSidebarPromoCards
            ? <MentorMenteesBanner />
            : null
        }
        homePath={homePath}
        navigationLocked={navigationLocked}
        onLogout={onLogout}
        primaryItems={primaryItems}
        primaryLabel={user.role === 'mentor' ? 'Обзор' : undefined}
        secondaryItems={secondaryItems}
        user={user}
        workspaceLabel={user.role === 'admin'
          ? 'Администратор'
          : user.role === 'mentor'
            ? 'Наставник'
            : 'Пользователь'}
      />
      <SidebarInset className="min-h-0 overflow-hidden">
        <SiteHeader
          crumbs={headerCrumbs}
          onLogout={onLogout}
          user={user}
          workspaceItems={navigationLocked ? [] : secondaryItems}
        />
        <div
          className="flex min-h-0 min-w-0 flex-1 flex-col overflow-auto overscroll-y-contain lg:[scrollbar-gutter:stable] max-md:[-ms-overflow-style:none] max-md:[scrollbar-width:none] max-md:[&::-webkit-scrollbar]:hidden"
          data-app-scroll=""
        >
          {children}
        </div>
        <MobileNavFab
          items={mobileNavItems}
          navigationLocked={navigationLocked}
          onLogout={onLogout}
          user={user}
          workspaceLabel={user.role === 'admin'
            ? 'Администратор'
            : user.role === 'mentor'
              ? 'Наставник'
              : 'Пользователь'}
        />
      </SidebarInset>
    </SidebarProvider>
  )
}
