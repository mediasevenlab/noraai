import { expect, test } from 'bun:test'

import {
  eisDay,
  initialPlan,
  openSearchUrl,
  planAfterPage,
  planToRun,
  subsystemFor,
} from './open-sync'

const now = new Date('2026-11-19T08:00:00Z')

test('a full page stays on the same day and a short page steps back', () => {
  const plan = initialPlan('2026-11-19')
  expect(planAfterPage(plan, 50, now)).toMatchObject({ day: '2026-11-19', page: 2, phase: 'catalog' })
  expect(planAfterPage(plan, 12, now)).toMatchObject({ day: '2026-11-18', page: 1, phase: 'catalog' })
})

test('the catalog stops at the floor and the same day is not scanned again for six hours', () => {
  const done = planAfterPage({ ...initialPlan('2025-01-01'), day: '2025-01-01' }, 0, now)
  expect(done.phase).toBe('catchup')
  expect(done.lastClosedDay).toBe('2026-11-18')
  expect(planToRun(done, now)).toBeNull()
  const later = new Date(now.getTime() + 6 * 60 * 60 * 1000)
  expect(planToRun(done, later)).toMatchObject({ day: '2026-11-19', page: 1 })
})

test('a catch-up continues the day it already started', () => {
  const plan = {
    phase: 'catchup' as const,
    day: '2026-11-18',
    page: 4,
    lastClosedDay: '2026-11-17',
    todaySweptAt: '',
    truncatedDays: [],
  }
  expect(planToRun(plan, now)).toEqual(plan)
  expect(planAfterPage(plan, 3, now)).toMatchObject({ day: '2026-11-19', page: 1, lastClosedDay: '2026-11-18' })
})

test('a day that never ends is remembered and the sweep moves on', () => {
  const stuck = { ...initialPlan('2026-11-19'), page: 400 }
  const next = planAfterPage(stuck, 50, now)
  expect(next.truncatedDays).toEqual(['2026-11-19'])
  expect(next).toMatchObject({ day: '2026-11-18', page: 1 })
})

test('the law line chooses the archive and the search stays on open notices for one day', () => {
  expect(subsystemFor('44-ФЗ Электронный аукцион')).toBe('PRIZ')
  expect(subsystemFor('223-ФЗ Иной способ')).toBe('RI223')
  expect(subsystemFor('ПП РФ 615 Электронный аукцион')).toBe('RD615')
  const url = openSearchUrl('2026-11-19', 3)
  expect(url.searchParams.get('af')).toBe('on')
  expect(url.searchParams.get('publishDateFrom')).toBe('19.11.2026')
  expect(url.searchParams.get('publishDateTo')).toBe('19.11.2026')
  expect(url.searchParams.get('pageNumber')).toBe('3')
  expect(url.searchParams.get('recordsPerPage')).toBe('_50')
  expect(eisDay('2026-01-02')).toBe('02.01.2026')
})
