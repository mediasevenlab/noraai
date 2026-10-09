import { expect, test } from 'bun:test'

import { SUBSCRIPTION_PAYMENT_DESCRIPTION } from '../domain/subscription-payment'
import { createYooKassaGateway } from './yookassa-client'

const paymentId = '23d93cac-000f-5000-8000-126628f15141'

test('the shop is off until both YooKassa values are set', () => {
  expect(createYooKassaGateway({ shopId: undefined, secretKey: 'test_secret' })).toBeNull()
  expect(createYooKassaGateway({ shopId: '1344641', secretKey: undefined })).toBeNull()
})

test('creating a payment asks YooKassa for its card page and sends the receipt', async () => {
  const original = globalThis.fetch
  let authorization = ''
  let idempotence = ''
  let body = ''
  globalThis.fetch = (async (_url, init) => {
    const headers = new Headers(init?.headers)
    authorization = headers.get('authorization') ?? ''
    idempotence = headers.get('idempotence-key') ?? ''
    body = String(init?.body ?? '')
    return new Response(JSON.stringify({
      id: paymentId,
      status: 'pending',
      paid: false,
      amount: { value: '1000.00', currency: 'RUB' },
      confirmation: { confirmation_url: 'https://yoomoney.ru/checkout/test' },
      metadata: { userId: 'user-1' },
      save_payment_method: true,
    }), { status: 200 })
  }) as typeof fetch

  try {
    const gateway = createYooKassaGateway({ shopId: '1344641', secretKey: 'test_secret' })
    const payment = await gateway!.createSubscriptionPayment({
      email: 'user@nora.com',
      idempotenceKey: 'key-1',
      period: 'month',
      returnUrl: 'http://localhost:5173/app/payments',
      userId: 'user-1',
    })
    expect(payment.confirmationUrl).toBe('https://yoomoney.ru/checkout/test')
    expect(payment.savesPaymentMethod).toBe(true)
    expect(body).toContain(SUBSCRIPTION_PAYMENT_DESCRIPTION)
    expect(authorization).toBe(`Basic ${btoa('1344641:test_secret')}`)
    expect(idempotence).toBe('key-1')
    expect(body).toContain('"payment_method_data":{"type":"bank_card"}')
    expect(body).toContain('"save_payment_method":true')
    expect(body).not.toContain('"number"')
    expect(body).toContain('"email":"user@nora.com"')
    expect(body).toContain('"vat_code":1')
  } finally {
    globalThis.fetch = original
  }
})

test('a timed-out payment is requested again with the same idempotence key', async () => {
  const original = globalThis.fetch
  const keys: Array<string | null> = []
  let calls = 0
  globalThis.fetch = (async (_url, init) => {
    calls += 1
    keys.push(new Headers(init?.headers).get('idempotence-key'))
    if (calls === 1) throw new DOMException('The operation timed out.', 'TimeoutError')
    return new Response(JSON.stringify({
      id: paymentId,
      status: 'pending',
      paid: false,
      amount: { value: '1000.00', currency: 'RUB' },
      confirmation: { confirmation_url: 'https://yoomoney.ru/checkout/test' },
      metadata: { userId: 'user-1' },
    }), { status: 200 })
  }) as typeof fetch

  try {
    const gateway = createYooKassaGateway({ shopId: '1344641', secretKey: 'test_secret' })
    const payment = await gateway!.createSubscriptionPayment({
      email: 'user@nora.com',
      idempotenceKey: 'key-1',
      period: 'month',
      returnUrl: 'http://localhost:5173/app/payments',
      userId: 'user-1',
    })
    expect(calls).toBe(2)
    expect(keys).toEqual(['key-1', 'key-1'])
    expect(payment.confirmationUrl).toBe('https://yoomoney.ru/checkout/test')
  } finally {
    globalThis.fetch = original
  }
})

test('a payment is saved for later charges when its description is the monthly one', async () => {
  const original = globalThis.fetch
  globalThis.fetch = (async () => new Response(JSON.stringify({
    id: paymentId,
    status: 'pending',
    paid: false,
    amount: { value: '1000.00', currency: 'RUB' },
    description: SUBSCRIPTION_PAYMENT_DESCRIPTION,
    confirmation: { confirmation_url: 'https://yoomoney.ru/checkout/test' },
    metadata: { userId: 'user-1' },
  }), { status: 200 })) as typeof fetch

  try {
    const gateway = createYooKassaGateway({ shopId: '1344641', secretKey: 'test_secret' })
    const payment = await gateway!.getPayment(paymentId)
    expect(payment.savesPaymentMethod).toBe(true)
  } finally {
    globalThis.fetch = original
  }
})
