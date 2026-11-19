import { procurementSampleSchema, type ProcurementSample } from '@web-app-demo/contracts'

import { readNoticeXml } from '../domain/read-notice'

type SampleFile = {
  subsystem: string
  registryNumber: string
  fileName: string
  xml: string
}

export function createProcurementSampleService(load: (signal?: AbortSignal) => Promise<SampleFile>) {
  let pending: Promise<ProcurementSample> | null = null
  return {
    sample(signal?: AbortSignal) {
      pending ??= load(signal)
        .then((file) =>
          procurementSampleSchema.parse({
            registryNumber: file.registryNumber,
            subsystem: file.subsystem,
            fileName: file.fileName,
            ...readNoticeXml(file.xml),
          }),
        )
        .catch((error: unknown) => {
          pending = null
          throw error
        })
      return pending
    },
  }
}
