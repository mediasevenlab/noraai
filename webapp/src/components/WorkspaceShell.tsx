import {
  CalendarRangeIcon,
  ClipboardListIcon,
  Columns2Icon,
  HomeIcon,
  ImagesIcon,
  LayoutGridIcon,
  NewspaperIcon,
  SettingsIcon,
  UserIcon,
  UsersIcon,
  WalletIcon,
} from '@/components/icons'
import { useLocation, useNavigate } from '@tanstack/react-router'
import type { UserDto } from '@web-app-demo/contracts'
import type { PropsWithChildren } from 'react'

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
  isMentorPlanPath,
  isUserPlanPath,
  navigationItemMatchingPath,
  navigationItemsForRole,
  primaryNavigationItemsForRole,
  secondaryNavigationItemsForRole,
  userGeneralSearch,
} from '@/features/navigation'
import {
  MentorMealPlanNavigation,
  MentorMenteeNavigation,
  MentorMenteesBanner,
} from '@/features/mentor'
import { UserAppNavigation, UserMentorBanner } from '@/features/users'
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
  '/app/feed': ImagesIcon,
  '/app/plan': CalendarRangeIcon,
  '/app/general': Columns2Icon,
  '/app/plan/current': CalendarRangeIcon,
  '/app/onboarding': ClipboardListIcon,
  '/app/profile': UserIcon,
  '/app/referrals': UsersIcon,
  '/app/settings': SettingsIcon,
  '/app/payments': WalletIcon,
  '/admin': UsersIcon,
  '/admin/profile': UserIcon,
  '/admin/users': UsersIcon,
  '/admin/settings': SettingsIcon,
  '/mentor': HomeIcon,
  '/mentor/plans': CalendarRangeIcon,
  '/mentor/profile': UserIcon,
  '/mentor/users': UsersIcon,
  '/mentor/settings': SettingsIcon,
  '/mentor/payments': WalletIcon,
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
  const pathname = useLocation({ select: (location) => location.pathname })
  const catalogOpen = useLocation({
    select: (location) =>
      location.pathname === '/app/general' &&
      (location.search as { library?: unknown }).library === 'catalog',
  })
  const navigate = useNavigate()
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
  const navigationLocked = user.role === 'user' && !user.questionnaireCompleted
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
      (item.to === '/app/general'
        ? pathname === '/app/general' || isUserPlanPath(pathname) || pathname.startsWith('/app/diary')
        : item.to === '/mentor/plans'
          ? isMentorPlanPath(pathname)
          : item.to === pathname),
  }))
  const primaryItems = toDashboardItems(primaryNavigationItemsForRole(user.role))
  const secondaryItems = toDashboardItems(secondaryNavigationItemsForRole(user.role))
  const mobileNavItems = [
    ...navigationItems
      .filter((item) => {
        if (item.to === '/app/payments' || item.to === '/mentor/payments') return false
        return true
      })
      .map((item) => ({
        active:
          !navigationLocked &&
          !item.disabled &&
          (item.to === '/app/general'
            ? !catalogOpen &&
              (pathname === '/app/general' ||
                isUserPlanPath(pathname) ||
                pathname.startsWith('/app/diary'))
            : item.to === '/mentor/plans'
              ? isMentorPlanPath(pathname)
              : item.to === pathname),
        disabled: item.disabled,
        icon: iconsByPath[item.to],
        label: item.label,
        to: item.to,
      })),
    ...(user.role === 'user' && !navigationLocked
      ? [
          {
            active: catalogOpen,
            icon: LayoutGridIcon,
            label: 'Каталог',
            onSelect: () => {
              void navigate({
                search: userGeneralSearch('plan', undefined, 'catalog'),
                to: '/app/general',
              })
            },
            to: '/app/general' as const,
          },
        ]
      : []),
  ]

  return (
    <SidebarProvider
      className="h-svh overflow-hidden"
      defaultOpen={getSidebarDefaultOpen()}
    >
      <AppSidebar
        additionalNavigation={
          user.role === 'admin'
            ? (
                <>
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
                    <SidebarSeparator />
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
          navigationLocked || !showSidebarPromoCards
            ? null
            : user.role === 'user'
              ? (
                  <UserMentorBanner />
                )
              : user.role === 'mentor'
                ? (
                    <MentorMenteesBanner />
                  )
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
        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-auto lg:[scrollbar-gutter:stable] max-md:[-ms-overflow-style:none] max-md:[scrollbar-width:none] max-md:[&::-webkit-scrollbar]:hidden">
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
