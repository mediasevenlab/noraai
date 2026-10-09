import { z } from 'zod'

import type { YooKassaGateway, YooKassaPayment } from '../application/ports'
import { PaymentsFailure } from '../domain/errors'
import { subscriptionPaymentBody, subscriptionRenewalBody, subscriptionSavesByDescription } from '../domain/subscription-payment'

const YOOKASSA_PAYMENTS_URL = 'https://api.yookassa.ru/v3/payments'

const paymentSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(['pending', 'waiting_for_capture', 'succeeded', 'canceled']),
  paid: z.boolean(),
  created_at: z.string().optional(),
  amount: z.object({
    value: z.string(),
    currency: z.string(),
  }),
  confirmation: z.object({
    confirmation_url: z.string().url().optional(),
  }).optional(),
  metadata: z.object({
    userId: z.string().optional(),
  }).optional(),
  save_payment_method: z.boolean().optional(),
  description: z.string().optional(),
  payment_method: z.object({
    id: z.string().optional(),
    saved: z.boolean().optional(),
    card: z.object({
      last4: z.string().optional(),
    }).optional(),
  }).optional(),
})

const paymentListSchema = z.object({
  items: z.array(paymentSchema),
  next_cursor: z.string().optional(),
})

export function createYooKassaGateway(input: {
  secretKey: string | undefined
  shopId: string | undefined
}): YooKassaGateway | null {
  if (!input.shopId || !input.secretKey) return null
  const authorization = `Basic ${btoa(`${input.shopId}:${input.secretKey}`)}`
  return {
    createSubscriptionPayment: (payment) => requestPayment(authorization, {
      method: 'POST',
      idempotenceKey: payment.idempotenceKey,
      body: subscriptionPaymentBody(payment),
    }),
    createRenewalPayment: (payment) => requestPayment(authorization, {
      method: 'POST',
      idempotenceKey: payment.idempotenceKey,
      body: subscriptionRenewalBody(payment),
    }),
    getPayment: (paymentId) => requestPayment(authorization, {
      method: 'GET',
      path: `/${paymentId}`,
    }),
    listPayments: () => listShopPayments(authorization),
  }
}

async function listShopPayments(authorization: string) {
  const collected: YooKassaPayment[] = []
  let cursor: string | undefined
  for (let page = 0; page < 3; page += 1) {
    const query = new URLSearchParams({ limit: '100' })
    if (cursor) query.set('cursor', cursor)
    const listed = await requestJson(authorization, {
      method: 'GET',
      path: `?${query.toString()}`,
    }, paymentListSchema)
    collected.push(...listed.items.map(toPayment))
    cursor = listed.next_cursor
    if (!cursor) break
  }
  return collected
}

async function requestPayment(
  authorization: string,
  input: {
    method: 'GET' | 'POST'
    path?: string
    idempotenceKey?: string
    body?: unknown
  },
): Promise<YooKassaPayment> {
  const json = await requestJson(authorization, input, paymentSchema)
  return toPayment(json)
}

const YOOKASSA_ATTEMPTS = 2
const YOOKASSA_RETRY_DELAY_MS = 400

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/** A dropped connection or 5xx can be sent again. The same Idempotence-Key returns the original payment. */
function canRetryYooKassa(error: unknown, status: number | null) {
  if (status != null) return status >= 500
  return !(error instanceof PaymentsFailure)
}

async function requestJson<TSchema extends z.ZodType>(
  authorization: string,
  input: {
    method: 'GET' | 'POST'
    path?: string
    idempotenceKey?: string
    body?: unknown
  },
  schema: TSchema,
): Promise<z.infer<TSchema>> {
  for (let attempt = 0; attempt < YOOKASSA_ATTEMPTS; attempt += 1) {
    try {
      const response = await fetch(`${YOOKASSA_PAYMENTS_URL}${input.path ?? ''}`, {
        method: input.method,
        headers: {
          Authorization: authorization,
          ...(input.body === undefined ? {} : { 'Content-Type': 'application/json' }),
          ...(input.idempotenceKey ? { 'Idempotence-Key': input.idempotenceKey } : {}),
        },
        body: input.body === undefined ? undefined : JSON.stringify(input.body),
        signal: AbortSignal.timeout(15_000),
      })
      if (!response.ok) {
        if (attempt + 1 < YOOKASSA_ATTEMPTS && canRetryYooKassa(null, response.status)) {
          await wait(YOOKASSA_RETRY_DELAY_MS)
          continue
        }
        throw new PaymentsFailure('provider', 'ЮKassa не приняла платёж.')
      }

      let json: unknown
      try {
        json = await response.json()
      } catch {
        throw new PaymentsFailure('provider', 'ЮKassa вернула непонятный ответ.')
      }

      const parsed = schema.safeParse(json)
      if (!parsed.success) {
        throw new PaymentsFailure('provider', 'ЮKassa вернула непонятный ответ.')
      }
      return parsed.data
    } catch (error) {
      if (error instanceof PaymentsFailure) throw error
      if (attempt + 1 < YOOKASSA_ATTEMPTS && canRetryYooKassa(error, null)) {
        await wait(YOOKASSA_RETRY_DELAY_MS)
        continue
      }
    }
  }
  throw new PaymentsFailure('provider', 'ЮKassa не ответила.')
}

function toPayment(data: z.infer<typeof paymentSchema>): YooKassaPayment {
  const amountRub = Math.round(Number(data.amount.value))
  if (!Number.isInteger(amountRub) || amountRub <= 0) {
    throw new PaymentsFailure('provider', 'ЮKassa вернула непонятную сумму.')
  }
  const last4 = data.payment_method?.card?.last4
  return {
    id: data.id,
    status: data.status,
    paid: data.paid,
    amountRub,
    createdAt: data.created_at ?? null,
    confirmationUrl: data.confirmation?.confirmation_url ?? null,
    userId: data.metadata?.userId ?? null,
    paymentMethodId: data.payment_method?.id ?? null,
    paymentMethodSaved: data.payment_method?.saved === true,
    // YooKassa does not echo save_payment_method. The payment sentence is sent only with unconditional saving.
    savesPaymentMethod: data.save_payment_method === true || subscriptionSavesByDescription(data.description),
    cardLast4: last4 && /^\d{4}$/.test(last4) ? last4 : null,
  }
}
