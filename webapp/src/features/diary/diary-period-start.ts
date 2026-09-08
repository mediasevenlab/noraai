/**
 * Per-user diary calendar start overrides.
 * Default remains account `createdAt`; use this when historical meals were
 * imported before registration and the picker must open earlier.
 */
const DIARY_PERIOD_START_BY_EMAIL: Readonly<Record<string, string>> = {
  // Imported diary from 24nutrition (+ demo cards from 23 Jul).
  'rezanovdv@mail.ru': '2026-07-23T00:00:00.000Z',
}

export function diaryPeriodStartOverrideForEmail(
  email: string | null | undefined,
): string | undefined {
  if (!email) return undefined
  return DIARY_PERIOD_START_BY_EMAIL[email.trim().toLowerCase()]
}
