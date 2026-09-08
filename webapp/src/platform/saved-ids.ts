export type SavedAccountScope = {
  userId: string
  email?: string | null
}

function accountReadKeys(scope: SavedAccountScope | string): string[] {
  if (typeof scope === 'string') return [scope]
  const keys: string[] = []
  const email = scope.email?.trim().toLowerCase()
  if (email) keys.push(email)
  if (scope.userId) keys.push(scope.userId)
  return [...new Set(keys)]
}

function accountWriteKeys(scope: SavedAccountScope | string): string[] {
  if (typeof scope === 'string') return [scope]
  const keys: string[] = []
  const email = scope.email?.trim().toLowerCase()
  if (email) keys.push(email)
  if (scope.userId) keys.push(scope.userId)
  return [...new Set(keys)]
}

function parseSavedIds(raw: string | null): string[] {
  if (!raw) return []
  try {
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter((id): id is string => typeof id === 'string' && id.length > 0)
  } catch {
    return []
  }
}

/** Reads bookmarked ids, merging email, user id, and leftover guest keys. */
export function readSavedIdSet(prefix: string, scope: SavedAccountScope | string): Set<string> {
  if (typeof localStorage === 'undefined') return new Set()
  const ids = new Set<string>()
  for (const key of accountReadKeys(scope)) {
    for (const id of parseSavedIds(localStorage.getItem(`${prefix}${key}`))) {
      ids.add(id)
    }
  }
  return ids
}

/** Writes the same bookmark set to email and user-id keys. */
export function writeSavedIdSet(
  prefix: string,
  scope: SavedAccountScope | string,
  ids: ReadonlySet<string>,
) {
  if (typeof localStorage === 'undefined') return
  const payload = JSON.stringify([...ids])
  for (const key of accountWriteKeys(scope)) {
    localStorage.setItem(`${prefix}${key}`, payload)
  }
}

export function mergeFavoriteIds(...groups: Array<Iterable<string>>): string[] {
  const ids: string[] = []
  const seen = new Set<string>()
  for (const group of groups) {
    for (const id of group) {
      if (!id || seen.has(id)) continue
      seen.add(id)
      ids.push(id)
    }
  }
  return ids
}
