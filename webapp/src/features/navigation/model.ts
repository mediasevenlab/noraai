import type { UserRole } from '@web-app-demo/contracts'

export type UserRoutePath =
  | '/app'
  | '/app/diary'
  | '/app/feed'
  | '/app/plan'
  | '/app/general'
  | '/app/plan/current'
  | '/app/onboarding'
  | '/app/profile'
  | '/app/settings'
  | '/app/referrals'
  | '/app/payments'
export type AdminRoutePath = '/admin' | '/admin/profile' | '/admin/users' | '/admin/settings'
export type MentorRoutePath =
  | '/mentor'
  | '/mentor/profile'
  | '/mentor/users'
  | '/mentor/settings'
  | '/mentor/payments'
  | '/mentor/plans'
  | '/mentor/feed'
export type WorkspaceRoutePath = UserRoutePath | AdminRoutePath | MentorRoutePath

export type WorkspaceNavigationItem = {
  label: string
  to: WorkspaceRoutePath
  /** Visible but not clickable until the feature is ready. */
  disabled?: boolean
}

/** Legacy diary/plan URLs fold into Общее, the only user nutrition surface. */
export function userSplitNutritionGeneralPath(pathname: string): string | null {
  if (pathname === '/app/diary' || pathname === '/app/diary/news') return '/app/general'
  if (pathname === '/app/plan') return '/app/general?view=plan'
  if (pathname === '/app/plan/current') return '/app/general?view=plan&planId=current'
  const detail = pathname.match(/^\/app\/plan\/([^/]+)$/)
  if (detail?.[1]) {
    return `/app/general?view=plan&planId=${encodeURIComponent(detail[1])}`
  }
  return null
}

/** Destinations rendered by dedicated content nav groups, not the account menu. */
const CONTENT_AREA_PATHS = new Set<WorkspaceRoutePath>([
  '/app/feed',
  '/app/general',
  '/mentor/plans',
  '/mentor/feed',
])

/** Home destinations that still belong in the account menu, not the top primary group. */
const FOOTER_HOME_PATHS = new Set<WorkspaceRoutePath>(['/admin/users'])

const navigationByRole = {
  user: [
    { label: 'Мой дневник', to: '/app/general' },
    { label: 'Лента', to: '/app/feed' },
    { label: 'Профиль', to: '/app/profile' },
    { label: 'Рефералы', to: '/app/referrals' },
    { label: 'Настройки', to: '/app/settings' },
    // Payments UI is demo-only for now — keep visible but inactive for every user.
    { label: 'Платежи', to: '/app/payments', disabled: true },
  ],
  admin: [
    { label: 'Профиль', to: '/admin/profile' },
    { label: 'Пользователи', to: '/admin/users' },
    { label: 'Настройки', to: '/admin/settings' },
  ],
  mentor: [
    { label: 'Рационы', to: '/mentor/plans' },
    { label: 'Лента', to: '/mentor/feed' },
    { label: 'Профиль', to: '/mentor/profile' },
    { label: 'Пользователи', to: '/mentor/users' },
    { label: 'Настройки', to: '/mentor/settings' },
    // Payments stay visible but inactive for mentors until billing ships.
    { label: 'Платежи', to: '/mentor/payments', disabled: true },
  ],
} as const satisfies Record<UserRole, ReadonlyArray<WorkspaceNavigationItem>>

export function navigationItemsForRole(role: UserRole): ReadonlyArray<WorkspaceNavigationItem> {
  return navigationByRole[role]
}

export function primaryNavigationItemsForRole(role: UserRole) {
  const homePath = homePathForRole(role)

  return navigationItemsForRole(role).filter((item) => {
    if (item.to !== homePath) return false
    // Content-area home (Общее) is owned by UserAppNavigation.
    if (CONTENT_AREA_PATHS.has(item.to)) return false
    // Admin users stay with profile/settings instead of sitting above demo/design.
    if (FOOTER_HOME_PATHS.has(item.to)) return false
    return true
  })
}

export function secondaryNavigationItemsForRole(role: UserRole) {
  const homePath = homePathForRole(role)

  return navigationItemsForRole(role).filter((item) => {
    if (item.to === homePath && !FOOTER_HOME_PATHS.has(item.to)) return false
    if (CONTENT_AREA_PATHS.has(item.to)) return false
    return true
  })
}

export function homePathForRole(role: UserRole): WorkspaceRoutePath {
  if (role === 'admin') return '/admin/users'
  if (role === 'mentor') return '/mentor/plans'
  return '/app/general'
}

export function userGeneralSearch(
  view: 'diary' | 'plan' = 'diary',
  planId?: string,
  library?: 'mine' | 'mentor' | 'catalog',
) {
  return {
    view,
    planId,
    library: view === 'plan' ? library : undefined,
  }
}

export function userFeedSearch(rationId?: string) {
  return { rationId }
}

/** Landing path after login/register, restricted to the current role's safe route set. */
export function postAuthPath(
  role: UserRole,
  returnTo?: string,
  questionnaireCompleted = true,
): string {
  if (role === 'user' && !questionnaireCompleted) {
    return '/app/onboarding'
  }
  return safeReturnPath(role, returnTo) ?? homePathForRole(role)
}

export function isUserPlanPath(pathname: string) {
  return pathname === '/app/plan' || pathname.startsWith('/app/plan/')
}

export function isMentorPlanPath(pathname: string) {
  return pathname === '/mentor/plans' || pathname.startsWith('/mentor/plans/')
}

export function isMentorFeedPath(pathname: string) {
  return pathname === '/mentor/feed'
}

export function navigationItemMatchingPath(role: UserRole, pathname: string) {
  const items = navigationItemsForRole(role)
  const exact = items.find((item) => item.to === pathname)
  if (exact) return exact
  if (
    role === 'user'
    && (
      isRetiredUserRationsPath(pathname)
      || isUserPlanPath(pathname)
      || pathname === '/app/diary'
      || pathname.startsWith('/app/diary/')
    )
  ) {
    return items.find((item) => item.to === '/app/general')
  }
  if (role === 'mentor' && isRetiredMentorRationsPath(pathname)) {
    return items.find((item) => item.to === '/mentor/plans')
  }
  if (role === 'mentor' && isMentorPlanPath(pathname)) {
    return items.find((item) => item.to === '/mentor/plans')
  }
  if (role === 'mentor' && (pathname === '/mentor/users' || pathname.startsWith('/mentor/users/'))) {
    return items.find((item) => item.to === '/mentor/users')
  }
  return undefined
}

function isRetiredUserRationsPath(pathname: string) {
  return pathname === '/app/rations' || pathname === '/app/mentor-rations' || pathname === '/app/my-rations'
}

function isRetiredMentorRationsPath(pathname: string) {
  return pathname === '/mentor/mentor-rations' || pathname === '/mentor/meal-plan'
}

export function resolveRoleDestination(
  role: UserRole,
  pathname: string,
): WorkspaceRoutePath {
  if (role === 'mentor' && (pathname === '/mentor' || isRetiredMentorRationsPath(pathname))) {
    return '/mentor/plans'
  }
  if (role === 'user' && isRetiredUserRationsPath(pathname)) {
    return '/app/general'
  }
  if (role === 'user' && userSplitNutritionGeneralPath(pathname)) {
    return '/app/general'
  }
  if (role === 'user' && pathname === '/app/saved') {
    return homePathForRole('user')
  }
  const match = navigationItemsForRole(role).find((item) => item.to === pathname)
  if (!match || match.disabled) return homePathForRole(role)
  return match.to
}

export function safeReturnPath(role: UserRole, value: string | undefined): string | null {
  if (!value || !value.startsWith('/') || value.startsWith('//')) return null

  let url: URL
  try {
    url = new URL(value, 'https://app.invalid')
  } catch {
    return null
  }
  if (url.origin !== 'https://app.invalid') return null

  if (role === 'user') {
    const folded = userSplitNutritionGeneralPath(url.pathname)
    if (folded) return folded
  }

  const known = navigationItemsForRole(role).find((item) => item.to === url.pathname)
  if (known && !known.disabled) return `${url.pathname}${url.search}`

  if (role === 'user' && isRetiredUserRationsPath(url.pathname)) {
    return '/app/general?view=plan'
  }

  if (role === 'mentor' && /^\/mentor\/plans\/[^/]+$/.test(url.pathname)) {
    return `${url.pathname}${url.search}`
  }

  if (role === 'user' && url.pathname === '/app/saved') {
    return homePathForRole('user')
  }

  if (role === 'mentor' && (url.pathname === '/mentor' || isRetiredMentorRationsPath(url.pathname))) {
    return '/mentor/plans'
  }

  // Legacy user home and diary feed still resolve to Общее.
  if (role === 'user' && (url.pathname === '/app' || url.pathname === '/app/diary/news')) {
    return homePathForRole('user')
  }

  if (role === 'user' && url.pathname === '/app/onboarding') {
    return '/app/onboarding'
  }


  // Admin design-system, components, blocks, stack, and steps live outside the primary nav list.
  // Retired demo URLs still resolve so old bookmarks land on admin home.
  if (role === 'admin' && /^\/admin\/demo\/[a-z0-9-]+$/.test(url.pathname)) {
    return homePathForRole('admin')
  }

  if (
    role === 'admin'
    && (
      url.pathname === '/admin'
      || /^\/admin\/ds\/[a-z0-9-]+$/.test(url.pathname)
      || url.pathname === '/admin/components'
      || /^\/admin\/components\/[a-z0-9-]+$/.test(url.pathname)
      || url.pathname === '/admin/blocks'
      || /^\/admin\/blocks\/[a-z0-9-]+$/.test(url.pathname)
      || url.pathname === '/admin/stack'
      || url.pathname === '/admin/steps'
    )
  ) {
    return `${url.pathname}${url.search}`
  }

  return null
}
