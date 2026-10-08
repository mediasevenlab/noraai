import { expect, test } from 'bun:test'

import { subscriptionCapsuleVisible, subscriptionFreezeActive } from '../src/features/payments/subscription-access'

const unpaid = { renewalNotice: 'unpaid' as const }
const failed = { renewalNotice: 'failed' as const }
const ending = { renewalNotice: 'ending' as const }
const paid = { renewalNotice: null }

test('a user without coverage is frozen outside the account pages', () => {
  expect(subscriptionFreezeActive({ overview: unpaid, pathname: '/app/general', role: 'user' })).toBe(true)
  expect(subscriptionFreezeActive({ overview: unpaid, pathname: '/app/feed', role: 'user' })).toBe(true)
  expect(subscriptionFreezeActive({ overview: unpaid, pathname: '/app/payments', role: 'user' })).toBe(false)
  expect(subscriptionFreezeActive({ overview: unpaid, pathname: '/app/referrals', role: 'user' })).toBe(false)
  expect(subscriptionFreezeActive({ overview: unpaid, pathname: '/app/settings', role: 'user' })).toBe(false)
  expect(subscriptionFreezeActive({ overview: unpaid, pathname: '/app/profile', role: 'user' })).toBe(false)
  expect(subscriptionFreezeActive({ overview: unpaid, pathname: '/mentor/users', role: 'mentor' })).toBe(false)
})

test('the mobile capsule stays until payment when coverage has ended, and hides for one day during the countdown', () => {
  expect(subscriptionCapsuleVisible({ notice: 'ending', dismissedOn: null, today: '2026-10-07' })).toBe(true)
  expect(subscriptionCapsuleVisible({ notice: 'ending', dismissedOn: '2026-10-07', today: '2026-10-07' })).toBe(false)
  expect(subscriptionCapsuleVisible({ notice: 'ending', dismissedOn: '2026-10-07', today: '2026-10-08' })).toBe(true)
  expect(subscriptionCapsuleVisible({ notice: 'unpaid', dismissedOn: '2026-10-07', today: '2026-10-07' })).toBe(true)
  expect(subscriptionCapsuleVisible({ notice: 'failed', dismissedOn: '2026-10-07', today: '2026-10-07' })).toBe(true)
  expect(subscriptionCapsuleVisible({ notice: null, dismissedOn: null, today: '2026-10-07' })).toBe(false)
})

test('coverage, a countdown, a charge still in flight, other roles, and a still-loading overview stay open', () => {
  expect(subscriptionFreezeActive({ overview: paid, pathname: '/app/general', role: 'user' })).toBe(false)
  expect(subscriptionFreezeActive({ overview: ending, pathname: '/app/general', role: 'user' })).toBe(false)
  expect(subscriptionFreezeActive({ overview: failed, pathname: '/app/general', role: 'user' })).toBe(true)
  expect(subscriptionFreezeActive({ overview: unpaid, pathname: '/app/general', role: 'mentor' })).toBe(false)
  expect(subscriptionFreezeActive({ overview: null, pathname: '/app/general', role: 'user' })).toBe(false)
})
