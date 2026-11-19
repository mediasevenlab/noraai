import { expect, test } from 'bun:test'

import { keepOpen, readPackNotice } from './keep-notice'
import { presentDate, readPackCard } from './pack-card'
import { advancePack, initialPackPlan, PACK_KINDS, packCellsDone, packCellsTotal, packEta, PACK_REGIONS, packCell, packToRun } from './pack-sync'
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

test('progress counts finished days and estimates the rest from the pace', () => {
  const today = '2026-11-19'
  const total = packCellsTotal(today)
  expect(total).toBe(688 * PACK_REGIONS.length * PACK_KINDS.length)
  const started = { ...initialPackPlan(today), regionIndex: 6, kindIndex: 0, startedAt: '2026-11-19T07:00:00Z', baseDone: 0 }
  expect(packCellsDone(started, today)).toBe(6 * PACK_KINDS.length)
  const later = new Date('2026-11-19T09:00:00Z')
  expect(packEta(started, later).eta).toMatch(/^около /)
  expect(packEta(initialPackPlan(today), later).eta).toBe('Скорость ещё считается')
})

test('a pack card keeps the subject, price and a readable date', () => {
  const card = readPackCard('<purchaseObjectInfo>Поставка топлива</purchaseObjectInfo><fullName>Заказчик</fullName><maxPrice>1240638.5</maxPrice><publishDTInEIS>2026-11-17T10:00:00+03:00</publishDTInEIS><purchaseNumber>100</purchaseNumber>')
  expect(card.object).toBe('Поставка топлива')
  expect(card.customer).toBe('Заказчик')
  expect(card.price).toBe('1 240 638,50 ₽')
  expect(card.published).toBe('2026-11-17')
  expect(presentDate(card.published)).toBe('17.11.2026')
})

test('a kept notice zip round-trips through the archive reader', () => {
  const xml = '<purchaseNumber>100</purchaseNumber>'
  const files = readZipEntries(zipSingleXml('100.xml', xml))
  expect(files).toEqual([{ name: '100.xml', xml }])
})
