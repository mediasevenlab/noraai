import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { expect, test } from 'bun:test'

import { startClosureSync } from '../application/closure-sync-loop'
import { openNoticeStore } from './notice-store'

test('a closing document removes an undated notice and leaves a dated one and the pack cursor', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'nora-closure-'))
  const store = openNoticeStore(dir, () => new Date('2026-11-26T08:00:00Z'))
  const pack = store.packPlan()
  store.remember({
    number: '32515498728', subsystem: 'RI223', law: '223-ФЗ', status: '', object: 'усиление',
    customer: 'колледж', price: '', published: '2025-12-08', updated: '', deadline: '', url: '',
  })
  store.markSaved('32515498728', 100)
  store.remember({
    number: '10000000001', subsystem: 'PRIZ', law: '44-ФЗ', status: '', object: 'инструмент',
    customer: 'заказчик', price: '', published: '2026-11-20', updated: '', deadline: '2026-12-20T10:00:00+03:00', url: '',
  })
  store.markSaved('10000000001', 80)
  let calls = 0
  const running = startClosureSync({
    store,
    now: () => new Date('2026-11-26T08:00:00Z'),
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
      return [{
        name: 'protocol.xml',
        xml: '<purchaseNoticeNumber>32515498728</purchaseNoticeNumber><purchaseNumber>10000000001</purchaseNumber>',
      }]
    },
  })
  const ready = Date.now() + 2_000
  while (store.counts().saved > 1 && Date.now() < ready) {
    await new Promise((resolve) => setTimeout(resolve, 10))
  }
  await running.stop()
  expect(store.noticeCard('32515498728')).toBeNull()
  expect(store.noticeCard('10000000001')?.number).toBe('10000000001')
  expect(store.closurePlan().removed).toBeGreaterThanOrEqual(1)
  expect(store.packPlan()).toMatchObject({ mode: pack.mode, phase: pack.phase, day: pack.day, startedAt: pack.startedAt })
  expect(await Bun.file(join(dir, 'zips', '32515498728.zip')).exists()).toBe(false)
  store.close()
  await rm(dir, { recursive: true, force: true })
})

test('a closing pass reads three portions at once', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'nora-closure-width-'))
  const store = openNoticeStore(dir, () => new Date('2026-11-26T08:00:00Z'))
  let open = 0
  let peak = 0
  const running = startClosureSync({
    store,
    now: () => new Date('2026-11-26T08:00:00Z'),
    sleep: (_ms, signal) => new Promise((resolve) => {
      const timer = setTimeout(resolve, 5)
      signal.addEventListener('abort', () => {
        clearTimeout(timer)
        resolve()
      }, { once: true })
    }),
    download: async () => {
      open += 1
      peak = Math.max(peak, open)
      await new Promise((resolve) => setTimeout(resolve, 40))
      open -= 1
      return []
    },
  })
  const ready = Date.now() + 2_000
  while (peak < 3 && Date.now() < ready) {
    await new Promise((resolve) => setTimeout(resolve, 10))
  }
  await running.stop()
  expect(peak).toBe(3)
  expect(store.closurePlan().kindIndex).toBeGreaterThanOrEqual(3)
  store.close()
  await rm(dir, { recursive: true, force: true })
})
