const STORAGE_PREFIX = 'nora:hidden-rations:v1:'

function storageKey(userId: string) {
  return `${STORAGE_PREFIX}${userId}`
}

export function hiddenRationIds(userId: string): Set<string> {
  if (typeof localStorage === 'undefined') return new Set()
  try {
    const raw = localStorage.getItem(storageKey(userId))
    const parsed = raw ? JSON.parse(raw) as unknown : []
    if (!Array.isArray(parsed)) return new Set()
    return new Set(parsed.filter((item): item is string => typeof item === 'string' && item.length > 0))
  } catch {
    return new Set()
  }
}

export function hideRation(userId: string, planId: string) {
  const next = hiddenRationIds(userId)
  next.add(planId)
  writeHiddenRations(userId, next)
}

export function unhideRation(userId: string, planId: string) {
  const next = hiddenRationIds(userId)
  if (!next.delete(planId)) return
  writeHiddenRations(userId, next)
}

/** Week and catalog cards are rebuilt locally, so hiding them is remembered on this device. */
export function rationCardNeedsLocalHide(planId: string) {
  return planId.startsWith('week:') || planId.startsWith('catalog_')
}

function writeHiddenRations(userId: string, ids: ReadonlySet<string>) {
  if (typeof localStorage === 'undefined') return
  localStorage.setItem(storageKey(userId), JSON.stringify([...ids]))
}
