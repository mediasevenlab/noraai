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
