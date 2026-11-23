export type B2bNotice = {
  law: string
  status: string
  number: string
  object: string
  customer: string
  price: string
  published: string
  updated: string
  deadline: string
  url: string
}

const BLOCK = /<(?:\w+:)?firm_tender\b[^>]*>([\s\S]*?)<\/(?:\w+:)?firm_tender>/g

export function readFirmTenders(xml: string): B2bNotice[] {
  const notices: B2bNotice[] = []
  for (const match of xml.matchAll(BLOCK)) {
    const body = match[1] ?? ''
    const number = tag(body, 'tender_id')
    if (!/^\d+$/.test(number)) continue
    const opened = tag(body, 'opened')
    notices.push({
      law: 'B2B-Center',
      status: opened === '1' ? 'Приём предложений' : 'Завершена',
      number,
      object: tag(body, 'common_name') || 'Процедура B2B-Center',
      customer: tag(body, 'org_name') || tag(body, 'org_name_short'),
      price: '',
      published: tag(body, 'date_begin'),
      updated: '',
      deadline: tag(body, 'date_unsealing'),
      url: `https://www.b2b-center.ru/market/view.html?id=${number}`,
    })
    if (notices.length >= 50) break
  }
  return notices
}

export function readB2bStatus(xml: string) {
  const code = tag(xml, 'error_code')
  const message = tag(xml, 'error_message') || tag(xml, 'faultstring')
  return { code, message }
}

function tag(xml: string, name: string) {
  return decode(xml.match(new RegExp(`<(?:\\w+:)?${name}>([^<]*)<`))?.[1]?.trim() ?? '')
}

function decode(value: string) {
  return value
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
}
