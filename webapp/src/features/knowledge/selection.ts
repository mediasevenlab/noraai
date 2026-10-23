const listeners = new Set<() => void>()
let activeIds: string[] = []

function storageKey(userId: string, threadId: string) {
  return `dialogs-knowledge:${userId}:${threadId}`
}

export function readThreadKnowledge(userId: string, threadId: string) {
  try {
    const raw = localStorage.getItem(storageKey(userId, threadId))
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed.filter((id) => typeof id === 'string') : []
  } catch {
    return []
  }
}

export function writeThreadKnowledge(userId: string, threadId: string, ids: string[]) {
  const next = [...new Set(ids)]
  localStorage.setItem(storageKey(userId, threadId), JSON.stringify(next))
  activeIds = next
}

export function activeKnowledgeBases() {
  return activeIds
}

export function bindThreadKnowledge(userId: string, threadId: string, previousThreadId: string | null) {
  if (previousThreadId && previousThreadId !== threadId) {
    const carried = readThreadKnowledge(userId, previousThreadId)
    const current = readThreadKnowledge(userId, threadId)
    if (carried.length > 0 && current.length === 0) {
      writeThreadKnowledge(userId, threadId, carried)
      return carried
    }
  }
  const ids = readThreadKnowledge(userId, threadId)
  activeIds = ids
  return ids
}

export function subscribeKnowledgeCatalog(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function notifyKnowledgeCatalog() {
  for (const listener of listeners) listener()
}
