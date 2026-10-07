export type YooKassaPayment = {
  id: string
  status: 'pending' | 'waiting_for_capture' | 'succeeded' | 'canceled'
  paid: boolean
  amountRub: number
  createdAt: string | null
  confirmationUrl: string | null
  userId: string | null
  paymentMethodId: string | null
  paymentMethodSaved: boolean
  /** True only when this payment was created with unconditional card saving. */
  savesPaymentMethod: boolean
  cardLast4: string | null
}

export type YooKassaGateway = {
  createSubscriptionPayment(input: {
    email: string
    idempotenceKey: string
    period: 'month' | 'year'
    returnUrl: string
    userId: string
  }): Promise<YooKassaPayment>
  createRenewalPayment(input: {
    amountRub: number
    email: string
    idempotenceKey: string
    paymentMethodId: string
    userId: string
  }): Promise<YooKassaPayment>
  getPayment(paymentId: string): Promise<YooKassaPayment>
  listPayments(): Promise<YooKassaPayment[]>
}

export type SubscriptionRecord = {
  userId: string
  email: string
  autopayEnabled: boolean
  paymentMethodId: string | null
  paidUntil: Date | null
  lastRenewalAt: Date | null
  /** Charges at or before this moment no longer keep the subscription active. */
  cancelledAt: Date | null
  /** Amount of the plan that renews. Null until a payment has succeeded. */
  amountRub: number | null
}

export type SubscriptionStore = {
  read(userId: string): Promise<SubscriptionRecord | null>
  save(record: SubscriptionRecord): Promise<void>
  listDue(now: Date): Promise<SubscriptionRecord[]>
}
