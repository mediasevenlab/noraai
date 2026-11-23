const ENDPOINT = 'https://www.tender.pro/api/_info.tenderlist_by_set.json'

export async function loadOpenTenders(key: string, companyId: string | undefined, signal?: AbortSignal) {
  const url = new URL(ENDPOINT)
  url.searchParams.set('_key', key)
  url.searchParams.set('set_type_id', companyId ? '1' : '2')
  if (companyId) url.searchParams.set('set_id', companyId)
  url.searchParams.set('max_rows', '50')
  url.searchParams.set('open_only', 't')
  const response = await fetch(url, { signal })
  return response.text()
}
