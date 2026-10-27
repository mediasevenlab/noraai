import { expect, test } from 'bun:test'

import { expectedMeetingPartLength, meetingPartCount } from './meeting-parts'

test('a recording is split into 4 MB pieces, with a short tail', () => {
  const part = 4
  expect(meetingPartCount(9, part)).toBe(3)
  expect(expectedMeetingPartLength(9, 0, 3, part)).toBe(4)
  expect(expectedMeetingPartLength(9, 1, 3, part)).toBe(4)
  expect(expectedMeetingPartLength(9, 2, 3, part)).toBe(1)
})

test('a file that fits in one piece is a single part', () => {
  expect(meetingPartCount(3, 4)).toBe(1)
  expect(expectedMeetingPartLength(3, 0, 1, 4)).toBe(3)
})

test('an empty file and a mismatched part count are rejected', () => {
  expect(() => meetingPartCount(0, 4)).toThrow('Файл пустой')
  expect(() => expectedMeetingPartLength(9, 0, 2, 4)).toThrow('Число частей не сходится с размером файла')
})
