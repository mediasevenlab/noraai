import { expect, test } from 'bun:test'

import {
  formatMentorBonus,
  MENTOR_CONNECTION_BONUS,
  mentorConnectionBonusTotal,
} from '../src/features/mentor/model'

test('mentor connection bonus is fixed per connected user', () => {
  expect(MENTOR_CONNECTION_BONUS).toBe(200)
  expect(mentorConnectionBonusTotal(0)).toBe(0)
  expect(mentorConnectionBonusTotal(8)).toBe(1_600)
  expect(mentorConnectionBonusTotal(-1)).toBe(0)
})

test('mentor bonus labels keep the leading plus', () => {
  expect(formatMentorBonus(200)).toBe('+200')
  expect(formatMentorBonus(1_600)).toBe('+1600')
})
