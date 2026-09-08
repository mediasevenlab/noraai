import { expect, test } from 'bun:test'

import {
  formatUserReferralBonus,
  USER_REFERRAL_BONUS,
  userReferralBonusTotal,
} from '../src/features/users/model'

test('user referral bonus is a fixed per-invite amount', () => {
  expect(USER_REFERRAL_BONUS).toBe(200)
  expect(userReferralBonusTotal(0)).toBe(0)
  expect(userReferralBonusTotal(5)).toBe(1_000)
  expect(formatUserReferralBonus(200)).toBe('+200')
  expect(formatUserReferralBonus(1_000)).toBe('+1000')
})
