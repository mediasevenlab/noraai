import type { MiddlewareHandler } from 'hono'

import type { AppEnv } from '../../env'
import type { AuthHttpEnv } from '../auth'
import { PaymentsService } from './application/payments-service'
import { subscriptionStacksCoverage } from './domain/subscription-payment'
import { createSubscriptionStore } from './infrastructure/subscription-store'
import { createYooKassaGateway } from './infrastructure/yookassa-client'
import { createPaymentsRoutes } from './transport/routes'

/** Shop id and secret are read from the environment when the API process starts. */
export { payoutAccrual, type PaidSubscription } from './domain/payout-bonus'
export function createPaymentsModule({
  env,
  requireAuth,
  startRenewal = false,
}: {
  env: AppEnv
  requireAuth: MiddlewareHandler<AuthHttpEnv>
  startRenewal?: boolean
}) {
  const service = new PaymentsService(
    createYooKassaGateway({
      shopId: env.YOOKASSA_SHOP_ID,
      secretKey: env.YOOKASSA_SECRET_KEY,
    }),
    createSubscriptionStore(),
    env.WEBAPP_ORIGIN ?? env.CORS_ORIGINS[0] ?? 'http://localhost:5173',
    () => crypto.randomUUID(),
    subscriptionStacksCoverage(env.YOOKASSA_SECRET_KEY),
  )
  const timer = startRenewal
    ? setInterval(() => {
      void service.renewDue().catch(() => {
        console.log('Subscription renewal check failed.')
      })
    }, 60 * 60 * 1000)
    : null

  return {
    routes: createPaymentsRoutes({ requireAuth, service }),
    listPaidSubscriptions: () => service.listPaidSubscriptions(),
    dispose: () => {
      if (timer) clearInterval(timer)
    },
  }
}
