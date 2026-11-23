import type { B2bPage } from '@web-app-demo/contracts'

import { readB2bStatus, readFirmTenders } from '../domain/read-tenders'

const MISSING = 'Для выгрузки нужен отдельный логин интеграции B2B-Center. Его создают в кабинете: профиль организации, настройки интеграции. Это не пароль входа на сайт. В тарифе должна быть строка API: «Максимум возможностей» или «Поставки Премиум». Значения кладут в backend/.env как B2B_LOGIN и B2B_PASSWORD и перезапускают локальный сервер.'

export async function loadB2bPage(options: {
  login?: string
  password?: string
  loadXml: (login: string, password: string, signal?: AbortSignal) => Promise<string>
  signal?: AbortSignal
}): Promise<B2bPage> {
  if (!options.login || !options.password) {
    return { configured: false, message: MISSING, notices: [] }
  }
  try {
    const xml = await options.loadXml(options.login, options.password, options.signal)
    const status = readB2bStatus(xml)
    if (status.code && status.code !== '0') {
      return {
        configured: true,
        message: status.message || 'B2B-Center не отдал процедуры.',
        notices: [],
      }
    }
    const notices = readFirmTenders(xml)
    return {
      configured: true,
      message: notices.length === 0
        ? 'Подключение есть. Процедур вашей компании B2B-Center не вернул.'
        : 'Это процедуры вашей компании на B2B-Center, не весь открытый рынок площадки.',
      notices,
    }
  } catch {
    return { configured: true, message: 'B2B-Center сейчас не отвечает.', notices: [] }
  }
}
