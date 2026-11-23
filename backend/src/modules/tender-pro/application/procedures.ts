import type { TenderProPage } from '@web-app-demo/contracts'

import { readTenderProList } from '../domain/read-tenders'

const MISSING = 'Для выгрузки нужен ключ доступа Tender.pro. Его смотрят в личном кабинете, раздел «Описание API». Это не пароль входа на сайт. Ключ кладут в backend/.env как TENDER_PRO_KEY и перезапускают локальный сервер. Номер компании в Tender.pro, если нужны только её процедуры, кладут туда же как TENDER_PRO_COMPANY_ID.'

export async function loadTenderProPage(options: {
  key?: string
  companyId?: string
  loadList: (key: string, companyId: string | undefined, signal?: AbortSignal) => Promise<string>
  signal?: AbortSignal
}): Promise<TenderProPage> {
  if (!options.key) {
    return { configured: false, message: MISSING, notices: [] }
  }
  const companyId = /^\d+$/.test(options.companyId ?? '') ? options.companyId : undefined
  try {
    const body = await options.loadList(options.key, companyId, options.signal)
    const read = readTenderProList(body)
    if (read.error) {
      return { configured: true, message: read.error, notices: [] }
    }
    return {
      configured: true,
      message: companyId
        ? 'Это открытые процедуры вашей компании на Tender.pro.'
        : 'Это открытые процедуры Tender.pro, до 50 штук. Сейчас идёт приём предложений.',
      notices: read.notices,
    }
  } catch {
    return { configured: true, message: 'Tender.pro сейчас не отвечает.', notices: [] }
  }
}
