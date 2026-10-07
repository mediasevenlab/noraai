import {
  apiErrorSchema,
  subscriptionAutopayRequestSchema,
  subscriptionOverviewSchema,
  subscriptionPaymentParamsSchema,
  subscriptionPaymentRequestSchema,
  subscriptionPaymentResponseSchema,
  subscriptionPaymentStatusSchema,
} from '@web-app-demo/contracts'
import { createRoute, OpenAPIHono } from '@hono/zod-openapi'
import type { MiddlewareHandler } from 'hono'

import { validationErrorHook } from '../../../http/errors'
import type { AuthHttpEnv } from '../../auth'
import type { PaymentsService } from '../application/payments-service'
import { executePayments } from './errors'

const errorContent = {
  'application/json': {
    schema: apiErrorSchema,
  },
}

const bearerSecurity = [{ BearerAuth: [] }]

const startSubscriptionRoute = createRoute({
  method: 'post',
  path: '/subscription',
  security: bearerSecurity,
  request: {
    body: {
      content: {
        'application/json': {
          schema: subscriptionPaymentRequestSchema,
        },
      },
    },
  },
  responses: {
    200: {
      content: { 'application/json': { schema: subscriptionPaymentResponseSchema } },
      description: 'Redirect to the YooKassa page where the user enters the card',
    },
    400: { content: errorContent, description: 'The request must not include card details' },
    401: { content: errorContent, description: 'Authentication required' },
    403: { content: errorContent, description: 'Only a user can pay for the subscription' },
    502: { content: errorContent, description: 'YooKassa rejected the payment' },
    503: { content: errorContent, description: 'YooKassa is not configured' },
  },
})

const readOverviewRoute = createRoute({
  method: 'get',
  path: '/subscription',
  security: bearerSecurity,
  responses: {
    200: {
      content: { 'application/json': { schema: subscriptionOverviewSchema } },
      description: 'Real subscription charges and whether the next month is already scheduled',
    },
    401: { content: errorContent, description: 'Authentication required' },
    403: { content: errorContent, description: 'Only a user can read the subscription' },
    502: { content: errorContent, description: 'YooKassa did not return the payments' },
    503: { content: errorContent, description: 'YooKassa is not configured' },
  },
})

const cancelSubscriptionRoute = createRoute({
  method: 'post',
  path: '/subscription/cancel',
  security: bearerSecurity,
  responses: {
    200: {
      content: { 'application/json': { schema: subscriptionOverviewSchema } },
      description: 'Ends the current period so another test payment can start',
    },
    401: { content: errorContent, description: 'Authentication required' },
    403: { content: errorContent, description: 'Only a user can cancel the subscription' },
    502: { content: errorContent, description: 'YooKassa did not return the payments' },
    503: { content: errorContent, description: 'YooKassa is not configured' },
  },
})

const setAutopayRoute = createRoute({
  method: 'patch',
  path: '/subscription/autopay',
  security: bearerSecurity,
  request: {
    body: {
      content: {
        'application/json': {
          schema: subscriptionAutopayRequestSchema,
        },
      },
    },
  },
  responses: {
    200: {
      content: { 'application/json': { schema: subscriptionOverviewSchema } },
      description: 'Monthly charging turned on or off for the saved card',
    },
    400: { content: errorContent, description: 'Autopay cannot be enabled before a card is saved' },
    401: { content: errorContent, description: 'Authentication required' },
    403: { content: errorContent, description: 'Only a user can change the subscription' },
    502: { content: errorContent, description: 'YooKassa did not return the payments' },
    503: { content: errorContent, description: 'YooKassa is not configured' },
  },
})

const readSubscriptionRoute = createRoute({
  method: 'get',
  path: '/subscription/{paymentId}',
  security: bearerSecurity,
  request: {
    params: subscriptionPaymentParamsSchema,
  },
  responses: {
    200: {
      content: { 'application/json': { schema: subscriptionPaymentStatusSchema } },
      description: 'Subscription payment status for the signed-in user',
    },
    401: { content: errorContent, description: 'Authentication required' },
    404: { content: errorContent, description: 'Payment was not found for this user' },
    502: { content: errorContent, description: 'YooKassa did not return the payment' },
    503: { content: errorContent, description: 'YooKassa is not configured' },
  },
})

export function createPaymentsRoutes({
  requireAuth,
  service,
}: {
  requireAuth: MiddlewareHandler<AuthHttpEnv>
  service: PaymentsService
}) {
  const routes = new OpenAPIHono<AuthHttpEnv>({
    defaultHook: validationErrorHook,
  })

  routes.use('*', requireAuth)
  routes.openapi(readOverviewRoute, async (c) => {
    const user = c.var.user
    const overview = await executePayments(() => service.readOverview({
      id: user.id,
      role: user.role,
      email: user.email,
    }))
    return c.json(overview, 200)
  })
  routes.openapi(cancelSubscriptionRoute, async (c) => {
    const user = c.var.user
    const overview = await executePayments(() => service.cancelSubscription({
      id: user.id,
      role: user.role,
      email: user.email,
    }))
    return c.json(overview, 200)
  })
  routes.openapi(setAutopayRoute, async (c) => {
    const user = c.var.user
    const { enabled } = c.req.valid('json')
    const overview = await executePayments(() => service.setAutopay({
      id: user.id,
      role: user.role,
      email: user.email,
    }, enabled))
    return c.json(overview, 200)
  })
  routes.openapi(startSubscriptionRoute, async (c) => {
    const user = c.var.user
      const { period } = c.req.valid('json')
    const payment = await executePayments(() => service.startSubscription({
      id: user.id,
      role: user.role,
      email: user.email,
    }, period))
    return c.json(payment, 200)
  })
  routes.openapi(readSubscriptionRoute, async (c) => {
    const { paymentId } = c.req.valid('param')
    const payment = await executePayments(() => service.readSubscription(c.var.user.id, paymentId))
    return c.json(payment, 200)
  })

  return routes
}
