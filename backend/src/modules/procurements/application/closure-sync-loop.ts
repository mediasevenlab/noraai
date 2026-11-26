import { advanceClosure, closureCell, closureToRun, closureNumbers, type ClosurePlan } from '../domain/closure-sync'

const WIDTH = 3
const FAILURE_PAUSE_MS = 30_000
const STEP_PAUSE_MS = 1_000

type ClosureFile = { name: string; xml: string }

type ClosureStore = {
  closurePlan(): ClosurePlan
  saveClosurePlan(plan: ClosurePlan): void
  dropUndated(number: string): boolean
}

export function startClosureSync(options: {
  store: ClosureStore
  download: (cell: ReturnType<typeof closureCell>, signal: AbortSignal) => Promise<ClosureFile[]>
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
    let plan = options.store.closurePlan()
    while (!signal.aborted) {
      const reading = closureToRun(plan, now())
      if (!reading) {
        await sleep(60_000, signal)
        continue
      }
      const batch: ReturnType<typeof closureCell>[] = []
      let cursor = reading
      while (batch.length < WIDTH) {
        batch.push(closureCell(cursor))
        const next = advanceClosure(cursor, now())
        cursor = next
        if (next.phase !== reading.phase) break
      }
      let failed = false
      let removed = cursor.removed
      let failures = cursor.failed
      const results = await Promise.all(batch.map(async (cell) => {
        try {
          return { cell, files: await options.download(cell, signal), error: '' }
        } catch (error) {
          if (signal.aborted) throw error
          return { cell, files: [] as ClosureFile[], error: error instanceof Error ? error.message : 'ЕИС не отдала архив.' }
        }
      }))
      for (const result of results) {
        if (result.error) {
          failed = true
          failures += 1
          console.error('Procurement closure pack was not read', result.cell.day, result.cell.region, result.cell.documentType, result.error)
          continue
        }
        for (const file of result.files) {
          for (const number of closureNumbers(file.xml)) {
            if (options.store.dropUndated(number)) removed += 1
          }
        }
      }
      plan = { ...cursor, removed, failed: failures }
      options.store.saveClosurePlan(plan)
      if (removed > cursor.removed) console.log('Procurement closure removed undated notices', removed - cursor.removed)
      await sleep(failed ? FAILURE_PAUSE_MS : STEP_PAUSE_MS, signal)
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
