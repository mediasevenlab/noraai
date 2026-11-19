import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { expect, test } from 'bun:test'

import { openNoticeStore } from './notice-store'

test('saved pages filter by subject and law without listing a notice that is still queued', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'nora-saved-'))
  const store = openNoticeStore(dir)
  store.remember(notice('100', 'аукцион 44-ФЗ', 'Поставка топлива', 'Дорожная служба'))
  store.markSaved('100', 20)
  store.remember(notice('200', '223-ФЗ', 'Ремонт кровли', 'Школа'))
  store.markSaved('200', 20)
  store.remember(notice('300', 'запрос котировок', 'Поставка топлива', 'Больница'))
  await store.close()
  const reading = openNoticeStore(dir)

  const fuel = reading.savedPage(1, { text: 'ТОПЛИВА', laws: [] })
  expect(fuel.total).toBe(1)
  expect(fuel.notices.map((item) => item.number)).toEqual(['100'])

  const law = reading.savedPage(1, { text: '', laws: ['223'] })
  expect(law.total).toBe(1)
  expect(law.notices[0]?.customer).toBe('Школа')

  const missing = reading.savedPage(1, { text: 'топлива', laws: ['615'] })
  expect(missing.total).toBe(0)
  expect(missing.notices).toEqual([])

  reading.close()
  await rm(dir, { recursive: true, force: true })
})

function notice(number: string, law: string, object: string, customer: string) {
  return {
    number,
    subsystem: 'PRIZ',
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
