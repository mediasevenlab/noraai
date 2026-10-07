/** Account pages stay usable so a lapsed user can still pay and sign out. */
const OPEN_WITHOUT_SUBSCRIPTION = ['/app/payments', '/app/settings', '/app/profile', '/app/onboarding']

export function subscriptionFreezeActive(input: {
  overview: { renewalNotice: 'ending' | 'failed' | 'unpaid' | null } | null
  pathname: string
  role: string
}) {
  if (input.role !== 'user') return false
  const notice = input.overview?.renewalNotice
  if (notice !== 'unpaid' && notice !== 'failed') return false
  return !OPEN_WITHOUT_SUBSCRIPTION.some((path) => input.pathname === path || input.pathname.startsWith(`${path}/`))
}
