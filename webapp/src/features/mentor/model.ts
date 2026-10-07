/** 200 ₽ for each month a mentee has actually paid. A year is twelve months. */
export const MENTOR_CONNECTION_BONUS = 200

export function mentorConnectionBonusTotal(connectedUserCount: number) {
  return Math.max(0, connectedUserCount) * MENTOR_CONNECTION_BONUS
}

export function formatMentorBonus(amount: number) {
  return `+${amount}`
}
