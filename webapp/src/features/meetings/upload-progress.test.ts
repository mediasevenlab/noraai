import { expect, test } from 'bun:test'

import { bytesPerSecond, formatByteSize, uploadStatusLine } from './upload-progress'

const MB = 1024 * 1024

test('byte sizes stay readable in Russian', () => {
  expect(formatByteSize(0)).toBe('0 Б')
  expect(formatByteSize(4 * MB)).toBe('4 МБ')
  expect(formatByteSize(164 * MB)).toBe('164 МБ')
  expect(formatByteSize(1.3 * MB)).toBe('1,3 МБ')
})

test('speed uses the last two seconds of the upload', () => {
  const samples = [
    { at: 0, loaded: 0 },
    { at: 1000, loaded: 1 * MB },
    { at: 5000, loaded: 10 * MB },
    { at: 6000, loaded: 12 * MB },
  ]
  expect(bytesPerSecond(samples, 6000)).toBeCloseTo(2 * MB, -3)
  expect(bytesPerSecond(samples, 9000)).toBe(0)
})

test('the status line shows sent, total, and speed, then the save pause', () => {
  expect(uploadStatusLine({ loaded: 23 * MB, total: 164 * MB, bytesPerSecond: 1.3 * MB })).toBe(
    '23 МБ из 164 МБ · 1,3 МБ/с',
  )
  expect(uploadStatusLine({ loaded: 0, total: 164 * MB, bytesPerSecond: 0 })).toBe(
    '0 Б из 164 МБ · 0 МБ/с',
  )
  expect(uploadStatusLine({ loaded: 164 * MB, total: 164 * MB, bytesPerSecond: 0 })).toBe(
    '164 МБ из 164 МБ · сохраняем на сервере',
  )
})
