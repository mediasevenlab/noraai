export type MentorPayoutRequisites = {
  fullName: string
  inn: string
  phone: string
  accepted: boolean
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

export function normalizeInn(value: string) {
  return digitsOnly(value).slice(0, 12)
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

/** 13% is withheld from a payout to a person. The mentor receives the rest. */
export const MENTOR_PAYOUT_TAX_RATE = 0.13

export function mentorPayoutWithholding(gross: number) {
  return Math.round(Math.max(0, gross) * MENTOR_PAYOUT_TAX_RATE)
}

export function mentorPayoutNet(gross: number) {
  return Math.max(0, gross) - mentorPayoutWithholding(gross)
}

/** What is still unpaid after earlier referral payouts. */
export function unpaidBonusRub(accrued: number, settledRub: number) {
  return Math.max(0, accrued - Math.max(0, settledRub))
}

export function mentorPayoutPhoneMask(phone: string) {
  const digits = digitsOnly(phone)
  return `+7 … ${digits.slice(-2)}`
}

/** Calendar date as `дд.мм.гг`. */
export function formatShortDate(date: Date) {
  const day = String(date.getDate()).padStart(2, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const year = String(date.getFullYear() % 100).padStart(2, '0')
  return `${day}.${month}.${year}`
}

/** First day of the month, or next month once that day has passed. */
export function nextMentorPayoutDate(now = new Date()) {
  const payout = new Date(now.getFullYear(), now.getMonth(), 1)
  if (now.getDate() > 1) payout.setMonth(payout.getMonth() + 1)
  return payout
}

/** Payouts leave on the first day of the month. */
export function nextMentorPayoutLabel(now = new Date()) {
  return nextMentorPayoutDate(now)
    .toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })
    .replace(/\s*г\.$/, '')
}

function innChecksum(digits: string, weights: readonly number[]) {
  const sum = weights.reduce((total, weight, index) => total + weight * Number(digits[index]), 0)
  return (sum % 11) % 10
}

export function isPersonInn(value: string) {
  if (!/^\d{12}$/.test(value)) return false
  const eleventh = innChecksum(value, [7, 2, 4, 10, 3, 5, 9, 4, 6, 8])
  const twelfth = innChecksum(value, [3, 7, 2, 4, 10, 3, 5, 9, 4, 6, 8])
  return eleventh === Number(value[10]) && twelfth === Number(value[11])
}

export function validateMentorPayoutRequisites(
  input: MentorPayoutRequisites,
): FieldErrors<keyof MentorPayoutRequisites> {
  const errors: FieldErrors<keyof MentorPayoutRequisites> = {}
  const name = input.fullName.trim().replace(/\s+/g, ' ')
  if (name.split(' ').filter(Boolean).length < 2) {
    errors.fullName = 'Укажите фамилию и имя, как в паспорте.'
  }
  if (!/^\d{12}$/.test(input.inn)) {
    errors.inn = 'ИНН физлица — 12 цифр.'
  } else if (!isPersonInn(input.inn)) {
    errors.inn = 'Контрольные цифры ИНН не сходятся.'
  }
  if (!/^7\d{10}$/.test(input.phone)) {
    errors.phone = 'Укажите телефон в формате +7.'
  }
  if (!input.accepted) {
    errors.accepted = 'Без согласия перевод не уйдёт.'
  }
  return errors
}

export function passesLuhn(digits: string) {
  if (!/^\d{16}$/.test(digits)) return false
  let sum = 0
  for (let index = 0; index < digits.length; index += 1) {
    let digit = Number(digits[digits.length - 1 - index])
    if (index % 2 === 1) {
      digit *= 2
      if (digit > 9) digit -= 9
    }
    sum += digit
  }
  return sum % 10 === 0
}

/** Networks YooKassa accepts on a bank card: Mir, Visa, Mastercard, UnionPay, JCB. */
export type CardBrand = 'visa' | 'mastercard' | 'mir' | 'unionpay' | 'jcb' | 'unknown'

export const CARD_BRANDS: readonly CardBrand[] = ['visa', 'mastercard', 'mir', 'unionpay', 'jcb', 'unknown']

export function cardBrand(digits: string): CardBrand {
  if (/^4/.test(digits)) return 'visa'
  if (/^62/.test(digits)) return 'unionpay'
  if (/^35(?:2[89]|[3-8])/.test(digits)) return 'jcb'
  if (/^220[0-4]/.test(digits)) return 'mir'
  if (/^5[1-5]/.test(digits)) return 'mastercard'
  if (/^2(?:22[1-9]|2[3-9]\d|[3-6]\d{2}|7[01]\d|720)/.test(digits)) return 'mastercard'
  return 'unknown'
}

export function cardBrandLabel(brand: CardBrand) {
  if (brand === 'visa') return 'Visa'
  if (brand === 'mastercard') return 'Mastercard'
  if (brand === 'mir') return 'Мир'
  if (brand === 'unionpay') return 'UnionPay'
  if (brand === 'jcb') return 'JCB'
  return 'Карта'
}

const RU_MONTHS = [
  'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
  'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря',
]

/** Payout request opens on the last day of the month. */
export function isMonthlyPayoutOpen(now = new Date()) {
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
  return now.getDate() === lastDay
}

export function monthlyPayoutOpensLabel(now = new Date()) {
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
  return `${lastDay} ${RU_MONTHS[now.getMonth()]}`
}

export function billingMonthKey(now = new Date()) {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

/** One month of the service. A year is twelve months with 20% off. */
export const USER_SERVICE_PRICE_RUB = 1000
export const USER_SERVICE_YEAR_PRICE_RUB = 9_600
export const USER_SERVICE_YEAR_LIST_RUB = 12_000

export type SavedBillingCard = {
  holderName: string
  last4: string
  expiry: string
  brand: CardBrand
  /** Where the receipt goes. Falls back to the account email when absent. */
  receiptEmail?: string
}

export type BillingCardDraft = {
  holderName: string
  cardNumber: string
  expiry: string
  cvc: string
  receiptEmail: string
}

const EXPIRY_PATTERN = /^(0[1-9]|1[0-2])\/(\d{2})$/

export function isExpiryCurrent(expiry: string, now = new Date()) {
  const match = EXPIRY_PATTERN.exec(expiry)
  if (!match) return false
  const month = Number(match[1])
  const year = 2000 + Number(match[2])
  return now < new Date(year, month, 1)
}

export function cardNumberPreview(digits: string, savedLast4 = '') {
  const source = digits.length > 0
    ? digits.padEnd(16, '•')
    : savedLast4
      ? `••••••••••••${savedLast4}`
      : '••••••••••••••••'
  return source.replace(/(.{4})/g, '$1 ').trim()
}

export function validateBillingCardDraft(
  input: BillingCardDraft,
  options: { hasSavedCard: boolean; requireCvc: boolean },
): FieldErrors<keyof BillingCardDraft> {
  const errors: FieldErrors<keyof BillingCardDraft> = {}
  if (input.holderName.trim().length < 3) {
    errors.holderName = 'Укажите имя, как на карте.'
  }
  const replacingNumber = input.cardNumber.length > 0
  if (!options.hasSavedCard && !replacingNumber) {
    errors.cardNumber = 'Номер карты должен содержать 16 цифр.'
  } else if (replacingNumber && !/^\d{16}$/.test(input.cardNumber)) {
    errors.cardNumber = 'Номер карты должен содержать 16 цифр.'
  } else if (replacingNumber && !passesLuhn(input.cardNumber)) {
    errors.cardNumber = 'Проверьте номер карты.'
  }
  if (!EXPIRY_PATTERN.test(input.expiry)) {
    errors.expiry = 'Укажите срок в формате ММ/ГГ.'
  } else if (!isExpiryCurrent(input.expiry)) {
    errors.expiry = 'Срок действия карты истёк.'
  }
  if (options.requireCvc && replacingNumber && !/^\d{3,4}$/.test(input.cvc)) {
    errors.cvc = 'CVC должен содержать 3 или 4 цифры.'
  }
  if (!isReceiptEmail(input.receiptEmail)) {
    errors.receiptEmail = 'Укажите почту, на которую отправить чек.'
  }
  return errors
}

export function isReceiptEmail(value: string) {
  const email = value.trim()
  return email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

/** Keeps the mask YooKassa can show later. The full number and CVC are dropped. */
export function billingCardFromDraft(
  input: BillingCardDraft,
  previous: SavedBillingCard | null,
  options: { requireCvc: boolean },
): SavedBillingCard | null {
  if (hasFieldErrors(validateBillingCardDraft(input, {
    hasSavedCard: previous != null,
    requireCvc: options.requireCvc,
  }))) {
    return null
  }
  const holderName = input.holderName.trim()
  const receiptEmail = input.receiptEmail.trim()
  if (input.cardNumber.length === 0 && previous) {
    return { ...previous, holderName, expiry: input.expiry, receiptEmail }
  }
  return {
    holderName,
    last4: input.cardNumber.slice(-4),
    expiry: input.expiry,
    brand: cardBrand(input.cardNumber),
    receiptEmail,
  }
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
  } else if (!passesLuhn(input.cardNumber)) {
    errors.cardNumber = 'Проверьте номер карты.'
  }
  if (!EXPIRY_PATTERN.test(input.expiry)) {
    errors.expiry = 'Укажите срок в формате ММ/ГГ.'
  } else if (!isExpiryCurrent(input.expiry)) {
    errors.expiry = 'Срок действия карты истёк.'
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

export function renewalCountdownLabel(days: number) {
  const noun = formatSubscriptionDaysLeft(days)
  const mod10 = Math.abs(days) % 10
  const mod100 = Math.abs(days) % 100
  const verb = mod10 === 1 && mod100 !== 11 ? 'Остался' : 'Осталось'
  return `${verb} ${noun}`
}

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
  fullName: 'Иван Иванов',
  inn: '500100732259',
  phone: '79001234567',
  accepted: true,
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
