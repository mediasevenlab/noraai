/** Fixed mentor payout for each connected user (placeholder until billing lands). */
export const MENTOR_CONNECTION_BONUS = 200

export function mentorConnectionBonusTotal(connectedUserCount: number) {
  return Math.max(0, connectedUserCount) * MENTOR_CONNECTION_BONUS
}

export function formatMentorBonus(amount: number) {
  return `+${amount}`
}
