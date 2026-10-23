import type { UserRole } from '@web-app-demo/contracts'

export type UserRoutePath =
  | '/app'
  | '/app/diary'
  | '/app/plan'
  | '/app/general'
  | '/app/plan/current'
  | '/app/onboarding'
  | '/app/profile'
  | '/app/settings'
  | '/app/referrals'
  | '/app/dialogs'
export type AdminRoutePath = '/admin' | '/admin/news' | '/admin/profile' | '/admin/users' | '/admin/settings'
export type MentorRoutePath =
  | '/mentor'
  | '/mentor/profile'
  | '/mentor/users'
  | '/mentor/settings'
  | '/mentor/plans'
  | '/mentor/dialogs'
export type WorkspaceRoutePath = UserRoutePath | AdminRoutePath | MentorRoutePath

export type WorkspaceNavigationItem = {
  label: string
  to: WorkspaceRoutePath
  /** Visible but not clickable until the feature is ready. */
  disabled?: boolean
}

/** Retired diary and ration URLs open dialogs. */
export function userSplitNutritionGeneralPath(pathname: string): string | null {
  if (
    pathname === '/app/general'
    || pathname === '/app/diary'
    || pathname === '/app/diary/news'
    || pathname === '/app/plan'
    || pathname === '/app/plan/current'
    || /^\/app\/plan\/[^/]+$/.test(pathname)
  ) {
    return '/app/dialogs'
  }
  return null
}

/** Destinations rendered by dedicated content nav groups, not the account menu. */
const CONTENT_AREA_PATHS = new Set<WorkspaceRoutePath>([
  '/app/dialogs',
  '/admin/news',
  '/mentor/dialogs',
])

/** Home destinations that still belong in the account menu, not the top primary group. */
const FOOTER_HOME_PATHS = new Set<WorkspaceRoutePath>(['/admin/users'])

const navigationByRole = {
  user: [
    { label: 'Диалоги', to: '/app/dialogs' },
    { label: 'Профиль', to: '/app/profile' },
    { label: 'Рефералы', to: '/app/referrals' },
    { label: 'Настройки', to: '/app/settings' },
  ],
  admin: [
    { label: 'Новости', to: '/admin/news' },
    { label: 'Профиль', to: '/admin/profile' },
    { label: 'Пользователи', to: '/admin/users' },
    { label: 'Настройки', to: '/admin/settings' },
  ],
  mentor: [
    { label: 'Диалоги', to: '/mentor/dialogs' },
    { label: 'Профиль', to: '/mentor/profile' },
    { label: 'Пользователи', to: '/mentor/users' },
    { label: 'Настройки', to: '/mentor/settings' },
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
    // Referrals stay in the product, but the account menu hides them for now.
    if (item.to === '/app/referrals') return false
    return true
  })
}

export function homePathForRole(role: UserRole): WorkspaceRoutePath {
  if (role === 'admin') return '/admin/users'
  if (role === 'mentor') return '/mentor/dialogs'
  return '/app/dialogs'
}

export function userGeneralSearch(
  view: 'diary' | 'plan' = 'diary',
  planId?: string,
  library?: 'mine' | 'mentor',
) {
  return {
    view,
    planId,
    library: view === 'plan' ? library : undefined,
  }
}

/** Landing path after login/register. User and mentor always open a new dialog. */
export function postAuthPath(
  role: UserRole,
  returnTo?: string,
  _questionnaireCompleted = true,
): string {
  if (role === 'user' || role === 'mentor') return homePathForRole(role)
  return safeReturnPath(role, returnTo) ?? homePathForRole(role)
}

export function isUserPlanPath(pathname: string) {
  return pathname === '/app/plan' || pathname.startsWith('/app/plan/')
}

export function isMentorPlanPath(pathname: string) {
  return pathname === '/mentor/plans' || pathname.startsWith('/mentor/plans/')
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
    return items.find((item) => item.to === '/app/dialogs')
  }
  if (role === 'mentor' && isRetiredMentorRationsPath(pathname)) {
    return items.find((item) => item.to === '/mentor/dialogs')
  }
  if (role === 'mentor' && isMentorPlanPath(pathname)) {
    return items.find((item) => item.to === '/mentor/dialogs')
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
  if (role === 'mentor' && (pathname === '/mentor' || isRetiredMentorRationsPath(pathname) || isMentorPlanPath(pathname))) {
    return '/mentor/dialogs'
  }
  if (role === 'user' && isRetiredUserRationsPath(pathname)) {
    return '/app/dialogs'
  }
  if (
    role === 'user'
    && (
      pathname === '/app/feed'
      || pathname === '/app/news'
      || pathname === '/app/payments'
      || userSplitNutritionGeneralPath(pathname)
    )
  ) {
    return '/app/dialogs'
  }
  if (
    role === 'mentor'
    && (pathname === '/mentor/feed' || pathname === '/mentor/news' || pathname === '/mentor/payments')
  ) {
    return '/mentor/dialogs'
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

  if (
    role === 'user'
    && (url.pathname === '/app/feed' || url.pathname === '/app/news' || url.pathname === '/app/payments')
  ) {
    return '/app/dialogs'
  }
  if (
    role === 'mentor'
    && (url.pathname === '/mentor/feed' || url.pathname === '/mentor/news' || url.pathname === '/mentor/payments')
  ) {
    return '/mentor/dialogs'
  }

  if (role === 'user') {
    const folded = userSplitNutritionGeneralPath(url.pathname)
    if (folded) return folded
  }

  const known = navigationItemsForRole(role).find((item) => item.to === url.pathname)
  if (known && !known.disabled) return `${url.pathname}${url.search}`

  if (role === 'user' && isRetiredUserRationsPath(url.pathname)) {
    return '/app/dialogs'
  }

  if (role === 'mentor' && isMentorPlanPath(url.pathname)) {
    return '/mentor/dialogs'
  }

  if (role === 'user' && url.pathname === '/app/saved') {
    return homePathForRole('user')
  }

  if (role === 'mentor' && (url.pathname === '/mentor' || isRetiredMentorRationsPath(url.pathname))) {
    return '/mentor/dialogs'
  }

  // Legacy user home and diary feed still resolve to Общее.
  if (role === 'user' && (url.pathname === '/app' || url.pathname === '/app/diary/news')) {
    return homePathForRole('user')
  }

  if (role === 'user' && url.pathname === '/app/onboarding') {
    return homePathForRole('user')
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
