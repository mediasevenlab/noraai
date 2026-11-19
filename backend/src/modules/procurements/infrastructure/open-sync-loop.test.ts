import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { expect, test } from 'bun:test'

import { startOpenSync } from '../application/open-sync-loop'
import { openNoticeStore } from './notice-store'

test('the sync keeps a notice once, saves the archive, and does not retry a failure', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'nora-open-'))
  const store = openNoticeStore(dir, () => new Date('2026-11-19T08:00:00Z'))
  let pages = 0
  const downloads: string[] = []
  const running = startOpenSync({
    store,
    now: () => new Date('2026-11-19T08:00:00Z'),
    sleep: (_ms, signal) => new Promise((resolve) => {
      const timer = setTimeout(resolve, 5)
      signal.addEventListener('abort', () => {
        clearTimeout(timer)
        resolve()
      }, { once: true })
    }),
    search: async () => {
      pages += 1
      if (pages > 1) return []
      return [{
        law: '44-ФЗ Электронный аукцион',
        status: 'Подача заявок',
        number: pages === 1 ? '100' : '200',
        object: 'Поставка',
        customer: 'Заказчик',
        price: '10 ₽',
        published: '19.11.2026',
        updated: '19.11.2026',
        deadline: '01.12.2026',
        url: 'https://zakupki.gov.ru/card',
      }, {
        law: '223-ФЗ',
        status: 'Подача заявок',
        number: '200',
        object: 'Топливо',
        customer: 'Заказчик',
        price: '20 ₽',
        published: '19.11.2026',
        updated: '19.11.2026',
        deadline: '02.12.2026',
        url: 'https://zakupki.gov.ru/card-2',
      }]
    },
    download: async (notice) => {
      downloads.push(notice.number)
      if (notice.number === '200') throw new Error('ЕИС не отдала архив.')
      return new Uint8Array([1, 2, 3, 4])
    },
  })
  const ready = Date.now() + 2_000
  while (store.counts().saved + store.counts().failed < 2 && Date.now() < ready) {
    await new Promise((resolve) => setTimeout(resolve, 10))
  }
  await running.stop()
  store.remember({
    number: '100',
    subsystem: 'PRIZ',
    law: '44-ФЗ',
    status: 'Подача заявок',
    object: 'ещё раз',
    customer: '',
    price: '',
    published: '',
    updated: '',
    deadline: '',
    url: '',
  })
  expect(store.counts()).toMatchObject({ saved: 1, failed: 1, queued: 0, zipBytes: 4 })
  expect(downloads.filter((number) => number === '200')).toEqual(['200'])
  expect(await Bun.file(join(dir, 'zips', '100.zip')).exists()).toBe(true)
  store.close()
  await rm(dir, { recursive: true, force: true })
})
