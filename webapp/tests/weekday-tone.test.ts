import { expect, test } from 'bun:test'

import {
  WEEKDAY_ICON_CLASS,
  WEEKDAY_TEXT_COLOR,
  WEEKDAY_TONE_CLASS,
  weekdayIconClass,
  weekdayToneClass,
} from '../src/features/diary/weekday-tone'

test('each weekday has its own clean chip tone', () => {
  expect(WEEKDAY_TONE_CLASS).toHaveLength(7)
  expect(new Set(WEEKDAY_TONE_CLASS).size).toBe(7)
  expect(new Set(WEEKDAY_TEXT_COLOR).size).toBe(7)
  expect(WEEKDAY_ICON_CLASS).toHaveLength(7)
  expect(WEEKDAY_TONE_CLASS.join(' ')).not.toContain('--nora-tint')
  expect(WEEKDAY_TONE_CLASS.join(' ')).not.toContain('--nora-badge-')
  expect(WEEKDAY_TONE_CLASS.join(' ')).not.toContain('yellow-text)_70%')
  expect(weekdayToneClass(0)).toContain('#e11d48')
  expect(weekdayToneClass(4)).toContain('#ea580c')
  expect(weekdayToneClass(6)).toContain('#db2777')
  expect(weekdayToneClass(7)).toBe(weekdayToneClass(0))
  expect(weekdayToneClass(-1)).toBe(weekdayToneClass(6))
  expect(weekdayIconClass(0)).toBe('text-[#e11d48]')
  expect(weekdayIconClass(4)).toBe('text-[#ea580c]')
  expect(weekdayIconClass(0)).not.toContain('bg-[')
})
