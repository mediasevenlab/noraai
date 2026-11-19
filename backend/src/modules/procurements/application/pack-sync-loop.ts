import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

import { keepOpen } from '../domain/keep-notice'
import { readPackCard } from '../domain/pack-card'
import { advancePack, packCell, packToRun, type PackPlan } from '../domain/pack-sync'
import { zipSingleXml } from '../domain/zip-xml'

const WIDTH = 3
const BATCH_PAUSE_MS = 400
const FAILURE_PAUSE_MS = 30_000
const IDLE_PAUSE_MS = 60_000

type PackFile = { name: string; xml: string }

type PackCell = ReturnType<typeof packCell>

type PackStore = {
  dir: string
  packPlan(): PackPlan
  savePackPlan(plan: PackPlan): void
  remember(notice: {
    number: string
    subsystem: string
    law: string
    status: string
    object: string
    customer: string
    price: string
    published: string
    updated: string
    deadline: string
    url: string
  }): void
  markSaved(number: string, bytes: number): void
}

export function startPackSync(options: {
  store: PackStore
  download: (cell: PackCell, signal: AbortSignal) => Promise<PackFile[]>
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
    let plan = options.store.packPlan()
    while (!signal.aborted) {
      const reading = packToRun(plan, now())
      if (!reading) {
        await sleep(IDLE_PAUSE_MS, signal)
        continue
      }
      const batch: PackCell[] = []
      let cursor = reading
      while (batch.length < WIDTH) {
        batch.push(packCell(cursor))
        const next = advancePack(cursor, now())
        cursor = next
        if (next.phase !== reading.phase) break
      }
      let failed = false
      let dropped = cursor.dropped
      let failures = cursor.failed
      const results = await Promise.all(batch.map(async (cell) => {
        try {
          return { cell, files: await options.download(cell, signal), error: '' }
        } catch (error) {
          if (signal.aborted) throw error
          return { cell, files: [] as PackFile[], error: error instanceof Error ? error.message : 'ЕИС не отдала архив.' }
        }
      }))
      for (const result of results) {
        if (result.error) {
          failed = true
          failures += 1
          console.error('Procurement pack was not read', result.cell.day, result.cell.region, result.cell.documentType, result.error)
          continue
        }
        for (const file of result.files) {
          const notice = readPackCard(file.xml)
          if (!/^\d+$/.test(notice.number)) continue
          if (!keepOpen(notice.deadline, now())) {
            dropped += 1
            continue
          }
          const bytes = zipSingleXml(`${notice.number}.xml`, file.xml)
          await mkdir(join(options.store.dir, 'zips'), { recursive: true })
          await writeFile(join(options.store.dir, 'zips', `${notice.number}.zip`), bytes)
          options.store.remember({
            number: notice.number,
            subsystem: result.cell.subsystem,
            law: result.cell.label,
            status: 'Подача заявок',
            object: notice.object,
            customer: notice.customer,
            price: notice.price,
            published: notice.published || result.cell.day,
            updated: '',
            deadline: notice.deadline,
            url: notice.url,
          })
          options.store.markSaved(notice.number, bytes.byteLength)
        }
      }
      plan = { ...cursor, dropped, failed: failures }
      options.store.savePackPlan(plan)
      await sleep(failed ? FAILURE_PAUSE_MS : BATCH_PAUSE_MS, signal)
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
