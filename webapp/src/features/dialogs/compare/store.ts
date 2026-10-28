import { forgetCompareFiles } from './files'

export type StoredCompare = {
  id: string
  leftName: string
  rightName: string
  leftText: string
  rightText: string
}

const KEY = 'nora-document-compares'
const memory = new Map<string, StoredCompare>()

function readAll(): Record<string, StoredCompare> {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as unknown
    if (!parsed || typeof parsed !== 'object') return {}
    return parsed as Record<string, StoredCompare>
  } catch {
    return {}
  }
}

export function saveDocumentCompare(record: StoredCompare) {
  memory.set(record.id, record)
  try {
    const all = readAll()
    all[record.id] = record
    const ids = Object.keys(all)
    while (ids.length > 8) {
      const oldest = ids.shift()
      if (!oldest) continue
      delete all[oldest]
      void forgetCompareFiles(oldest)
    }
    localStorage.setItem(KEY, JSON.stringify(all))
  } catch {
    // This comparison stays available until the page is closed.
  }
}

export function readDocumentCompare(id: string) {
  return memory.get(id) ?? readAll()[id] ?? null
}
