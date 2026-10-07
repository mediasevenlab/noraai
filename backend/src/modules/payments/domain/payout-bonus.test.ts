import { expect, test } from 'bun:test'

import { SUBSCRIPTION_PRICE_RUB, SUBSCRIPTION_YEAR_PRICE_RUB } from './subscription-payment'
import { mentorPayoutBonus, payoutAccrual, referralPayoutBonus } from './payout-bonus'

const month = (paidAt: string, userId = 'user-1') => ({
  userId,
  amountRub: SUBSCRIPTION_PRICE_RUB,
  paidAt,
})

test('a referrer is paid once for the first payment and a year is twelve months', () => {
  expect(referralPayoutBonus([])).toBe(0)
  expect(referralPayoutBonus([month('2026-10-01T00:00:00.000Z')])).toBe(200)
  expect(referralPayoutBonus([
    month('2026-11-01T00:00:00.000Z'),
    month('2026-10-01T00:00:00.000Z'),
  ])).toBe(200)
  expect(referralPayoutBonus([{
    amountRub: SUBSCRIPTION_YEAR_PRICE_RUB,
    paidAt: '2026-10-01T00:00:00.000Z',
  }])).toBe(2_400)
  expect(referralPayoutBonus([
    {
      amountRub: SUBSCRIPTION_YEAR_PRICE_RUB,
      paidAt: '2026-11-01T00:00:00.000Z',
    },
    month('2026-10-01T00:00:00.000Z'),
  ])).toBe(200)
})

test('a mentor is paid for every confirmed payment', () => {
  expect(mentorPayoutBonus([])).toBe(0)
  expect(mentorPayoutBonus([
    month('2026-10-01T00:00:00.000Z'),
    month('2026-11-01T00:00:00.000Z'),
  ])).toBe(400)
  expect(mentorPayoutBonus([{
    amountRub: SUBSCRIPTION_YEAR_PRICE_RUB,
  }])).toBe(2_400)
})

test('only linked people contribute, and unpaid people add nothing', () => {
  const payments = [
    month('2026-10-01T00:00:00.000Z', 'paid'),
    month('2026-11-01T00:00:00.000Z', 'paid'),
    month('2026-10-02T00:00:00.000Z', 'stranger'),
  ]
  expect(payoutAccrual('referral', ['paid', 'waiting'], payments)).toEqual({
    accruedRub: 200,
    people: [{ userId: 'paid', bonusRub: 200 }],
  })
  expect(payoutAccrual('mentor', ['paid', 'waiting'], payments)).toEqual({
    accruedRub: 400,
    people: [{ userId: 'paid', bonusRub: 400 }],
  })
})
