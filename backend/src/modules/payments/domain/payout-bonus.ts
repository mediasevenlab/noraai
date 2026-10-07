import { SUBSCRIPTION_PRICE_RUB, SUBSCRIPTION_YEAR_PRICE_RUB } from './subscription-payment'

/** One paid month of the user service is worth this much to the person who brought them. */
export const PAYOUT_BONUS_PER_MONTH_RUB = 200

export type PaidSubscription = {
  userId: string
  amountRub: number
  paidAt: string
}

export type PayoutAccrualKind = 'referral' | 'mentor'

export function paidCoverageMonths(amountRub: number) {
  return amountRub === SUBSCRIPTION_YEAR_PRICE_RUB ? 12 : 1
}

export function isSubscriptionAmount(amountRub: number) {
  return amountRub === SUBSCRIPTION_PRICE_RUB || amountRub === SUBSCRIPTION_YEAR_PRICE_RUB
}

/** The referrer is paid once, for the earliest confirmed payment. Later months add nothing. */
export function referralPayoutBonus(payments: readonly Pick<PaidSubscription, 'amountRub' | 'paidAt'>[]) {
  const first = [...payments].sort((left, right) => Date.parse(left.paidAt) - Date.parse(right.paidAt))[0]
  if (!first) return 0
  return PAYOUT_BONUS_PER_MONTH_RUB * paidCoverageMonths(first.amountRub)
}

/** The mentor is paid for every confirmed payment. A year is twelve monthly bonuses at once. */
export function mentorPayoutBonus(payments: readonly Pick<PaidSubscription, 'amountRub'>[]) {
  return payments.reduce(
    (sum, payment) => sum + PAYOUT_BONUS_PER_MONTH_RUB * paidCoverageMonths(payment.amountRub),
    0,
  )
}

export function payoutAccrual(
  kind: PayoutAccrualKind,
  linkedUserIds: readonly string[],
  payments: readonly PaidSubscription[],
) {
  const linked = new Set(linkedUserIds)
  const byUser = new Map<string, PaidSubscription[]>()
  for (const payment of payments) {
    if (!linked.has(payment.userId)) continue
    const rows = byUser.get(payment.userId) ?? []
    rows.push(payment)
    byUser.set(payment.userId, rows)
  }
  const score = kind === 'referral' ? referralPayoutBonus : mentorPayoutBonus
  const people = [...byUser.entries()].flatMap(([userId, rows]) => {
    const bonusRub = score(rows)
    return bonusRub > 0 ? [{ userId, bonusRub }] : []
  })
  return {
    accruedRub: people.reduce((sum, person) => sum + person.bonusRub, 0),
    people,
  }
}
