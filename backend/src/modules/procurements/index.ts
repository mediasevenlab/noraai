import type { MiddlewareHandler } from 'hono'

import type { AuthHttpEnv } from '../auth'
import { startPackSync } from './application/pack-sync-loop'
import { createProcurementListService } from './application/list-service'
import { createProcurementSampleService } from './application/sample-service'
import { EisFailure } from './domain/errors'
import { packActivity, packEta, PACK_KINDS, PACK_REGIONS } from './domain/pack-sync'
import { downloadRegionPack, downloadSampleNotice } from './infrastructure/eis-archive'
import { downloadOpenNotices } from './infrastructure/eis-open-list'
import { openNoticeStore, startNoticeExpiry, startNoticeTextIndex } from './infrastructure/notice-store'
import { createProcurementRoutes } from './transport/routes'

const IDLE_SYNC = {
  running: false,
  phase: 'off',
  day: '',
  page: 0,
  queued: 0,
  saved: 0,
  failed: 0,
  zipBytes: 0,
  truncated: 0,
  dropped: 0,
  cellsDone: 0,
  cellsTotal: 0,
  eta: '',
  indexed: 0,
  sweepDone: 0,
  sweepTotal: 0,
  sweepNote: '',
}

export function createProcurementsModule(options: {
  requireAuth: MiddlewareHandler<AuthHttpEnv>
  token?: string
  sync?: boolean
  dir?: string
}) {
  const service = createProcurementSampleService((signal) => {
    if (!options.token) throw new EisFailure('В backend/.env нет токена ЕИС.')
    return downloadSampleNotice(options.token, signal)
  })
  const list = createProcurementListService((signal) => downloadOpenNotices(signal))
  const store = options.sync && options.token ? openNoticeStore(options.dir || 'data/procurements') : null
  const running = store && options.token
    ? startPackSync({
        store,
        download: (cell, signal) => downloadRegionPack(options.token!, cell, signal),
      })
    : null
  const indexing = store ? startNoticeTextIndex(store) : null
  const expiry = store ? startNoticeExpiry(store) : null
  if (running) console.log('Procurement pack sync started')
  const routes = createProcurementRoutes({
    requireAuth: options.requireAuth,
    service,
    list,
    sync: () => {
      if (!store) return IDLE_SYNC
      const plan = store.packPlan()
      const counts = store.counts()
      const progress = packEta(plan, new Date())
      const activity = packActivity(plan, new Date())
      return {
        running: true,
        phase: plan.phase === 'catalog' ? 'packs' : 'packs-daily',
        day: `${plan.day}, регион ${PACK_REGIONS[plan.regionIndex] ?? ''}, ${PACK_KINDS[plan.kindIndex]?.label ?? ''}`,
        page: plan.regionIndex,
        queued: counts.queued,
        saved: counts.saved,
        failed: plan.failed,
        zipBytes: counts.zipBytes,
        truncated: 0,
        dropped: plan.dropped,
        cellsDone: progress.done,
        cellsTotal: progress.total,
        eta: progress.eta,
        indexed: counts.indexed,
        sweepDone: activity.done,
        sweepTotal: activity.total,
        sweepNote: activity.note,
      }
    },
    saved: (page: number, raw: { text?: string; phrases?: readonly string[]; laws?: readonly string[]; rank?: boolean }) => store?.savedPage(page, raw) ?? { total: 0, page: 1, pageCount: 1, notices: [] },
    card: (number: string) => store?.noticeCard(number) ?? null,
  })
  return {
    ...routes,
    searchForChat: (phrases: readonly string[], skip: readonly string[], take?: number) => store?.chatMatches(phrases, skip, take) ?? { total: 0, notices: [] },
    dispose: async () => {
      await running?.stop()
      await indexing?.stop()
      await expiry?.stop()
      store?.close()
    },
  }
}
