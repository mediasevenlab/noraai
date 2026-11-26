import { expect, test } from 'bun:test'

import { advanceClosure, CLOSURE_KINDS, closureCell, closureNumbers, closureToRun, initialClosurePlan } from './closure-sync'
import { PACK_REGIONS } from './pack-sync'

const now = new Date('2026-11-26T08:00:00Z')

test('closing documents walk kinds, then regions, then the previous day', () => {
  const first = initialClosurePlan('2026-11-26')
  expect(closureCell(first)).toMatchObject({ day: '2026-11-26', region: '01', documentType: 'epProtocolEZT2020Final' })
  expect(advanceClosure(first, now).kindIndex).toBe(1)
  const lastKind = { ...first, kindIndex: CLOSURE_KINDS.length - 1 }
  const nextRegion = advanceClosure(lastKind, now)
  expect(nextRegion.regionIndex).toBe(1)
  expect(nextRegion.kindIndex).toBe(0)
})

test('the closing catalog stops at the floor and waits six hours before reading today again', () => {
  const floor = {
    ...initialClosurePlan('2025-01-01'),
    regionIndex: PACK_REGIONS.length - 1,
    kindIndex: CLOSURE_KINDS.length - 1,
  }
  const done = advanceClosure(floor, now)
  expect(done.phase).toBe('catchup')
  expect(done.day).toBe('2026-11-26')
  expect(closureToRun(done, now)).toBeNull()
  const later = new Date(now.getTime() + 6 * 60 * 60 * 1000)
  expect(closureToRun(done, later)?.day).toBe('2026-11-26')
})

test('a closing file yields the purchase number and ignores other digits', () => {
  const xml = '<ns2:purchaseNoticeNumber>32515498728</ns2:purchaseNoticeNumber><id>999999999999</id><notificationNumber>0123456789012</notificationNumber>'
  expect(closureNumbers(xml)).toEqual(['32515498728', '0123456789012'])
})
