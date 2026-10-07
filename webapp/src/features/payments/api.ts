import {
  subscriptionAutopayRequestSchema,
  subscriptionOverviewSchema,
  subscriptionPaymentRequestSchema,
  subscriptionPaymentResponseSchema,
  subscriptionPaymentStatusSchema,
  type SubscriptionOverview,
  type SubscriptionPaymentStatus,
} from '@web-app-demo/contracts'

import type { AuthenticatedTransport } from '@/platform/api'

export function startSubscriptionPayment(
  transport: AuthenticatedTransport,
  period: 'month' | 'year',
) {
  return transport.request('/api/payments/subscription', subscriptionPaymentResponseSchema, {
    method: 'POST',
    body: subscriptionPaymentRequestSchema.parse({ period }),
  })
}

export function cancelSubscription(transport: AuthenticatedTransport) {
  return transport.request('/api/payments/subscription/cancel', subscriptionOverviewSchema, {
    method: 'POST',
  })
}

export function readSubscriptionOverview(transport: AuthenticatedTransport) {
  return transport.request('/api/payments/subscription', subscriptionOverviewSchema)
}

export function setSubscriptionAutopay(transport: AuthenticatedTransport, enabled: boolean) {
  return transport.request('/api/payments/subscription/autopay', subscriptionOverviewSchema, {
    method: 'PATCH',
    body: subscriptionAutopayRequestSchema.parse({ enabled }),
  })
}

export function readSubscriptionPayment(transport: AuthenticatedTransport, paymentId: string) {
  return transport.request(
    `/api/payments/subscription/${paymentId}`,
    subscriptionPaymentStatusSchema,
  )
}

export type { SubscriptionOverview, SubscriptionPaymentStatus }
