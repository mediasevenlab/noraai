import { expect, test } from 'bun:test'

import {
  billingCardFromDraft,
  cardBrand,
  isMonthlyPayoutOpen,
  monthlyPayoutOpensLabel,
  formatCardNumber,
  formatPhone,
  formatPayoutAmount,
  hasFieldErrors,
  mentorPayoutTotal,
  DEMO_MENTOR_PAYOUTS,
  DEMO_MENTOR_PAYOUT_REQUISITES,
  DEMO_USER_SERVICE_PAYMENT,
  DEMO_USER_SUBSCRIPTION,
  DEMO_USER_REFERRAL_PAYOUTS,
  normalizeExpiry,
  formatSubscriptionDaysLeft,
  userReferralPayoutTotal,
  DEMO_USER_SUBSCRIPTION_DAYS_LEFT,
  isSubscriptionExpiringSoon,
  subscriptionPeriodElapsedPercent,
  validateMentorPayoutRequisites,
  validateUserReferralPayoutRequisites,
  validateUserServicePayment,
} from '../src/features/payments/model'

test('mentor payout requisites require bank identity fields', () => {
  expect(validateMentorPayoutRequisites({
    recipientName: 'И',
    bankName: '',
    bik: '123',
    accountNumber: '123',
    sbpPhone: '123',
  })).toEqual({
    recipientName: 'Укажите ФИО получателя.',
    bankName: 'Укажите название банка.',
    bik: 'БИК должен содержать 9 цифр.',
    accountNumber: 'Расчётный счёт должен содержать 20 цифр.',
    sbpPhone: 'Укажите телефон в формате 11 цифр.',
  })

  expect(hasFieldErrors(validateMentorPayoutRequisites({
    recipientName: 'Иван Иванов',
    bankName: 'Т-Банк',
    bik: '044525974',
    accountNumber: '40817810099910004312',
    sbpPhone: '',
  }))).toBe(false)
})

test('user service payment validates card payload', () => {
  expect(validateUserServicePayment({
    payerName: 'И',
    cardNumber: '4111',
    expiry: '13/25',
    cvc: '12',
  })).toEqual({
    payerName: 'Укажите имя плательщика.',
    cardNumber: 'Номер карты должен содержать 16 цифр.',
    expiry: 'Укажите срок в формате ММ/ГГ.',
    cvc: 'CVC должен содержать 3 или 4 цифры.',
  })

  expect(hasFieldErrors(validateUserServicePayment({
    payerName: 'Иван Иванов',
    cardNumber: '4111111111111111',
    expiry: '12/28',
    cvc: '123',
  }))).toBe(false)
})

test('payment formatters keep input readable', () => {
  expect(formatCardNumber('4111111111111111')).toBe('4111 1111 1111 1111')
  expect(normalizeExpiry('1228')).toBe('12/28')
  expect(formatPhone('79001234567')).toBe('+7 (900) 123-45-67')
})

test('demo mentor payouts expose monthly amounts and a shared total', () => {
  expect(DEMO_MENTOR_PAYOUTS).toHaveLength(2)
  expect(mentorPayoutTotal(DEMO_MENTOR_PAYOUTS)).toBe(2_800)
  expect(formatPayoutAmount(2_800)).toBe('2 800 ₽')
  expect(hasFieldErrors(validateMentorPayoutRequisites(DEMO_MENTOR_PAYOUT_REQUISITES))).toBe(false)
})

test('demo user billing and subscription cover paid and failed months', () => {
  expect(hasFieldErrors(validateUserServicePayment(DEMO_USER_SERVICE_PAYMENT))).toBe(false)
  expect(DEMO_USER_SUBSCRIPTION.some((month) => month.status === 'failed')).toBe(true)
  expect(DEMO_USER_REFERRAL_PAYOUTS.some((month) => month.status === 'pending')).toBe(true)
  expect(DEMO_USER_REFERRAL_PAYOUTS.some((month) => month.status === 'paid')).toBe(true)
  expect(userReferralPayoutTotal(DEMO_USER_REFERRAL_PAYOUTS)).toBe(1_800)
  expect(formatSubscriptionDaysLeft(DEMO_USER_SUBSCRIPTION_DAYS_LEFT)).toBe('2 дня')
  expect(subscriptionPeriodElapsedPercent(2, 30)).toBe(93)
  expect(subscriptionPeriodElapsedPercent(30, 30)).toBe(0)
  expect(subscriptionPeriodElapsedPercent(0, 30)).toBe(100)
  expect(isSubscriptionExpiringSoon(2)).toBe(true)
  expect(isSubscriptionExpiringSoon(10)).toBe(false)
})

test('user referral payout requisites skip bank name', () => {
  expect(hasFieldErrors(validateUserReferralPayoutRequisites({
    recipientName: 'Иван Иванов',
    bik: '044525974',
    accountNumber: '40817810099910004312',
    sbpPhone: '',
  }))).toBe(false)
  expect(validateUserReferralPayoutRequisites({
    recipientName: 'И',
    bik: '123',
    accountNumber: '123',
    sbpPhone: '12',
  })).toEqual({
    recipientName: 'Укажите ФИО получателя.',
    bik: 'БИК должен содержать 9 цифр.',
    accountNumber: 'Расчётный счёт должен содержать 20 цифр.',
    sbpPhone: 'Укажите телефон в формате 11 цифр.',
  })
})

test('payments pages prepare a tariff and a payout card without charging', async () => {
  const pages = await Bun.file(new URL('../src/features/payments/pages.tsx', import.meta.url)).text()
  expect(pages).toContain('USER_SERVICE_PRICE_RUB')
  expect(pages).toContain('история списаний')
  expect(pages).toContain('MENTOR_CONNECTION_BONUS')
  expect(pages).toContain('BillingCardPanel')
  expect(pages).not.toContain('UserBillingPanel')
  expect(pages).not.toContain('Оплата пока недоступна')
})

test('card brand follows the networks YooKassa accepts', () => {
  expect(cardBrand('4')).toBe('visa')
  expect(cardBrand('2204')).toBe('mir')
  expect(cardBrand('5213')).toBe('mastercard')
  expect(cardBrand('62')).toBe('unionpay')
  expect(cardBrand('3528')).toBe('jcb')
  expect(isMonthlyPayoutOpen(new Date('2026-10-31T12:00:00'))).toBe(true)
  expect(isMonthlyPayoutOpen(new Date('2026-10-06T12:00:00'))).toBe(false)
  expect(monthlyPayoutOpensLabel(new Date('2026-10-06T12:00:00'))).toBe('31 октября')
})

test('a saved billing card keeps only the mask', () => {
  const saved = billingCardFromDraft({
    holderName: 'Ivan Ivanov',
    cardNumber: '4111111111111111',
    expiry: '12/28',
    cvc: '123',
    receiptEmail: 'ivan@example.com',
  }, null, { requireCvc: true })
  expect(saved).toEqual({
    holderName: 'Ivan Ivanov',
    last4: '1111',
    expiry: '12/28',
    brand: 'visa',
    receiptEmail: 'ivan@example.com',
  })
  expect(JSON.stringify(saved)).not.toContain('4111111111111111')
  expect(JSON.stringify(saved)).not.toContain('123')
})
