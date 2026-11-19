import type { MiddlewareHandler } from 'hono'

import type { AuthHttpEnv } from '../auth'
import { startPackSync } from './application/pack-sync-loop'
import { createProcurementListService } from './application/list-service'
import { createProcurementSampleService } from './application/sample-service'
import { EisFailure } from './domain/errors'
import { PACK_KINDS, PACK_REGIONS } from './domain/pack-sync'
import { downloadRegionPack, downloadSampleNotice } from './infrastructure/eis-archive'
import { downloadOpenNotices } from './infrastructure/eis-open-list'
import { openNoticeStore } from './infrastructure/notice-store'
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
  if (running) console.log('Procurement pack sync started')
  const routes = createProcurementRoutes({
    requireAuth: options.requireAuth,
    service,
    list,
    sync: () => {
      if (!store) return IDLE_SYNC
      const plan = store.packPlan()
      const counts = store.counts()
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
      }
    },
  })
  return {
    ...routes,
    dispose: async () => {
      await running?.stop()
      store?.close()
    },
  }
}
