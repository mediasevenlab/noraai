import { procurementOpenListSchema, type ProcurementOpenList } from '@web-app-demo/contracts'

import { parseProcurementSearch } from '../domain/read-search'

export function createProcurementListService(load: (signal?: AbortSignal) => Promise<string>) {
  let pending: Promise<ProcurementOpenList> | null = null
  return {
    open(signal?: AbortSignal) {
      pending ??= load(signal)
        .then((html) => procurementOpenListSchema.parse({ notices: parseProcurementSearch(html) }))
        .catch((error: unknown) => {
          pending = null
          throw error
        })
      return pending
    },
  }
}
