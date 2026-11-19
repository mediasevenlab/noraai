import { expect, test } from 'bun:test'

import { keepOpen, readPackNotice } from './keep-notice'
import { advancePack, initialPackPlan, PACK_KINDS, PACK_REGIONS, packCell, packToRun } from './pack-sync'
import { readZipEntries, zipSingleXml } from './zip-xml'

const now = new Date('2026-11-19T08:00:00Z')

test('a pack walks kinds, then regions, then the previous day', () => {
  const first = initialPackPlan('2026-11-19')
  expect(packCell(first)).toMatchObject({ day: '2026-11-19', region: '01', documentType: 'epNotificationEF2020' })
  const nextKind = advancePack(first, now)
  expect(packCell(nextKind).documentType).toBe('epNotificationEOK2020')
  const lastKind = { ...first, kindIndex: PACK_KINDS.length - 1 }
  expect(advancePack(lastKind, now).regionIndex).toBe(1)
  expect(advancePack(lastKind, now).kindIndex).toBe(0)
})

test('the pack catalog stops at the floor and waits six hours before reading today again', () => {
  const floor = {
    ...initialPackPlan('2025-01-01'),
    regionIndex: PACK_REGIONS.length - 1,
    kindIndex: PACK_KINDS.length - 1,
  }
  const done = advancePack(floor, now)
  expect(done.phase).toBe('catchup')
  expect(done.day).toBe('2026-11-19')
  expect(packToRun(done, now)).toBeNull()
  const later = new Date(now.getTime() + 6 * 60 * 60 * 1000)
  expect(packToRun(done, later)?.day).toBe('2026-11-19')
})

test('a passed deadline is dropped and a future one stays', () => {
  const xml = '<ns5:endDT>2026-11-25T09:00:00+12:00</ns5:endDT><ns3:purchaseNumber>0156100010726000075</ns3:purchaseNumber>'
  expect(readPackNotice(xml)).toEqual({ number: '0156100010726000075', deadline: '2026-11-25T09:00:00+12:00' })
  expect(keepOpen('2026-11-25T09:00:00+12:00', now)).toBe(true)
  expect(keepOpen('2026-11-01T09:00:00+03:00', now)).toBe(false)
  expect(keepOpen('', now)).toBe(true)
})

test('a kept notice zip round-trips through the archive reader', () => {
  const xml = '<purchaseNumber>100</purchaseNumber>'
  const files = readZipEntries(zipSingleXml('100.xml', xml))
  expect(files).toEqual([{ name: '100.xml', xml }])
})
