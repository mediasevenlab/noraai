import { expect, test } from 'bun:test'

import { PaymentsFailure } from '../domain/errors'
import type { SubscriptionRecord, SubscriptionStore, YooKassaGateway, YooKassaPayment } from './ports'
import { PaymentsService } from './payments-service'

const userId = '019fa776-2829-731a-82e0-e65e63d2f0f5'
const paymentId = '23d93cac-000f-5000-8000-126628f15141'

function payment(overrides: Partial<YooKassaPayment> = {}): YooKassaPayment {
  return {
    id: paymentId,
    status: 'pending',
    paid: false,
    amountRub: 1000,
    createdAt: '2026-10-06T11:30:00.000Z',
    confirmationUrl: 'https://yoomoney.ru/checkout/test',
    userId,
    paymentMethodId: null,
    paymentMethodSaved: false,
    savesPaymentMethod: false,
    cardLast4: null,
    ...overrides,
  }
}

function memoryStore(): SubscriptionStore {
  const rows = new Map<string, SubscriptionRecord>()
  return {
    async read(id) {
      return rows.get(id) ?? null
    },
    async save(record) {
      rows.set(record.userId, record)
    },
    async listDue(now) {
      return [...rows.values()].filter((row) => (
        row.autopayEnabled
        && row.paymentMethodId
        && row.paidUntil != null
        && row.paidUntil < now
        && (row.lastRenewalAt == null || row.lastRenewalAt.getTime() < now.getTime() - 24 * 60 * 60 * 1000)
      ))
    },
  }
}

function gateway(overrides: Partial<YooKassaGateway> = {}): YooKassaGateway {
  return {
    createSubscriptionPayment: async () => payment(),
    createRenewalPayment: async () => payment({ status: 'succeeded', paid: true, confirmationUrl: null }),
    getPayment: async () => payment({ status: 'succeeded', paid: true, confirmationUrl: null }),
    listPayments: async () => [],
    ...overrides,
  }
}

const user = {
  id: userId,
  role: 'user' as const,
  email: 'user@nora.com',
}

test('only a user can start a subscription payment', async () => {
  const service = new PaymentsService(gateway(), memoryStore(), 'http://localhost:5173', () => 'key-1')
  await expect(service.startSubscription({
    id: userId,
    role: 'mentor',
    email: 'mentor@nora.com',
  }, 'month')).rejects.toMatchObject({ kind: 'forbidden' })
})

test('a user payment returns the YooKassa page and keeps the return on this site', async () => {
  let seen: unknown
  const service = new PaymentsService(gateway({
    createSubscriptionPayment: async (input) => {
      seen = input
      return payment()
    },
  }), memoryStore(), 'http://localhost:5173', () => 'key-1')

  const result = await service.startSubscription(user, 'month')

  expect(result.confirmationUrl).toBe('https://yoomoney.ru/checkout/test')
  expect(seen).toEqual({
    email: 'user@nora.com',
    idempotenceKey: 'key-1',
    period: 'month',
    returnUrl: 'http://localhost:5173/app/payments',
    userId,
  })
})

test('an open payment is continued instead of starting another one', async () => {
  let created = 0
  const service = new PaymentsService(gateway({
    createSubscriptionPayment: async () => {
      created += 1
      return payment()
    },
    listPayments: async () => [payment({
      id: '3256f12f-000f-5000-b000-1809831ee84d',
      createdAt: new Date().toISOString(),
      savesPaymentMethod: true,
    })],
  }), memoryStore(), 'http://localhost:5173')

  const result = await service.startSubscription(user, 'month')
  expect(result.paymentId).toBe('3256f12f-000f-5000-b000-1809831ee84d')
  expect(created).toBe(0)
})

test('a checkout without a page is treated as a provider failure', async () => {
  const service = new PaymentsService(gateway({
    createSubscriptionPayment: async () => payment({ confirmationUrl: null }),
  }), memoryStore(), 'http://localhost:5173')
  await expect(service.startSubscription(user, 'month')).rejects.toMatchObject({ kind: 'provider' })
})

test('a missing shop answers that checkout is unavailable', async () => {
  const service = new PaymentsService(null, memoryStore(), 'http://localhost:5173')
  await expect(service.startSubscription(user, 'month')).rejects.toBeInstanceOf(PaymentsFailure)
})

test('payment status is visible only to the user who started it', async () => {
  const service = new PaymentsService(gateway(), memoryStore(), 'http://localhost:5173')
  await expect(service.readSubscription('someone-else', paymentId)).rejects.toMatchObject({ kind: 'not_found' })
  await expect(service.readSubscription(userId, paymentId)).resolves.toMatchObject({
    paid: true,
    status: 'succeeded',
    amountRub: 1000,
  })
})

test('an expired saved card is charged again without opening a checkout', async () => {
  let listed = 0
  let renewed = 0
  const renewedId = '3256f12f-000f-5000-b000-1809831ee84d'
  const service = new PaymentsService(gateway({
    listPayments: async () => {
      listed += 1
      const original = payment({
        status: 'succeeded',
        paid: true,
        createdAt: '2026-08-01T09:00:00.000Z',
        confirmationUrl: null,
        paymentMethodId: 'method-1',
        paymentMethodSaved: true,
        cardLast4: '4477',
      })
      if (listed === 1) return [original]
      return [
        payment({
          id: renewedId,
          status: 'succeeded',
          paid: true,
          createdAt: new Date().toISOString(),
          confirmationUrl: null,
          paymentMethodId: 'method-1',
          paymentMethodSaved: true,
          cardLast4: '4477',
        }),
        original,
      ]
    },
    createRenewalPayment: async () => {
      renewed += 1
      return payment({
        id: renewedId,
        status: 'succeeded',
        paid: true,
        confirmationUrl: null,
        paymentMethodSaved: true,
        paymentMethodId: 'method-1',
      })
    },
  }), memoryStore(), 'http://localhost:5173')

  const overview = await service.readOverview(user)
  expect(renewed).toBe(1)
  expect(overview.charges[0]?.paymentId).toBe(renewedId)
  expect(overview.paidUntil).not.toBeNull()
  expect(overview.confirmationUrl).toBeNull()
})

test('a new payment after cancel turns autopay back on', async () => {
  const store = memoryStore()
  await store.save({
    userId,
    email: user.email,
    autopayEnabled: false,
    paymentMethodId: null,
    paidUntil: null,
    lastRenewalAt: null,
    cancelledAt: new Date('2026-10-06T08:00:00.000Z'),
    amountRub: null,
  })
  const service = new PaymentsService(gateway({
    listPayments: async () => [
      payment({
        status: 'succeeded',
        paid: true,
        createdAt: '2026-10-06T09:00:00.000Z',
        confirmationUrl: null,
        paymentMethodId: 'method-1',
        paymentMethodSaved: true,
        savesPaymentMethod: true,
        cardLast4: '4477',
      }),
    ],
  }), store, 'http://localhost:5173')

  const overview = await service.readOverview(user)
  expect(overview.autopay).toBe(true)
  expect(overview.cardLast4).toBe('4477')
  expect(overview.paidUntil).not.toBeNull()
})

test('the overview keeps only this user\'s real payments', async () => {
  const service = new PaymentsService(gateway({
    listPayments: async () => [
      payment({
        status: 'canceled',
        paid: false,
        createdAt: '2026-10-06T10:00:00.000Z',
        confirmationUrl: null,
      }),
      payment({
        id: '11111111-1111-4111-8111-111111111111',
        userId: 'someone-else',
      }),
    ],
  }), memoryStore(), 'http://localhost:5173')

  const overview = await service.readOverview(user)
  expect(overview.charges.map((charge) => charge.paymentId)).toEqual([paymentId])
  expect(overview.charges[0]?.title).toBe('Подписка')
  expect(overview.paidUntil).toBeNull()
  expect(overview.renewalNotice).toBe('unpaid')
})

test('a covered month cannot be paid again until the last three days without autopay', async () => {
  const covered = payment({
    status: 'succeeded',
    paid: true,
    createdAt: '2026-10-06T09:00:00.000Z',
    confirmationUrl: null,
    paymentMethodId: 'method-1',
    paymentMethodSaved: true,
    savesPaymentMethod: true,
    cardLast4: '4477',
  })
  const store = memoryStore()
  await store.save({
    userId,
    email: user.email,
    autopayEnabled: false,
    paymentMethodId: 'method-1',
    paidUntil: null,
    lastRenewalAt: null,
    cancelledAt: null,
    amountRub: 1000,
  })
  let started = 0
  const service = new PaymentsService(gateway({
    listPayments: async () => [covered],
    createSubscriptionPayment: async () => {
      started += 1
      return payment()
    },
  }), store, 'http://localhost:5173')

  await expect(service.startSubscription(user, 'month', new Date('2026-10-20T12:00:00.000Z')))
    .rejects.toMatchObject({ kind: 'invalid' })
  expect(started).toBe(0)

  const early = await service.startSubscription(user, 'month', new Date('2026-11-04T09:00:00.000Z'))
  expect(early.confirmationUrl).toBe('https://yoomoney.ru/checkout/test')
  expect(started).toBe(1)
})
