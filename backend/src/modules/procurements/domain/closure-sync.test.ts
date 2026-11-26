import { expect, test } from 'bun:test'

import { advanceClosure, CLOSURE_KINDS, closureCell, closureCellsDone, closureNumbers, closureStatus, closureToRun, initialClosurePlan } from './closure-sync'
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

test('the closing bar counts finished steps and waits after today is read', () => {
  const start = { ...initialClosurePlan('2026-11-26'), startedAt: now.toISOString(), removed: 0 }
  const early = closureStatus(start, now)
  expect(early.phase).toBe('closure')
  expect(early.cellsDone).toBe(0)
  expect(early.note).toBe('Скорость ещё считается')
  expect(early.day).toContain('регион 01')

  const moved = { ...start, regionIndex: 1, removed: 4 }
  const reading = closureStatus(moved, now)
  expect(reading.cellsDone).toBe(CLOSURE_KINDS.length)
  expect(reading.removed).toBe(4)

  const finished = {
    ...start,
    phase: 'catchup' as const,
    lastClosedDay: '2026-11-25',
    todaySweptAt: now.toISOString(),
    removed: 12,
  }
  const quiet = closureStatus(finished, now)
  expect(quiet.phase).toBe('closure-daily')
  expect(quiet.done).toBe(quiet.total)
  expect(quiet.note).toContain('Следующая через')
  expect(quiet.cellsDone).toBe(quiet.cellsTotal)
})

test('the closing estimate follows the pace since the speed change', () => {
  const slow = {
    ...initialClosurePlan('2026-11-26'),
    startedAt: '2026-11-20T08:00:00.000Z',
    regionIndex: 2,
  }
  const done = closureCellsDone(slow, '2026-11-26')
  const paced = {
    ...slow,
    paceStartedAt: '2026-11-26T06:00:00.000Z',
    paceBaseDone: done - 40,
  }
  expect(closureStatus(paced, now).note).toContain('около')
  expect(closureStatus({ ...slow, regionIndex: 2, kindIndex: 5 }, now).note).toBe('Скорость ещё считается')
})

test('a closing file yields the purchase number and ignores other digits', () => {
  const xml = '<ns2:purchaseNoticeNumber>32515498728</ns2:purchaseNoticeNumber><id>999999999999</id><notificationNumber>0123456789012</notificationNumber>'
  expect(closureNumbers(xml)).toEqual(['32515498728', '0123456789012'])
})
