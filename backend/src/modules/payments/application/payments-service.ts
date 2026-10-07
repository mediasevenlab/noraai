import type { UserRole } from '@web-app-demo/contracts'

import { PaymentsFailure } from '../domain/errors'
import {
  nextCoverageEnd,
  subscriptionAmount,
  subscriptionOverview,
  subscriptionPeriodOf,
  type SubscriptionOverview,
  type SubscriptionPaymentFact,
  type SubscriptionPeriod,
} from '../domain/subscription-payment'
import { isSubscriptionAmount, type PaidSubscription } from '../domain/payout-bonus'
import type { SubscriptionRecord, SubscriptionStore, YooKassaGateway, YooKassaPayment } from './ports'

type Payer = {
  id: string
  role: UserRole
  email: string
}

export type PublicSubscriptionOverview = Omit<SubscriptionOverview, 'periodEndsAt' | 'renewalAmountRub' | 'savedMethodId'>

export class PaymentsService {
  constructor(
    private readonly gateway: YooKassaGateway | null,
    private readonly store: SubscriptionStore,
    private readonly returnOrigin: string,
    private readonly newIdempotenceKey: () => string = () => crypto.randomUUID(),
    private readonly stackCoverage = true,
  ) {}

  async startSubscription(payer: Payer, period: SubscriptionPeriod, now = new Date()) {
    this.assertUser(payer)
    const gateway = this.gatewayOrThrow()
    const view = await this.sync(payer, now)
    const amountRub = subscriptionAmount(period)
    if (view.paidUntil && view.renewalNotice !== 'ending') {
      throw new PaymentsFailure('invalid', 'Подписка уже оплачена.')
    }
    if (view.pendingPaymentId && view.pendingAmountRub === amountRub) {
      if (!view.confirmationUrl) {
        throw new PaymentsFailure('invalid', 'Оплата уже начата. Она закроется сама примерно через час.')
      }
      const pending = view.charges.find((charge) => charge.paymentId === view.pendingPaymentId)
      return {
        paymentId: view.pendingPaymentId,
        status: pending?.status ?? 'pending' as const,
        paid: pending?.paid ?? false,
        amountRub,
        confirmationUrl: view.confirmationUrl,
      }
    }
    if (
      view.autopay
      && view.periodEndsAt
      && new Date(view.periodEndsAt) <= now
      && view.renewalNotice !== 'failed'
    ) {
      throw new PaymentsFailure('invalid', 'Списание с сохранённой карты уже запускается.')
    }
    const payment = await gateway.createSubscriptionPayment({
      email: payer.email,
      idempotenceKey: this.newIdempotenceKey(),
      period,
      returnUrl: `${this.returnOrigin}/app/payments`,
      userId: payer.id,
    })
    return this.presentPayment(payment)
  }

  async readOverview(payer: Payer, now = new Date()): Promise<PublicSubscriptionOverview> {
    this.assertUser(payer)
    this.gatewayOrThrow()
    return this.publish(await this.sync(payer, now))
  }

  async setAutopay(payer: Payer, enabled: boolean): Promise<PublicSubscriptionOverview> {
    this.assertUser(payer)
    this.gatewayOrThrow()
    const current = await this.sync(payer)
    if (enabled && !current.canAutopay) {
      throw new PaymentsFailure('invalid', 'Сначала оплатите подписку, чтобы сохранить карту.')
    }
    const existing = await this.store.read(payer.id)
    await this.store.save({
      userId: payer.id,
      email: payer.email,
      autopayEnabled: enabled,
      paymentMethodId: current.savedMethodId,
      paidUntil: current.periodEndsAt ? new Date(current.periodEndsAt) : existing?.paidUntil ?? null,
      lastRenewalAt: existing?.lastRenewalAt ?? null,
      cancelledAt: existing?.cancelledAt ?? null,
      amountRub: existing?.amountRub ?? null,
    })
    return this.publish(await this.sync(payer))
  }

  async cancelSubscription(payer: Payer): Promise<PublicSubscriptionOverview> {
    this.assertUser(payer)
    this.gatewayOrThrow()
    const existing = await this.store.read(payer.id)
    await this.store.save({
      userId: payer.id,
      email: payer.email,
      autopayEnabled: false,
      paymentMethodId: null,
      paidUntil: null,
      lastRenewalAt: existing?.lastRenewalAt ?? null,
      cancelledAt: new Date(),
      amountRub: null,
    })
    return this.publish(await this.sync(payer))
  }

  async renewDue(now = new Date()) {
    const gateway = this.gateway
    if (!gateway) return 0
    const due = await this.store.listDue(now)
    let started = 0
    for (const record of due) {
      if (!record.paymentMethodId) continue
      const amountRub = record.amountRub ?? subscriptionAmount('month')
      const payment = await gateway.createRenewalPayment({
        amountRub,
        email: record.email,
        idempotenceKey: `renew-${record.userId}`,
        paymentMethodId: record.paymentMethodId,
        userId: record.userId,
      })
      const succeeded = payment.paid || payment.status === 'succeeded'
      await this.store.save({
        ...record,
        amountRub,
        paidUntil: succeeded
          ? nextCoverageEnd(record.paidUntil, now, subscriptionPeriodOf(amountRub) === 'year' ? 12 : 1)
          : record.paidUntil,
        paymentMethodId: payment.paymentMethodId ?? record.paymentMethodId,
        lastRenewalAt: now,
      })
      started += 1
    }
    return started
  }

  async readSubscription(userId: string, paymentId: string) {
    const gateway = this.gatewayOrThrow()
    const payment = await this.ownedPayment(gateway, userId, paymentId)
    return {
      paymentId: payment.id,
      status: payment.status,
      paid: payment.paid,
      amountRub: payment.amountRub,
    }
  }

  private assertUser(payer: Payer) {
    if (payer.role !== 'user') {
      throw new PaymentsFailure('forbidden', 'Оплатить подписку может только пользователь.')
    }
  }

  private gatewayOrThrow() {
    const gateway = this.gateway
    if (!gateway) {
      throw new PaymentsFailure('unavailable', 'Оплата временно недоступна.')
    }
    return gateway
  }

  private async sync(payer: Payer, now = new Date()) {
    const gateway = this.gatewayOrThrow()
    let payments = await gateway.listPayments()
    let existing = await this.store.read(payer.id)
    let view = this.compose(payments, existing, payer.id, now)
    const renewalDue = view.autopay
      && view.savedMethodId
      && view.renewalAmountRub
      && view.periodEndsAt
      && new Date(view.periodEndsAt) <= now
      && (existing?.lastRenewalAt == null || now.getTime() - existing.lastRenewalAt.getTime() >= 24 * 60 * 60 * 1000)
    if (renewalDue && view.savedMethodId && view.periodEndsAt && view.renewalAmountRub) {
      const payment = await gateway.createRenewalPayment({
        amountRub: view.renewalAmountRub,
        email: payer.email,
        idempotenceKey: `renew-${payer.id}`,
        paymentMethodId: view.savedMethodId,
        userId: payer.id,
      })
      const succeeded = payment.paid || payment.status === 'succeeded'
      await this.store.save({
        userId: payer.id,
        email: payer.email,
        autopayEnabled: existing?.autopayEnabled ?? true,
        paymentMethodId: payment.paymentMethodId ?? view.savedMethodId,
        paidUntil: succeeded
          ? nextCoverageEnd(
            new Date(view.periodEndsAt),
            now,
            subscriptionPeriodOf(view.renewalAmountRub) === 'year' ? 12 : 1,
          )
          : new Date(view.periodEndsAt),
        lastRenewalAt: now,
        cancelledAt: existing?.cancelledAt ?? null,
        amountRub: view.renewalAmountRub,
      })
      payments = await gateway.listPayments()
      existing = await this.store.read(payer.id)
      view = this.compose(payments, existing, payer.id, now)
    }
    if (view.savedMethodId || view.periodEndsAt || existing) {
      const resumed = Boolean(existing?.cancelledAt && view.paidUntil && view.savedMethodId)
      await this.store.save({
        userId: payer.id,
        email: payer.email,
        autopayEnabled: resumed ? true : (existing?.autopayEnabled ?? true),
        paymentMethodId: view.savedMethodId,
        paidUntil: view.periodEndsAt ? new Date(view.periodEndsAt) : existing?.paidUntil ?? null,
        lastRenewalAt: existing?.lastRenewalAt ?? null,
        cancelledAt: resumed ? null : (existing?.cancelledAt ?? null),
        amountRub: view.renewalAmountRub ?? existing?.amountRub ?? null,
      })
      if (resumed) {
        existing = await this.store.read(payer.id)
        view = this.compose(payments, existing, payer.id, now)
      }
    }
    return view
  }

  private compose(
    payments: YooKassaPayment[],
    existing: SubscriptionRecord | null,
    userId: string,
    now: Date,
  ) {
    return subscriptionOverview({
      autopayEnabled: existing?.autopayEnabled ?? true,
      cancelledAt: existing?.cancelledAt ?? null,
      now,
      payments: payments.map(toFact),
      stackCoverage: this.stackCoverage,
      userId,
    })
  }

  private publish(view: SubscriptionOverview): PublicSubscriptionOverview {
    return {
      charges: view.charges,
      confirmationUrl: view.confirmationUrl,
      pendingPaymentId: view.pendingPaymentId,
      pendingAmountRub: view.pendingAmountRub,
      paidUntil: view.paidUntil,
      nextChargeAt: view.nextChargeAt,
      renewalNotice: view.renewalNotice,
      daysLeft: view.daysLeft,
      autopay: view.autopay,
      canAutopay: view.canAutopay,
      cardLast4: view.cardLast4,
    }
  }

  async listPaidSubscriptions(): Promise<PaidSubscription[]> {
    const gateway = this.gateway
    if (!gateway) return []
    const payments = await gateway.listPayments()
    const seen = new Set<string>()
    const paid: PaidSubscription[] = []
    for (const payment of payments) {
      if (!payment.userId || !payment.createdAt) continue
      if (!(payment.paid || payment.status === 'succeeded')) continue
      if (!isSubscriptionAmount(payment.amountRub)) continue
      if (seen.has(payment.id)) continue
      seen.add(payment.id)
      paid.push({
        userId: payment.userId,
        amountRub: payment.amountRub,
        paidAt: payment.createdAt,
      })
    }
    return paid
  }

  private presentPayment(payment: YooKassaPayment) {
    if (!payment.confirmationUrl) {
      throw new PaymentsFailure('provider', 'ЮKassa не открыла страницу оплаты.')
    }
    return {
      paymentId: payment.id,
      status: payment.status,
      paid: payment.paid,
      amountRub: payment.amountRub,
      confirmationUrl: payment.confirmationUrl,
    }
  }

  private async ownedPayment(gateway: YooKassaGateway, userId: string, paymentId: string) {
    let payment: YooKassaPayment
    try {
      payment = await gateway.getPayment(paymentId)
    } catch (error) {
      if (error instanceof PaymentsFailure) throw error
      throw new PaymentsFailure('provider', 'ЮKassa не ответила по этому платежу.')
    }
    if (payment.userId !== userId) {
      throw new PaymentsFailure('not_found', 'Платёж не найден.')
    }
    return payment
  }
}

function toFact(payment: YooKassaPayment): SubscriptionPaymentFact {
  return {
    id: payment.id,
    status: payment.status,
    paid: payment.paid,
    amountRub: payment.amountRub,
    createdAt: payment.createdAt,
    confirmationUrl: payment.confirmationUrl,
    userId: payment.userId,
    paymentMethodId: payment.paymentMethodId,
    paymentMethodSaved: payment.paymentMethodSaved,
    savesPaymentMethod: payment.savesPaymentMethod,
    cardLast4: payment.cardLast4,
  }
}
