import { expect, test } from 'bun:test'

import { chargeEntryFromStatus, upsertCharge } from '../src/features/payments/subscription-result'
import type { BillingLedgerEntry } from '../src/features/payments/card-store'

const paymentId = '23d93cac-000f-5000-8000-126628f15141'

test('a succeeded YooKassa payment becomes one subscription row', () => {
  const entry = chargeEntryFromStatus({
    paymentId,
    status: 'succeeded',
    paid: true,
    amountRub: 1000,
  }, new Date(2026, 9, 6, 12))

  expect(entry).toMatchObject({
    id: paymentId,
    amount: 1000,
    status: 'succeeded',
    title: 'Подписка',
    monthKey: '2026-10',
  })

  const previous: BillingLedgerEntry = { ...entry, status: 'processing' }
  expect(upsertCharge([previous], entry)).toEqual([entry])
})

test('a canceled payment is a failed charge', () => {
  expect(chargeEntryFromStatus({
    paymentId,
    status: 'canceled',
    paid: false,
    amountRub: 1000,
  }).status).toBe('failed')
})
