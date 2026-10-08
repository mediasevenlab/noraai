export type SubscriptionNotice = 'ending' | 'failed' | 'unpaid' | null

/**
 * Phone dock reminder. A countdown can be dismissed until the next local day.
 * Ended coverage or a failed charge stays until the user pays.
 */
export function subscriptionCapsuleVisible(input: {
  dismissedOn: string | null
  notice: SubscriptionNotice
  today: string
}) {
  if (input.notice === 'unpaid' || input.notice === 'failed') return true
  if (input.notice !== 'ending') return false
  return input.dismissedOn !== input.today
}

export function localDateKey(date: Date) {
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}

/** Account pages stay usable so a lapsed user can still pay, invite, and sign out. */
const OPEN_WITHOUT_SUBSCRIPTION = [
  '/app/payments',
  '/app/referrals',
  '/app/settings',
  '/app/profile',
  '/app/onboarding',
]

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
