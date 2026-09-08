import { readSavedIdSet, writeSavedIdSet, type SavedAccountScope } from '@/platform/saved-ids'

const STORAGE_PREFIX = 'nora:ration-done:v1:'
const AT_PREFIX = 'nora:diary-plan-at:v1:'

export function readCompletedRationMealIds(scope: SavedAccountScope | string): Set<string> {
  return readSavedIdSet(STORAGE_PREFIX, scope)
}

export function writeCompletedRationMealIds(
  scope: SavedAccountScope | string,
  ids: ReadonlySet<string>,
) {
  writeSavedIdSet(STORAGE_PREFIX, scope, ids)
}

function accountKeys(scope: SavedAccountScope | string): string[] {
  if (typeof scope === 'string') return [scope]
  const keys: string[] = []
  const email = scope.email?.trim().toLowerCase()
  if (email) keys.push(email)
  if (scope.userId) keys.push(scope.userId)
  return [...new Set(keys)]
}

function parseAtMap(raw: string | null): Record<string, string> {
  if (!raw) return {}
  try {
    const parsed: unknown = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {}
    const out: Record<string, string> = {}
    for (const [id, at] of Object.entries(parsed as Record<string, unknown>)) {
      if (typeof at === 'string' && at.length > 0) out[id] = at
    }
    return out
  } catch {
    return {}
  }
}

/** Day a completed plan meal was shown on — survives reload until recordedAt is trusted. */
export function readDiaryPlanAtById(scope: SavedAccountScope | string): Record<string, string> {
  if (typeof localStorage === 'undefined') return {}
  const merged: Record<string, string> = {}
  for (const key of accountKeys(scope)) {
    Object.assign(merged, parseAtMap(localStorage.getItem(`${AT_PREFIX}${key}`)))
  }
  return merged
}

export function writeDiaryPlanAtById(
  scope: SavedAccountScope | string,
  atById: Record<string, string>,
) {
  if (typeof localStorage === 'undefined') return
  const payload = JSON.stringify(atById)
  for (const key of accountKeys(scope)) {
    localStorage.setItem(`${AT_PREFIX}${key}`, payload)
  }
}
