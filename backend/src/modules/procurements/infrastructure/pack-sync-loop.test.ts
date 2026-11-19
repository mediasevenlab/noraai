import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { expect, test } from 'bun:test'

import { startPackSync } from '../application/pack-sync-loop'
import { openNoticeStore } from './notice-store'

test('a pack keeps an open notice and drops one whose deadline has passed', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'nora-pack-'))
  const store = openNoticeStore(dir, () => new Date('2026-11-19T08:00:00Z'))
  let calls = 0
  const running = startPackSync({
    store,
    now: () => new Date('2026-11-19T08:00:00Z'),
    sleep: (_ms, signal) => new Promise((resolve) => {
      const timer = setTimeout(resolve, 5)
      signal.addEventListener('abort', () => {
        clearTimeout(timer)
        resolve()
      }, { once: true })
    }),
    download: async () => {
      calls += 1
      if (calls > 1) return []
      return [
        { name: 'open.xml', xml: '<purchaseNumber>100</purchaseNumber><endDT>2026-12-01T10:00:00+03:00</endDT>' },
        { name: 'closed.xml', xml: '<purchaseNumber>200</purchaseNumber><endDT>2026-11-01T10:00:00+03:00</endDT>' },
      ]
    },
  })
  const ready = Date.now() + 2_000
  while (store.counts().saved < 1 && Date.now() < ready) {
    await new Promise((resolve) => setTimeout(resolve, 10))
  }
  await running.stop()
  expect(store.counts().saved).toBe(1)
  expect(store.packPlan().dropped).toBe(1)
  expect(await Bun.file(join(dir, 'zips', '100.zip')).exists()).toBe(true)
  expect(await Bun.file(join(dir, 'zips', '200.zip')).exists()).toBe(false)
  store.close()
  await rm(dir, { recursive: true, force: true })
})
