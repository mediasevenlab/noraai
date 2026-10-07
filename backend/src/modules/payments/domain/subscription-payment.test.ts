import { expect, test } from 'bun:test'

import {
  SUBSCRIPTION_PAYMENT_DESCRIPTION,
  SUBSCRIPTION_PRICE_RUB,
  SUBSCRIPTION_YEAR_PRICE_RUB,
  subscriptionOverview,
  subscriptionStacksCoverage,
  subscriptionPaymentBody,
  subscriptionRenewalBody,
  type SubscriptionPaymentFact,
} from './subscription-payment'

const userId = '019fa776-2829-731a-82e0-e65e63d2f0f5'

test('a subscription payment opens the YooKassa card page and saves it for the next month', () => {
  const body = subscriptionPaymentBody({
    email: 'user@nora.com',
    period: 'month',
    returnUrl: 'http://localhost:5173/app/payments',
    userId,
  })

  expect(body.amount).toEqual({ value: '1000.00', currency: 'RUB' })
  expect(body.save_payment_method).toBe(true)
  expect(body.payment_method_data).toEqual({ type: 'bank_card' })
  expect(body.payment_method_data).not.toHaveProperty('card')
  expect(body.description).toBe(SUBSCRIPTION_PAYMENT_DESCRIPTION)
  expect(body.confirmation).toEqual({
    type: 'redirect',
    return_url: 'http://localhost:5173/app/payments',
  })
  expect(body.metadata).toEqual({ userId })
  expect(JSON.stringify(body)).not.toContain('5555')
  expect(body.receipt.customer.email).toBe('user@nora.com')
  expect(body.receipt.items[0]?.amount.value).toBe(`${SUBSCRIPTION_PRICE_RUB}.00`)
})

test('a year is twelve months at 20% off and renews at that price', () => {
  const body = subscriptionPaymentBody({
    email: 'user@nora.com',
    period: 'year',
    returnUrl: 'http://localhost:5173/app/payments',
    userId,
  })
  expect(body.amount.value).toBe(`${SUBSCRIPTION_YEAR_PRICE_RUB}.00`)
  expect(body.description).toContain('раз в год')
  expect(body.receipt.customer.email).toBe('user@nora.com')

  const view = subscriptionOverview({
    autopayEnabled: true,
    now: new Date('2026-10-20T12:00:00.000Z'),
    userId,
    payments: [fact({ amountRub: SUBSCRIPTION_YEAR_PRICE_RUB })],
  })
  expect(view.paidUntil).toBe('2027-10-06T09:00:00.000Z')
  expect(view.renewalAmountRub).toBe(SUBSCRIPTION_YEAR_PRICE_RUB)
})

test('cancelling drops coverage but keeps the charge in history', () => {
  const view = subscriptionOverview({
    autopayEnabled: false,
    cancelledAt: new Date('2026-10-06T12:00:00.000Z'),
    now: new Date('2026-10-06T12:05:00.000Z'),
    userId,
    payments: [fact({})],
  })
  expect(view.charges).toHaveLength(1)
  expect(view.paidUntil).toBeNull()
  expect(view.autopay).toBe(false)
})

test('a renewal charges the saved card without asking for it again', () => {
  const body = subscriptionRenewalBody({
    amountRub: 1000,
    email: 'user@nora.com',
    paymentMethodId: 'method-1',
    userId,
  })
  expect(body.payment_method_id).toBe('method-1')
  expect(body).not.toHaveProperty('payment_method_data')
  expect(body).not.toHaveProperty('confirmation')
  expect(JSON.stringify(body)).not.toContain('5555')
})

function fact(overrides: Partial<SubscriptionPaymentFact>): SubscriptionPaymentFact {
  return {
    id: '23d93cac-000f-5000-8000-126628f15141',
    status: 'succeeded',
    paid: true,
    amountRub: 1000,
    createdAt: '2026-10-06T09:00:00.000Z',
    confirmationUrl: null,
    userId,
    paymentMethodId: 'method-1',
    paymentMethodSaved: true,
    savesPaymentMethod: true,
    cardLast4: '4477',
    ...overrides,
  }
}

test('an open payment is continued and a saved card schedules the next month', () => {
  const now = new Date('2026-10-06T12:00:00.000Z')
  const view = subscriptionOverview({
    autopayEnabled: true,
    now,
    userId,
    payments: [
      fact({
        id: '3256f12f-000f-5000-b000-1809831ee84d',
        status: 'pending',
        paid: false,
        createdAt: '2026-10-06T11:30:00.000Z',
        confirmationUrl: 'https://yoomoney.ru/checkout/payments/v2/contract/bankcard',
        paymentMethodSaved: false,
        savesPaymentMethod: true,
        paymentMethodId: null,
        cardLast4: null,
      }),
      fact({ userId: 'someone-else' }),
    ],
  })

  expect(view.charges).toHaveLength(1)
  expect(view.confirmationUrl).toBe('https://yoomoney.ru/checkout/payments/v2/contract/bankcard')
  expect(view.paidUntil).toBeNull()
})

test('a paid month keeps the saved card and names the next charge', () => {
  const view = subscriptionOverview({
    autopayEnabled: true,
    now: new Date('2026-10-20T12:00:00.000Z'),
    userId,
    payments: [fact({})],
  })

  expect(view.paidUntil).toBe('2026-11-06T09:00:00.000Z')
  expect(view.nextChargeAt).toBe(view.paidUntil)
  expect(view.autopay).toBe(true)
  expect(view.cardLast4).toBe('4477')
  expect(view.confirmationUrl).toBeNull()
})

test('turning autopay off keeps the paid month and drops the next charge', () => {
  const view = subscriptionOverview({
    autopayEnabled: false,
    now: new Date('2026-10-20T12:00:00.000Z'),
    userId,
    payments: [fact({})],
  })

  expect(view.paidUntil).toBe('2026-11-06T09:00:00.000Z')
  expect(view.nextChargeAt).toBeNull()
  expect(view.autopay).toBe(false)
  expect(view.canAutopay).toBe(true)
})

test('a pending payment that still lets the payer opt out is not continued', () => {
  const view = subscriptionOverview({
    autopayEnabled: true,
    now: new Date('2026-10-06T12:00:00.000Z'),
    userId,
    payments: [
      fact({
        status: 'pending',
        paid: false,
        createdAt: '2026-10-06T11:30:00.000Z',
        confirmationUrl: 'https://yoomoney.ru/checkout/test',
        paymentMethodSaved: false,
        savesPaymentMethod: false,
      }),
    ],
  })

  expect(view.confirmationUrl).toBeNull()
  expect(view.pendingPaymentId).toBeNull()
  expect(view.charges[0]?.status).toBe('pending')
})

test('a pending payment older than an hour is no longer continued', () => {
  const view = subscriptionOverview({
    autopayEnabled: true,
    now: new Date('2026-10-06T13:30:00.000Z'),
    userId,
    payments: [
      fact({
        status: 'pending',
        paid: false,
        createdAt: '2026-10-06T11:30:00.000Z',
        confirmationUrl: 'https://yoomoney.ru/checkout/test',
        paymentMethodSaved: false,
      }),
    ],
  })

  expect(view.confirmationUrl).toBeNull()
  expect(view.pendingPaymentId).toBeNull()
  expect(view.charges[0]?.status).toBe('pending')
})

test('an early payment keeps the days still left on the current period', () => {
  const view = subscriptionOverview({
    autopayEnabled: false,
    now: new Date('2026-11-04T09:00:00.000Z'),
    userId,
    payments: [
      fact({ id: '3256f12f-000f-5000-b000-1809831ee84d', createdAt: '2026-11-03T09:00:00.000Z' }),
      fact({}),
    ],
  })

  expect(view.paidUntil).toBe('2026-12-06T09:00:00.000Z')
  expect(view.renewalNotice).toBeNull()
  expect(view.daysLeft).toBeNull()
})

test('a payment a few days after the end starts a fresh period', () => {
  const view = subscriptionOverview({
    autopayEnabled: false,
    now: new Date('2026-11-09T12:00:00.000Z'),
    userId,
    payments: [
      fact({ id: '3256f12f-000f-5000-b000-1809831ee84d', createdAt: '2026-11-09T09:00:00.000Z' }),
      fact({}),
    ],
  })

  expect(view.paidUntil).toBe('2026-12-09T09:00:00.000Z')
})

test('a charge within a day after the end still continues that period', () => {
  const view = subscriptionOverview({
    autopayEnabled: true,
    now: new Date('2026-11-06T12:00:00.000Z'),
    userId,
    payments: [
      fact({ id: '3256f12f-000f-5000-b000-1809831ee84d', createdAt: '2026-11-06T10:00:00.000Z' }),
      fact({}),
    ],
  })

  expect(view.paidUntil).toBe('2026-12-06T09:00:00.000Z')
  expect(view.renewalNotice).toBeNull()
})

test('autopay off shows a three-day countdown and still counts as paid', () => {
  const view = subscriptionOverview({
    autopayEnabled: false,
    now: new Date('2026-11-04T09:00:00.000Z'),
    userId,
    payments: [fact({})],
  })

  expect(view.paidUntil).toBe('2026-11-06T09:00:00.000Z')
  expect(view.renewalNotice).toBe('ending')
  expect(view.daysLeft).toBe(2)
})

test('the countdown stays hidden until three days remain and while autopay is on', () => {
  const early = subscriptionOverview({
    autopayEnabled: false,
    now: new Date('2026-11-03T08:00:00.000Z'),
    userId,
    payments: [fact({})],
  })
  const autopay = subscriptionOverview({
    autopayEnabled: true,
    now: new Date('2026-11-04T09:00:00.000Z'),
    userId,
    payments: [fact({})],
  })

  expect(early.renewalNotice).toBeNull()
  expect(early.paidUntil).toBe('2026-11-06T09:00:00.000Z')
  expect(autopay.renewalNotice).toBeNull()
  expect(autopay.daysLeft).toBeNull()
})

test('a declined renewal is the only reason to warn someone with autopay', () => {
  const declined = subscriptionOverview({
    autopayEnabled: true,
    now: new Date('2026-11-07T09:00:00.000Z'),
    userId,
    payments: [
      fact({
        id: '3256f12f-000f-5000-b000-1809831ee84d',
        status: 'canceled',
        paid: false,
        createdAt: '2026-11-06T10:00:00.000Z',
        paymentMethodSaved: false,
      }),
      fact({}),
    ],
  })
  const waiting = subscriptionOverview({
    autopayEnabled: true,
    now: new Date('2026-11-07T09:00:00.000Z'),
    userId,
    payments: [
      fact({
        id: '3256f12f-000f-5000-b000-1809831ee84d',
        status: 'pending',
        paid: false,
        createdAt: '2026-11-06T10:00:00.000Z',
        paymentMethodSaved: false,
      }),
      fact({}),
    ],
  })
  const notTried = subscriptionOverview({
    autopayEnabled: true,
    now: new Date('2026-11-07T09:00:00.000Z'),
    userId,
    payments: [fact({})],
  })

  expect(declined.paidUntil).toBeNull()
  expect(declined.renewalNotice).toBe('failed')
  expect(waiting.renewalNotice).toBeNull()
  expect(waiting.paidUntil).toBeNull()
  expect(notTried.renewalNotice).toBeNull()
})

test('without autopay an ended period asks to pay again', () => {
  const view = subscriptionOverview({
    autopayEnabled: false,
    now: new Date('2026-11-07T09:00:00.000Z'),
    userId,
    payments: [fact({})],
  })

  expect(view.paidUntil).toBeNull()
  expect(view.renewalNotice).toBe('unpaid')
  expect(view.daysLeft).toBeNull()
})

test('the test shop keeps only the latest payment and a live shop stacks them', () => {
  const payments = [
    fact({ id: '3256f12f-000f-5000-b000-1809831ee84d', createdAt: '2026-11-03T09:00:00.000Z' }),
    fact({}),
  ]
  const testShop = subscriptionOverview({
    autopayEnabled: false,
    now: new Date('2026-11-04T09:00:00.000Z'),
    payments,
    stackCoverage: false,
    userId,
  })
  expect(subscriptionStacksCoverage('test_secret')).toBe(false)
  expect(subscriptionStacksCoverage('live_secret')).toBe(true)
  expect(testShop.paidUntil).toBe('2026-12-03T09:00:00.000Z')
})
