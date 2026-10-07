import { z } from 'zod'

/** The card is entered on YooKassa's page, so this request carries no card data. */
export const subscriptionPaymentRequestSchema = z.object({
  period: z.enum(['month', 'year']),
}).strict()

export const subscriptionPaymentResponseSchema = z.object({
  paymentId: z.string().uuid(),
  status: z.enum(['pending', 'waiting_for_capture', 'succeeded', 'canceled']),
  paid: z.boolean(),
  amountRub: z.number().int().positive(),
  confirmationUrl: z.string().url(),
})

export const subscriptionPaymentStatusSchema = z.object({
  paymentId: z.string().uuid(),
  status: z.enum(['pending', 'waiting_for_capture', 'succeeded', 'canceled']),
  paid: z.boolean(),
  amountRub: z.number().int().positive(),
})

export const subscriptionPaymentParamsSchema = z.object({
  paymentId: z.string().uuid(),
})

export const subscriptionChargeSchema = z.object({
  paymentId: z.string().uuid(),
  status: z.enum(['pending', 'waiting_for_capture', 'succeeded', 'canceled']),
  paid: z.boolean(),
  amountRub: z.number().int().positive(),
  createdAt: z.string().min(1),
  title: z.literal('Подписка'),
})

export const subscriptionOverviewSchema = z.object({
  charges: z.array(subscriptionChargeSchema),
  confirmationUrl: z.string().url().nullable(),
  pendingPaymentId: z.string().uuid().nullable(),
  pendingAmountRub: z.number().int().positive().nullable(),
  paidUntil: z.string().nullable(),
  nextChargeAt: z.string().nullable(),
  autopay: z.boolean(),
  canAutopay: z.boolean(),
  cardLast4: z.string().regex(/^\d{4}$/).nullable(),
  renewalNotice: z.enum(['ending', 'failed', 'unpaid']).nullable(),
  daysLeft: z.number().int().min(1).max(3).nullable(),
})

export const subscriptionAutopayRequestSchema = z.object({
  enabled: z.boolean(),
}).strict()

export type SubscriptionPaymentRequest = z.infer<typeof subscriptionPaymentRequestSchema>
export type SubscriptionPaymentResponse = z.infer<typeof subscriptionPaymentResponseSchema>
export type SubscriptionPaymentStatus = z.infer<typeof subscriptionPaymentStatusSchema>
export type SubscriptionOverview = z.infer<typeof subscriptionOverviewSchema>
