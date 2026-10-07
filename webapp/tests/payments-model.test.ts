import { expect, test } from 'bun:test'

import { ledgerPageWindow } from '../src/features/payments/BillingHistory'
import { mentorPayoutStatus } from '../src/features/payments/MentorPayoutPanel'
import {
  billingCardFromDraft,
  cardBrand,
  isMonthlyPayoutOpen,
  monthlyPayoutOpensLabel,
  formatCardNumber,
  formatPhone,
  formatPayoutAmount,
  hasFieldErrors,
  mentorPayoutNet,
  mentorPayoutPhoneMask,
  mentorPayoutTotal,
  mentorPayoutWithholding,
  nextMentorPayoutLabel,
  DEMO_MENTOR_PAYOUTS,
  DEMO_MENTOR_PAYOUT_REQUISITES,
  DEMO_USER_SERVICE_PAYMENT,
  DEMO_USER_SUBSCRIPTION,
  DEMO_USER_REFERRAL_PAYOUTS,
  normalizeExpiry,
  formatSubscriptionDaysLeft,
  renewalCountdownLabel,
  unpaidBonusRub,
  userReferralPayoutTotal,
  DEMO_USER_SUBSCRIPTION_DAYS_LEFT,
  isSubscriptionExpiringSoon,
  subscriptionPeriodElapsedPercent,
  validateMentorPayoutRequisites,
  validateUserReferralPayoutRequisites,
  validateUserServicePayment,
} from '../src/features/payments/model'

test('a payout note does not repeat the amount already shown beside the form', () => {
  const waiting = mentorPayoutStatus({ accrued: 1_400, phone: null, ready: false })
  expect(waiting).toBe('Перевод не уйдёт, пока нет телефона и согласия.')
  const ready = mentorPayoutStatus({
    accrued: 1_400,
    phone: '79001234567',
    ready: true,
    now: new Date(2026, 9, 7),
  })
  expect(ready).toBe('Выплата 1 ноября.')
  expect(mentorPayoutStatus({
    accrued: 1_000,
    kind: 'referral',
    phone: '79137067236',
    ready: true,
    now: new Date(2026, 9, 7),
  })).toBe('Бонусы можно копить или запросить выплату в любой момент.')
  expect(unpaidBonusRub(1_000, 0)).toBe(1_000)
  expect(unpaidBonusRub(1_000, 1_000)).toBe(0)
  expect(unpaidBonusRub(1_200, 1_000)).toBe(200)
})

test('mentor payout requisites are a name, an INN, a phone and consent', () => {
  expect(validateMentorPayoutRequisites({
    fullName: 'Иван',
    inn: '123',
    phone: '900',
    accepted: false,
  })).toEqual({
    fullName: 'Укажите фамилию и имя, как в паспорте.',
    inn: 'ИНН физлица — 12 цифр.',
    phone: 'Укажите телефон в формате +7.',
    accepted: 'Без согласия перевод не уйдёт.',
  })

  expect(validateMentorPayoutRequisites({
    fullName: 'Ивлев Игорь Юрьевич',
    inn: '555555555555',
    phone: '79137067236',
    accepted: true,
  }).inn).toBe('Контрольные цифры ИНН не сходятся.')
  expect(hasFieldErrors(validateMentorPayoutRequisites(DEMO_MENTOR_PAYOUT_REQUISITES))).toBe(false)
  expect(mentorPayoutWithholding(200)).toBe(26)
  expect(mentorPayoutNet(200)).toBe(174)
  expect(mentorPayoutWithholding(600)).toBe(78)
  expect(mentorPayoutNet(600)).toBe(522)
  expect(mentorPayoutPhoneMask('79001234567')).toBe('+7 … 67')
  expect(nextMentorPayoutLabel(new Date(2026, 9, 7))).toBe('1 ноября')
  expect(nextMentorPayoutLabel(new Date(2026, 10, 1))).toBe('1 ноября')
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

test('the user pays on the YooKassa page and the mentor saves a phone payout', async () => {
  const pages = await Bun.file(new URL('../src/features/payments/pages.tsx', import.meta.url)).text()
  const panel = await Bun.file(new URL('../src/features/payments/BillingCardPanel.tsx', import.meta.url)).text()
  expect(panel).toContain('USER_SERVICE_PRICE_RUB')
  expect(panel).toContain('USER_SERVICE_YEAR_PRICE_RUB')
  expect(panel).toContain('Отменить подписку')
  expect(panel).toContain('Дневник питания')
  expect(panel).toContain('скидка 20%')
  expect(pages).toContain('История платежей')
  expect(pages).toContain('чек уходит на почту')
  expect(pages).toContain('SubscriptionPayPanel')
  expect(pages).toContain('MENTOR_CONNECTION_BONUS')
  expect(pages).toContain('MentorPayoutPanel')
  expect(pages).toContain('К получению')
  expect(pages).not.toContain('useBillingCardForm')
  expect(pages).not.toContain('Карта для выплаты')
  expect(pages).not.toContain('UserBillingPanel')
  expect(pages).not.toContain('Оплата пока недоступна')
})

test('charge history shows ten rows and a second page for the rest', () => {
  expect(ledgerPageWindow(12, 1)).toEqual({ current: 1, from: 1, to: 10, totalPages: 2 })
  expect(ledgerPageWindow(12, 2)).toEqual({ current: 2, from: 11, to: 12, totalPages: 2 })
  expect(ledgerPageWindow(10, 1).totalPages).toBe(1)
  expect(ledgerPageWindow(0, 4)).toEqual({ current: 1, from: 0, to: 0, totalPages: 1 })
})

test('the renewal countdown names one, two, and three days', () => {
  expect(renewalCountdownLabel(1)).toBe('Остался 1 день')
  expect(renewalCountdownLabel(2)).toBe('Осталось 2 дня')
  expect(renewalCountdownLabel(3)).toBe('Осталось 3 дня')
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
