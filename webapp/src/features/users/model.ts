/** Fixed user payout for each invited referral (placeholder until billing lands). */
export const USER_REFERRAL_BONUS = 200

export function userReferralBonusTotal(referralCount: number) {
  return Math.max(0, referralCount) * USER_REFERRAL_BONUS
}

export function formatUserReferralBonus(amount: number) {
  return `+${amount}`
}
