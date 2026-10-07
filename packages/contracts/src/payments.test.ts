import { expect, test } from 'bun:test'

import { subscriptionPaymentRequestSchema, subscriptionPaymentResponseSchema, subscriptionPaymentStatusSchema } from './payments'

test('subscription payment contracts keep the redirect and refuse a card', () => {
  expect(subscriptionPaymentRequestSchema.safeParse({ period: 'month' }).success).toBe(true)
  expect(subscriptionPaymentRequestSchema.safeParse({ period: 'year' }).success).toBe(true)
  expect(subscriptionPaymentRequestSchema.safeParse({}).success).toBe(false)
  expect(subscriptionPaymentRequestSchema.safeParse({
    cardNumber: '5555555555554477',
    cvc: '213',
  }).success).toBe(false)

  expect(subscriptionPaymentResponseSchema.parse({
    paymentId: '23d93cac-000f-5000-8000-126628f15141',
    status: 'pending',
    paid: false,
    amountRub: 1000,
    confirmationUrl: 'https://yoomoney.ru/checkout/payments/v2/contract?orderId=23d93cac-000f-5000-8000-126628f15141',
  }).paymentId).toBe('23d93cac-000f-5000-8000-126628f15141')

  expect(subscriptionPaymentStatusSchema.parse({
    paymentId: '23d93cac-000f-5000-8000-126628f15141',
    status: 'succeeded',
    paid: true,
    amountRub: 1000,
  }).paid).toBe(true)
})
