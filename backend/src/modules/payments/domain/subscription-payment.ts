/** One month of the user service. The client does not choose the amount. */
export const SUBSCRIPTION_PRICE_RUB = 1000

/** A year is twelve months with 20% off: 9 600 ₽. */
export const SUBSCRIPTION_YEAR_PRICE_RUB = 9_600

export type SubscriptionPeriod = 'month' | 'year'

/** Receipt line. The account email is the customer on the receipt. */
export const SUBSCRIPTION_RECEIPT_DESCRIPTION = 'Подписка 24nutrition, 1 месяц'

/** Shown on the YooKassa page so the monthly charge is part of the payment itself. */
export const SUBSCRIPTION_PAYMENT_DESCRIPTION = 'Подписка 24nutrition. Далее 1 000 ₽ списываются раз в месяц.'

const YEAR_PAYMENT_DESCRIPTION = 'Подписка 24nutrition. Далее 9 600 ₽ списываются раз в год.'
const YEAR_RECEIPT_DESCRIPTION = 'Подписка 24nutrition, 1 год'

export function subscriptionAmount(period: SubscriptionPeriod) {
  return period === 'year' ? SUBSCRIPTION_YEAR_PRICE_RUB : SUBSCRIPTION_PRICE_RUB
}

export function subscriptionPeriodOf(amountRub: number): SubscriptionPeriod {
  return amountRub === SUBSCRIPTION_YEAR_PRICE_RUB ? 'year' : 'month'
}

/** A test shop key starts with `test_`. There each payment replaces the period instead of extending it. */
export function subscriptionStacksCoverage(secretKey: string | undefined) {
  return !secretKey?.startsWith('test_')
}

/** YooKassa does not echo save_payment_method, so the payment sentence is the signal. */
export function subscriptionSavesByDescription(description: string | undefined) {
  return description === SUBSCRIPTION_PAYMENT_DESCRIPTION || description === YEAR_PAYMENT_DESCRIPTION
}

/**
 * vat_code 1 is «без НДС» in the YooKassa receipt.
 * The test shop accepts the payment even when the cash register does not answer.
 */
export const SUBSCRIPTION_VAT_CODE = 1

export function subscriptionPaymentBody(input: {
  email: string
  period: SubscriptionPeriod
  returnUrl: string
  userId: string
}) {
  return paymentPayload({
    email: input.email,
    period: input.period,
    userId: input.userId,
    extra: {
      save_payment_method: true,
      payment_method_data: { type: 'bank_card' as const },
      confirmation: {
        type: 'redirect' as const,
        return_url: input.returnUrl,
      },
    },
  })
}

export function subscriptionRenewalBody(input: {
  amountRub: number
  email: string
  paymentMethodId: string
  userId: string
}) {
  return paymentPayload({
    email: input.email,
    period: subscriptionPeriodOf(input.amountRub),
    userId: input.userId,
    extra: { payment_method_id: input.paymentMethodId },
  })
}

function paymentPayload(input: {
  email: string
  extra: Record<string, unknown>
  period: SubscriptionPeriod
  userId: string
}) {
  const price = subscriptionAmount(input.period)
  const amount = { value: `${price}.00`, currency: 'RUB' as const }
  return {
    amount,
    capture: true,
    ...input.extra,
    description: input.period === 'year' ? YEAR_PAYMENT_DESCRIPTION : SUBSCRIPTION_PAYMENT_DESCRIPTION,
    metadata: { userId: input.userId },
    receipt: {
      customer: { email: input.email },
      items: [
        {
          description: input.period === 'year' ? YEAR_RECEIPT_DESCRIPTION : SUBSCRIPTION_RECEIPT_DESCRIPTION,
          quantity: '1.00',
          amount,
          vat_code: SUBSCRIPTION_VAT_CODE,
          payment_mode: 'full_payment' as const,
          payment_subject: 'service' as const,
        },
      ],
    },
  }
}

export type SubscriptionPaymentFact = {
  id: string
  status: 'pending' | 'waiting_for_capture' | 'succeeded' | 'canceled'
  paid: boolean
  amountRub: number
  createdAt: string | null
  confirmationUrl: string | null
  userId: string | null
  paymentMethodId: string | null
  paymentMethodSaved: boolean
  savesPaymentMethod: boolean
  cardLast4: string | null
}

export type SubscriptionOverview = {
  charges: Array<{
    paymentId: string
    status: SubscriptionPaymentFact['status']
    paid: boolean
    amountRub: number
    createdAt: string
    title: 'Подписка'
  }>
  confirmationUrl: string | null
  pendingPaymentId: string | null
  pendingAmountRub: number | null
  renewalAmountRub: number | null
  paidUntil: string | null
  periodEndsAt: string | null
  nextChargeAt: string | null
  autopay: boolean
  canAutopay: boolean
  cardLast4: string | null
  savedMethodId: string | null
  /** ending: pay early. failed: the saved card was declined. unpaid: coverage has ended. */
  renewalNotice: SubscriptionRenewalNotice | null
  /** Whole days until the end, only while the ending notice is showing. */
  daysLeft: number | null
}

export type SubscriptionRenewalNotice = 'ending' | 'failed' | 'unpaid'

/** A charge this soon after the end still belongs to the period that just finished. */
const RENEWAL_CONTINUITY_MS = 24 * 60 * 60 * 1000
const DAY_MS = 24 * 60 * 60 * 1000
const ENDING_NOTICE_DAYS = 3

/** Pending bank-card payments stay open for about an hour, then YooKassa cancels them. */
const PENDING_WINDOW_MS = 60 * 60 * 1000

export function addSubscriptionMonths(from: Date, months: number) {
  let cursor = from
  for (let index = 0; index < months; index += 1) cursor = addSubscriptionMonth(cursor)
  return cursor
}

/** Early payment keeps the days still left. A later payment starts from the payment itself. */
export function nextCoverageEnd(previousEnd: Date | null, paidAt: Date, months: number) {
  const continues = previousEnd != null && paidAt.getTime() <= previousEnd.getTime() + RENEWAL_CONTINUITY_MS
  return addSubscriptionMonths(continues ? previousEnd : paidAt, months)
}

export function addSubscriptionMonth(from: Date) {
  const next = new Date(from.getTime())
  const day = next.getUTCDate()
  next.setUTCDate(1)
  next.setUTCMonth(next.getUTCMonth() + 1)
  const lastDay = new Date(Date.UTC(next.getUTCFullYear(), next.getUTCMonth() + 1, 0)).getUTCDate()
  next.setUTCDate(Math.min(day, lastDay))
  return next
}

export function subscriptionOverview(input: {
  autopayEnabled: boolean
  cancelledAt?: Date | null
  now: Date
  payments: readonly SubscriptionPaymentFact[]
  /** Live shop adds each payment onto the current end. The test shop keeps the latest payment only. */
  stackCoverage?: boolean
  userId: string
}): SubscriptionOverview {
  const mine = input.payments
    .filter((payment) => payment.userId === input.userId && payment.createdAt)
    .slice()
    .sort((left, right) => Date.parse(right.createdAt!) - Date.parse(left.createdAt!))
  const active = mine.filter((payment) => (
    input.cancelledAt == null || Date.parse(payment.createdAt!) > input.cancelledAt.getTime()
  ))
  const pending = active.find((payment) => (
    payment.savesPaymentMethod
    && (payment.status === 'pending' || payment.status === 'waiting_for_capture')
    && Date.parse(payment.createdAt!) > input.now.getTime() - PENDING_WINDOW_MS
  ))
  const latestSuccess = active.find((payment) => payment.paid || payment.status === 'succeeded')
  const paidUntilDate = coverageEnd(active, input.stackCoverage !== false)
  const covered = paidUntilDate != null && input.now < paidUntilDate
  const savedMethodId = latestSuccess?.paymentMethodSaved ? latestSuccess.paymentMethodId : null
  const canAutopay = Boolean(savedMethodId)
  const autopay = canAutopay && input.autopayEnabled
  const notice = renewalNoticeOf({ autopay, end: paidUntilDate, now: input.now, payments: active })
  return {
    charges: mine.map((payment) => ({
      paymentId: payment.id,
      status: payment.status,
      paid: payment.paid,
      amountRub: payment.amountRub,
      createdAt: payment.createdAt!,
      title: 'Подписка' as const,
    })),
    confirmationUrl: pending?.confirmationUrl ?? null,
    pendingPaymentId: pending?.id ?? null,
    pendingAmountRub: pending?.amountRub ?? null,
    renewalAmountRub: latestSuccess?.amountRub ?? null,
    paidUntil: covered && paidUntilDate ? paidUntilDate.toISOString() : null,
    periodEndsAt: paidUntilDate ? paidUntilDate.toISOString() : null,
    nextChargeAt: autopay && paidUntilDate ? paidUntilDate.toISOString() : null,
    autopay,
    canAutopay,
    cardLast4: latestSuccess?.cardLast4 ?? null,
    savedMethodId,
    renewalNotice: notice.renewalNotice,
    daysLeft: notice.daysLeft,
  }
}

function coverageEnd(payments: readonly SubscriptionPaymentFact[], stackCoverage: boolean) {
  const successes = payments
    .filter((payment) => payment.createdAt && (payment.paid || payment.status === 'succeeded'))
    .slice()
    .sort((left, right) => Date.parse(left.createdAt!) - Date.parse(right.createdAt!))
  if (!stackCoverage) {
    const latest = successes[successes.length - 1]
    if (!latest?.createdAt) return null
    const months = subscriptionPeriodOf(latest.amountRub) === 'year' ? 12 : 1
    return addSubscriptionMonths(new Date(latest.createdAt), months)
  }
  let end: Date | null = null
  for (const payment of successes) {
    const months = subscriptionPeriodOf(payment.amountRub) === 'year' ? 12 : 1
    end = nextCoverageEnd(end, new Date(payment.createdAt!), months)
  }
  return end
}

function renewalNoticeOf(input: {
  autopay: boolean
  end: Date | null
  now: Date
  payments: readonly SubscriptionPaymentFact[]
}) {
  if (!input.end) return { renewalNotice: 'unpaid' as const, daysLeft: null }
  if (input.now < input.end) {
    if (input.autopay) return { renewalNotice: null, daysLeft: null }
    const daysLeft = Math.ceil((input.end.getTime() - input.now.getTime()) / DAY_MS)
    if (daysLeft >= 1 && daysLeft <= ENDING_NOTICE_DAYS) {
      return { renewalNotice: 'ending' as const, daysLeft }
    }
    return { renewalNotice: null, daysLeft: null }
  }
  const attempt = input.payments.find((payment) => (
    payment.createdAt
    && Date.parse(payment.createdAt) >= input.end!.getTime()
    && !(payment.paid || payment.status === 'succeeded')
  ))
  if (input.autopay && (attempt?.status === 'pending' || attempt?.status === 'waiting_for_capture')) {
    return { renewalNotice: null, daysLeft: null }
  }
  if (input.autopay && attempt?.status === 'canceled') {
    return { renewalNotice: 'failed' as const, daysLeft: null }
  }
  if (input.autopay) return { renewalNotice: null, daysLeft: null }
  return { renewalNotice: 'unpaid' as const, daysLeft: null }
}
