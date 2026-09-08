export type MentorPayoutRequisites = {
  recipientName: string
  bankName: string
  bik: string
  accountNumber: string
  sbpPhone: string
}

export type UserServicePaymentDetails = {
  payerName: string
  cardNumber: string
  expiry: string
  cvc: string
}

export type FieldErrors<T extends string> = Partial<Record<T, string>>

const digitsOnly = (value: string) => value.replace(/\D/g, '')

export function normalizeBik(value: string) {
  return digitsOnly(value).slice(0, 9)
}

export function normalizeAccountNumber(value: string) {
  return digitsOnly(value).slice(0, 20)
}

export function normalizeCardNumber(value: string) {
  return digitsOnly(value).slice(0, 16)
}

export function formatCardNumber(value: string) {
  const digits = normalizeCardNumber(value)
  return digits.replace(/(\d{4})(?=\d)/g, '$1 ').trim()
}

export function normalizeExpiry(value: string) {
  const digits = digitsOnly(value).slice(0, 4)
  if (digits.length <= 2) return digits
  return `${digits.slice(0, 2)}/${digits.slice(2)}`
}

export function normalizeCvc(value: string) {
  return digitsOnly(value).slice(0, 4)
}

export function normalizePhone(value: string) {
  return digitsOnly(value).slice(0, 11)
}

export function formatPhone(value: string) {
  const digits = normalizePhone(value)
  if (digits.length === 0) return ''
  if (digits.length <= 1) return `+${digits}`
  if (digits.length <= 4) return `+${digits.slice(0, 1)} (${digits.slice(1)}`
  if (digits.length <= 7) {
    return `+${digits.slice(0, 1)} (${digits.slice(1, 4)}) ${digits.slice(4)}`
  }
  if (digits.length <= 9) {
    return `+${digits.slice(0, 1)} (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`
  }
  return `+${digits.slice(0, 1)} (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7, 9)}-${digits.slice(9)}`
}

export function validateMentorPayoutRequisites(
  input: MentorPayoutRequisites,
): FieldErrors<keyof MentorPayoutRequisites> {
  const errors: FieldErrors<keyof MentorPayoutRequisites> = {}
  if (input.recipientName.trim().length < 3) {
    errors.recipientName = 'Укажите ФИО получателя.'
  }
  if (input.bankName.trim().length < 2) {
    errors.bankName = 'Укажите название банка.'
  }
  if (!/^\d{9}$/.test(input.bik)) {
    errors.bik = 'БИК должен содержать 9 цифр.'
  }
  if (!/^\d{20}$/.test(input.accountNumber)) {
    errors.accountNumber = 'Расчётный счёт должен содержать 20 цифр.'
  }
  if (input.sbpPhone.trim() !== '' && !/^\d{11}$/.test(input.sbpPhone)) {
    errors.sbpPhone = 'Укажите телефон в формате 11 цифр.'
  }
  return errors
}

export function validateUserServicePayment(
  input: UserServicePaymentDetails,
): FieldErrors<keyof UserServicePaymentDetails> {
  const errors: FieldErrors<keyof UserServicePaymentDetails> = {}
  if (input.payerName.trim().length < 3) {
    errors.payerName = 'Укажите имя плательщика.'
  }
  if (!/^\d{16}$/.test(input.cardNumber)) {
    errors.cardNumber = 'Номер карты должен содержать 16 цифр.'
  }
  if (!/^(0[1-9]|1[0-2])\/\d{2}$/.test(input.expiry)) {
    errors.expiry = 'Укажите срок в формате ММ/ГГ.'
  }
  if (!/^\d{3,4}$/.test(input.cvc)) {
    errors.cvc = 'CVC должен содержать 3 или 4 цифры.'
  }
  return errors
}

export function hasFieldErrors(errors: FieldErrors<string>) {
  return Object.keys(errors).length > 0
}

/** Demo card on file for every user until real billing lands. */
export const DEMO_USER_SERVICE_PAYMENT: UserServicePaymentDetails = {
  payerName: 'IVAN IVANOV',
  cardNumber: '4242424242424242',
  expiry: '12/28',
  cvc: '123',
}

export type UserReferralPayoutRequisites = {
  recipientName: string
  bik: string
  accountNumber: string
  sbpPhone: string
}

export function validateUserReferralPayoutRequisites(
  input: UserReferralPayoutRequisites,
): FieldErrors<keyof UserReferralPayoutRequisites> {
  const errors: FieldErrors<keyof UserReferralPayoutRequisites> = {}
  if (input.recipientName.trim().length < 3) {
    errors.recipientName = 'Укажите ФИО получателя.'
  }
  if (!/^\d{9}$/.test(input.bik)) {
    errors.bik = 'БИК должен содержать 9 цифр.'
  }
  if (!/^\d{20}$/.test(input.accountNumber)) {
    errors.accountNumber = 'Расчётный счёт должен содержать 20 цифр.'
  }
  if (input.sbpPhone.trim() !== '' && !/^\d{11}$/.test(input.sbpPhone)) {
    errors.sbpPhone = 'Укажите телефон в формате 11 цифр.'
  }
  return errors
}

export type UserSubscriptionStatus = 'paid' | 'failed' | 'scheduled'

export type UserSubscriptionMonth = {
  id: string
  label: string
  amount: number
  status: UserSubscriptionStatus
  note?: string
}

/** Shared demo subscription history for every user. */
export const DEMO_USER_SUBSCRIPTION: ReadonlyArray<UserSubscriptionMonth> = [
  {
    id: '2026-07',
    label: 'Июль 2026',
    amount: 990,
    status: 'paid',
  },
  {
    id: '2026-06',
    label: 'Июнь 2026',
    amount: 990,
    status: 'failed',
    note: 'Оплата не прошла: недостаточно средств',
  },
  {
    id: '2026-05',
    label: 'Май 2026',
    amount: 990,
    status: 'paid',
  },
]

export const DEMO_USER_NEXT_CHARGE = {
  label: '1 августа 2026',
  amount: 990,
} as const

/** Demo remaining days until the next charge date. */
export const DEMO_USER_SUBSCRIPTION_DAYS_LEFT = 2

/** Demo billing period length used by the sidebar meter. */
export const DEMO_USER_SUBSCRIPTION_PERIOD_DAYS = 30

export function formatSubscriptionDaysLeft(days: number) {
  const abs = Math.max(0, days)
  const mod10 = abs % 10
  const mod100 = abs % 100
  if (mod10 === 1 && mod100 !== 11) return `${abs} день`
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return `${abs} дня`
  return `${abs} дней`
}

/** How much of the billing period has elapsed, 0–100. */
export function subscriptionPeriodElapsedPercent(
  daysLeft: number,
  periodDays = DEMO_USER_SUBSCRIPTION_PERIOD_DAYS,
) {
  const period = Math.max(1, periodDays)
  const remaining = Math.min(Math.max(daysLeft, 0), period)
  return Math.round(((period - remaining) / period) * 100)
}

export function isSubscriptionExpiringSoon(daysLeft: number, threshold = 3) {
  return daysLeft <= threshold
}

export type UserReferralPayoutStatus = 'paid' | 'pending'

export type UserReferralPayoutMonth = {
  id: string
  label: string
  amount: number
  referrals: number
  status: UserReferralPayoutStatus
}

/** Shared demo referral payout history for every user. */
export const DEMO_USER_REFERRAL_PAYOUTS: ReadonlyArray<UserReferralPayoutMonth> = [
  {
    id: '2026-06',
    label: 'Июнь 2026',
    amount: 800,
    referrals: 4,
    status: 'paid',
  },
  {
    id: '2026-05',
    label: 'Май 2026',
    amount: 400,
    referrals: 2,
    status: 'paid',
  },
  {
    id: '2026-07',
    label: 'Июль 2026',
    amount: 600,
    referrals: 3,
    status: 'pending',
  },
]

export type MentorPayoutMonth = {
  id: string
  label: string
  amount: number
  status: 'paid' | 'pending'
}

/** Shared demo history for every mentor until real payouts land. */
export const DEMO_MENTOR_PAYOUTS: ReadonlyArray<MentorPayoutMonth> = [
  { id: '2026-06', label: 'Июнь 2026', amount: 1_600, status: 'paid' },
  { id: '2026-05', label: 'Май 2026', amount: 1_200, status: 'paid' },
]

export const DEMO_MENTOR_PAYOUT_REQUISITES: MentorPayoutRequisites = {
  recipientName: 'Иван Иванов',
  bankName: 'Т-Банк',
  bik: '044525974',
  accountNumber: '40817810099910004312',
  sbpPhone: '79001234567',
}

export function mentorPayoutTotal(months: ReadonlyArray<Pick<MentorPayoutMonth, 'amount'>>) {
  return months.reduce((sum, month) => sum + month.amount, 0)
}

export function userReferralPayoutTotal(
  months: ReadonlyArray<Pick<UserReferralPayoutMonth, 'amount'>>,
) {
  return months.reduce((sum, month) => sum + month.amount, 0)
}

export function formatPayoutAmount(amount: number) {
  return `${amount.toLocaleString('ru-RU')} ₽`
}
