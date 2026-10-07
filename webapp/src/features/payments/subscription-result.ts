import type { SubscriptionPaymentStatus } from '@web-app-demo/contracts'

import type { BillingLedgerEntry, BillingLedgerStatus } from './card-store'
import { billingMonthKey } from './model'

export function chargeEntryFromStatus(
  status: SubscriptionPaymentStatus,
  at = new Date(),
): BillingLedgerEntry {
  return {
    id: status.paymentId,
    monthKey: billingMonthKey(at),
    amount: status.amountRub,
    status: chargeStatus(status),
    at: at.toISOString(),
    title: 'Подписка',
  }
}

export function upsertCharge(
  entries: readonly BillingLedgerEntry[],
  next: BillingLedgerEntry,
) {
  return [next, ...entries.filter((entry) => entry.id !== next.id)]
}

function chargeStatus(status: SubscriptionPaymentStatus): BillingLedgerStatus {
  if (status.paid || status.status === 'succeeded') return 'succeeded'
  if (status.status === 'canceled') return 'failed'
  return 'processing'
}
