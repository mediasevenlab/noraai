import type { MiddlewareHandler } from 'hono'

import type { AuthHttpEnv } from '../auth'
import { startOpenSync } from './application/open-sync-loop'
import { createProcurementListService } from './application/list-service'
import { createProcurementSampleService } from './application/sample-service'
import { EisFailure } from './domain/errors'
import { openSearchUrl } from './domain/open-sync'
import { parseProcurementSearch } from './domain/read-search'
import { downloadNoticeArchive, downloadSampleNotice } from './infrastructure/eis-archive'
import { downloadOpenNotices, readPublicPage } from './infrastructure/eis-open-list'
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
    ? startOpenSync({
        store,
        search: async (day, page, signal) => parseProcurementSearch(await readPublicPage(openSearchUrl(day, page).toString(), signal), 50),
        download: (notice, signal) => downloadNoticeArchive(options.token!, notice.subsystem, notice.number, signal),
      })
    : null
  if (running) console.log('Open procurement sync started')
  const routes = createProcurementRoutes({
    requireAuth: options.requireAuth,
    service,
    list,
    sync: () => {
      if (!store) return IDLE_SYNC
      const plan = store.plan()
      return {
        running: true,
        phase: plan.phase,
        day: plan.day,
        page: plan.page,
        truncated: plan.truncatedDays.length,
        ...store.counts(),
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
