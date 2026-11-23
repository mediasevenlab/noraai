export type TenderProNotice = {
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

export function readTenderProList(body: string): { notices: TenderProNotice[]; error: string } {
  let data: unknown
  try {
    data = JSON.parse(body)
  } catch {
    return { notices: [], error: 'Tender.pro вернул не список процедур.' }
  }
  const rows = rowsOf(data)
  if (!rows) {
    return { notices: [], error: errorOf(data) || 'Tender.pro не отдал процедуры.' }
  }
  const notices = rows.flatMap(readNotice).slice(0, 50)
  if (notices.length === 0) {
    return { notices: [], error: errorOf(data) || 'Подключение есть. Открытых процедур Tender.pro не вернул.' }
  }
  return { notices, error: '' }
}

function rowsOf(data: unknown): unknown[] | null {
  if (Array.isArray(data)) return data
  if (!data || typeof data !== 'object') return null
  const arrays = Object.values(data).filter(Array.isArray)
  return arrays.length === 1 ? arrays[0] : null
}

function errorOf(data: unknown) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return ''
  const record = data as Record<string, unknown>
  return text(record.error) || text(record.error_message) || text(record.message)
}

function readNotice(row: unknown): TenderProNotice[] {
  if (!row || typeof row !== 'object' || Array.isArray(row)) return []
  const record = row as Record<string, unknown>
  const number = field(record, ['id', 'tender_id'])
  if (!/^\d+$/.test(number)) return []
  const status = field(record, ['status_name', 'state_name', 'status'])
  return [{
    law: 'Tender.pro',
    status: status && status !== '1' ? status : 'Приём предложений',
    number,
    object: field(record, ['title', 'name', 'tender_name', 'subject']) || 'Процедура Tender.pro',
    customer: field(record, ['company_name', 'organizer', 'org_name', 'company']),
    price: field(record, ['price', 'start_price', 'budget']),
    published: field(record, ['open_date', 'created', 'date_begin']),
    updated: '',
    deadline: field(record, ['close_date', 'end_date', 'finish_date', 'date_close']),
    url: `https://www.tender.pro/view_tender.shtml?tenderid=${number}`,
  }]
}

function field(record: Record<string, unknown>, names: string[]) {
  for (const name of names) {
    const value = text(record[name])
    if (value) return value
  }
  return ''
}

function text(value: unknown): string {
  if (typeof value === 'string') return value.trim()
  if (typeof value === 'number' && Number.isFinite(value)) return String(value)
  if (value && typeof value === 'object' && 'message' in value) {
    return text((value as { message?: unknown }).message)
  }
  return ''
}
