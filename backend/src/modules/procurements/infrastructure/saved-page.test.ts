import { mkdirSync, writeFileSync } from 'node:fs'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { expect, test } from 'bun:test'

import { initialPackPlan } from '../domain/pack-sync'
import { zipSingleXml } from '../domain/zip-xml'
import { openNoticeStore } from './notice-store'

test('saved pages filter by subject and law without listing a notice that is still queued', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'nora-saved-'))
  const store = openNoticeStore(dir)
  store.remember(notice('100', 'аукцион 44-ФЗ', 'Поставка топлива', 'Дорожная служба'))
  store.markSaved('100', 20)
  store.remember(notice('200', '223-ФЗ', 'Ремонт кровли', 'Школа', 'RI223'))
  store.markSaved('200', 20)
  store.remember(notice('400', 'запрос котировок', 'Кабель', 'Сеть'))
  store.markSaved('400', 20)
  store.remember(notice('300', 'запрос котировок', 'Поставка топлива', 'Больница'))
  await store.close()
  const reading = openNoticeStore(dir)

  const fuel = reading.savedPage(1, { text: 'ТОПЛИВА', laws: [] })
  expect(fuel.total).toBe(1)
  expect(fuel.notices.map((item) => item.number)).toEqual(['100'])

  const law = reading.savedPage(1, { text: '', laws: ['223'] })
  expect(law.total).toBe(1)
  expect(law.notices[0]?.customer).toBe('Школа')

  const federal = reading.savedPage(1, { text: '', laws: ['44'] })
  expect(federal.notices.map((item) => item.number).sort()).toEqual(['100', '400'])

  const missing = reading.savedPage(1, { text: 'топлива', laws: ['615'] })
  expect(missing.total).toBe(0)
  expect(missing.notices).toEqual([])

  reading.close()
  await rm(dir, { recursive: true, force: true })
})

test('saved search reads the notice text and leaves the download cursor alone', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'nora-saved-text-'))
  const store = openNoticeStore(dir)
  store.savePackPlan({
    ...initialPackPlan('2026-11-19'),
    day: '2025-01-10',
    regionIndex: 46,
    kindIndex: 3,
    dropped: 7,
    startedAt: '2026-11-19T00:00:00.000Z',
    baseDone: 10,
  })
  store.remember(notice('100', 'аукцион 44-ФЗ', 'Поставка оборудования', 'Завод'))
  store.markSaved('100', 20)
  mkdirSync(join(dir, 'zips'), { recursive: true })
  writeFileSync(join(dir, 'zips', '100.zip'), zipSingleXml('100.xml', `
    <purchaseObject><name>Трансформатор масляный</name></purchaseObject>
    <contactEMail>snab@zavod.ru</contactEMail>
    <fileName>чертеж-ввода.pdf</fileName>
    <signature>УНИКАЛЬНАЯПОДПИСЬ</signature>
  `))
  expect(store.indexNext()).toBe(true)
  store.remember(notice('200', '223-ФЗ', 'Поставка топлива', 'Школа', 'RI223'))
  store.markSaved('200', 20)

  const position = store.savedPage(1, { text: 'масляный', laws: [] })
  expect(position.notices.map((item) => item.number)).toEqual(['100'])
  const mail = store.savedPage(1, { text: 'snab@zavod.ru', laws: [] })
  expect(mail.total).toBe(1)
  const file = store.savedPage(1, { text: 'чертеж-ввода', laws: [] })
  expect(file.total).toBe(1)
  const hidden = store.savedPage(1, { text: 'уникальнаяподпись', laws: [] })
  expect(hidden.total).toBe(0)
  const fuel = store.savedPage(1, { text: 'топлива', laws: [] })
  expect(fuel.notices.map((item) => item.number)).toEqual(['200'])
  const otherLaw = store.savedPage(1, { text: 'масляный', laws: ['223'] })
  expect(otherLaw.total).toBe(0)

  const plan = store.packPlan()
  expect(plan.day).toBe('2025-01-10')
  expect(plan.regionIndex).toBe(46)
  expect(plan.kindIndex).toBe(3)
  expect(plan.dropped).toBe(7)
  expect(store.counts().saved).toBe(2)

  store.close()
  await rm(dir, { recursive: true, force: true })
})

test('several phrases match any of them, and rank orders cards by how many matched', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'nora-saved-phrases-'))
  const store = openNoticeStore(dir)
  store.savePackPlan({
    ...initialPackPlan('2026-11-19'),
    day: '2025-01-10',
    regionIndex: 46,
    kindIndex: 3,
    dropped: 7,
    startedAt: '2026-11-19T00:00:00.000Z',
    baseDone: 10,
  })
  store.remember({ ...notice('100', 'аукцион 44-ФЗ', 'Поставка оборудования', 'Завод'), published: '2026-11-01' })
  store.markSaved('100', 20)
  mkdirSync(join(dir, 'zips'), { recursive: true })
  writeFileSync(join(dir, 'zips', '100.zip'), zipSingleXml('100.xml', '<name>Трансформатор масляный</name>'))
  expect(store.indexNext()).toBe(true)
  store.remember({ ...notice('200', 'аукцион 44-ФЗ', 'Поставка топлива', 'Школа'), published: '2026-11-19' })
  store.markSaved('200', 20)
  store.remember({ ...notice('300', 'аукцион 44-ФЗ', 'Кабель масляный, поставка топлива', 'Сеть'), published: '2026-11-10' })
  store.markSaved('300', 20)
  store.remember({ ...notice('400', 'аукцион 44-ФЗ', 'Масляный топливный', 'Склад'), published: '2026-11-20' })

  const phrases = ['масляный', 'топлива']
  const any = store.savedPage(1, { phrases, laws: [], rank: false })
  expect(any.notices.map((item) => item.number)).toEqual(['200', '300', '100'])
  const ranked = store.savedPage(1, { phrases, laws: [], rank: true })
  expect(ranked.notices.map((item) => item.number)).toEqual(['300', '200', '100'])
  expect(ranked.notices.map((item) => item.matches)).toEqual([2, 1, 1])

  const plan = store.packPlan()
  expect(plan.day).toBe('2025-01-10')
  expect(plan.regionIndex).toBe(46)
  expect(plan.kindIndex).toBe(3)
  expect(plan.dropped).toBe(7)
  store.close()
  await rm(dir, { recursive: true, force: true })
})

test('a passed deadline removes the saved card and archive without moving the download cursor', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'nora-expire-'))
  const store = openNoticeStore(dir, () => new Date('2026-11-23T06:00:00Z'))
  store.savePackPlan({
    ...initialPackPlan('2026-11-19'),
    day: '2025-01-10',
    regionIndex: 46,
    kindIndex: 3,
    dropped: 7,
    startedAt: '2026-11-19T00:00:00.000Z',
    baseDone: 10,
  })
  store.remember({ ...notice('100', 'аукцион 44-ФЗ', 'Поставка', 'Завод'), deadline: '2026-11-01T09:00:00+03:00' })
  store.markSaved('100', 40)
  store.remember({ ...notice('200', 'аукцион 44-ФЗ', 'Поставка', 'Школа'), deadline: '2026-12-01T09:00:00+03:00' })
  store.markSaved('200', 40)
  store.remember({ ...notice('300', 'аукцион 44-ФЗ', 'Поставка', 'Больница'), deadline: '' })
  store.markSaved('300', 10)
  mkdirSync(join(dir, 'zips'), { recursive: true })
  writeFileSync(join(dir, 'zips', '100.zip'), zipSingleXml('100.xml', '<purchaseNumber>100</purchaseNumber>'))
  writeFileSync(join(dir, 'zips', '200.zip'), zipSingleXml('200.xml', '<purchaseNumber>200</purchaseNumber>'))

  expect(store.expireNext()).toBe(true)
  expect(store.savedPage(1, { text: '', laws: [] }).notices.map((item) => item.number).sort()).toEqual(['200', '300'])
  expect(await Bun.file(join(dir, 'zips', '100.zip')).exists()).toBe(false)
  expect(await Bun.file(join(dir, 'zips', '200.zip')).exists()).toBe(true)
  expect(store.expireNext()).toBe(false)
  expect(store.counts().saved).toBe(2)
  const plan = store.packPlan()
  expect(plan.day).toBe('2025-01-10')
  expect(plan.regionIndex).toBe(46)
  expect(plan.dropped).toBe(7)

  store.close()
  await rm(dir, { recursive: true, force: true })
})

function notice(number: string, law: string, object: string, customer: string, subsystem = 'PRIZ') {
  return {
    number,
    subsystem,
    law,
    status: 'Подача заявок',
    object,
    customer,
    price: '',
    published: '2026-11-19',
    updated: '',
    deadline: '2026-12-01',
    url: '',
  }
}
