import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

import { planAfterPage, planToRun, subsystemFor, type OpenSyncPlan } from '../domain/open-sync'
import type { OpenNotice } from '../domain/read-search'

type StoredNotice = OpenNotice & { subsystem: string }

type SyncStore = {
  dir: string
  remember(notice: StoredNotice): void
  nextQueued(): StoredNotice | null
  markSaved(number: string, bytes: number): void
  markFailed(number: string, error: string): void
  plan(): OpenSyncPlan
  savePlan(plan: OpenSyncPlan): void
}

const PAGE_PAUSE_MS = 1_500
const ZIP_PAUSE_MS = 2_000
const IDLE_PAUSE_MS = 60_000

export function startOpenSync(options: {
  store: SyncStore
  search: (day: string, page: number, signal: AbortSignal) => Promise<OpenNotice[]>
  download: (notice: StoredNotice, signal: AbortSignal) => Promise<Uint8Array>
  now?: () => Date
  sleep?: (ms: number, signal: AbortSignal) => Promise<void>
}) {
  const now = options.now ?? (() => new Date())
  const sleep = options.sleep ?? delay
  const controller = new AbortController()
  const task = run(controller.signal)
  return {
    stop() {
      controller.abort()
      return task.catch(() => undefined)
    },
  }

  async function run(signal: AbortSignal) {
    while (!signal.aborted) {
      const plan = options.store.plan()
      const reading = planToRun(plan, now())
      if (reading) {
        try {
          const notices = await options.search(reading.day, reading.page, signal)
          for (const notice of notices) {
            options.store.remember({ ...notice, subsystem: subsystemFor(notice.law) })
          }
          options.store.savePlan(planAfterPage(reading, notices.length, now()))
        } catch (error) {
          if (signal.aborted) return
          console.error('Open procurement list was not read', error instanceof Error ? error.message : error)
        }
        await sleep(PAGE_PAUSE_MS, signal)
      }
      const next = options.store.nextQueued()
      if (next) {
        try {
          if (!/^\d+$/.test(next.number)) throw new Error('ЕИС не отдала архив.')
          const bytes = await options.download(next, signal)
          await mkdir(join(options.store.dir, 'zips'), { recursive: true })
          await writeFile(join(options.store.dir, 'zips', `${next.number}.zip`), bytes)
          options.store.markSaved(next.number, bytes.byteLength)
        } catch (error) {
          if (signal.aborted) return
          const message = error instanceof Error ? error.message : 'ЕИС не отдала архив.'
          options.store.markFailed(next.number, message)
        }
        await sleep(ZIP_PAUSE_MS, signal)
        continue
      }
      if (!reading) await sleep(IDLE_PAUSE_MS, signal)
    }
  }
}

function delay(ms: number, signal: AbortSignal) {
  return new Promise<void>((resolve) => {
    const timer = setTimeout(resolve, ms)
    signal.addEventListener('abort', () => {
      clearTimeout(timer)
      resolve()
    }, { once: true })
  })
}
