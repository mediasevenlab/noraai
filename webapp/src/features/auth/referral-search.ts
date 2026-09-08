/** TanStack may JSON-parse numeric `?ref=8` as a number; keep referral codes as strings. */
export function parseReferralSearchParam(value: unknown): string | undefined {
  if (typeof value === 'string') {
    const trimmed = value.trim()
    return trimmed === '' ? undefined : trimmed
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value)
  }
  return undefined
}
