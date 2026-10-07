/** 200 ₽ once, for the first payment a referred user makes. A year is twelve months. */
export const USER_REFERRAL_BONUS = 200

export function userReferralBonusTotal(referralCount: number) {
  return Math.max(0, referralCount) * USER_REFERRAL_BONUS
}

export function formatUserReferralBonus(amount: number) {
  return `+${amount}`
}
