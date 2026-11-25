const KEY = 'dialogs-tender-companies'
const listeners = new Set<() => void>()
const catalogListeners = new Set<() => void>()

export function selectedCompanyIdsFrom(stored: string | null) {
  if (!stored) return []
  try {
    const parsed = JSON.parse(stored) as unknown
    if (!Array.isArray(parsed)) return []
    return [...new Set(parsed.filter((item): item is string => typeof item === 'string' && item.length > 0))].slice(0, 8)
  } catch {
    return []
  }
}

function readIds() {
  try {
    return selectedCompanyIdsFrom(localStorage.getItem(KEY))
  } catch {
    return []
  }
}

let ids = readIds()

export function selectedCompanyIds() {
  return ids
}

export function setSelectedCompanyIds(next: readonly string[]) {
  ids = [...new Set(next)].slice(0, 8)
  try {
    localStorage.setItem(KEY, JSON.stringify(ids))
  } catch {
    /* the choice still applies in this tab */
  }
  for (const listener of listeners) listener()
}

export function toggleSelectedCompany(id: string) {
  setSelectedCompanyIds(ids.includes(id) ? ids.filter((item) => item !== id) : [...ids, id])
}

export function subscribeCompanySelection(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function notifyCompanyCatalog() {
  for (const listener of catalogListeners) listener()
}

export function subscribeCompanyCatalog(listener: () => void) {
  catalogListeners.add(listener)
  return () => {
    catalogListeners.delete(listener)
  }
}
