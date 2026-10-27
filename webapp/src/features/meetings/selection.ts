type Listener = () => void

const listeners = new Set<Listener>()

export function subscribeMeetings(listener: Listener) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function notifyMeetings() {
  for (const listener of listeners) listener()
}

let activeMeetingIds: string[] = []

function threadKey(userId: string, threadId: string) {
  return `dialogs-meetings:${userId}:${threadId}`
}

export function readThreadMeetings(userId: string, threadId: string) {
  try {
    const raw = localStorage.getItem(threadKey(userId, threadId))
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed.filter((id) => typeof id === 'string').slice(0, 1) : []
  } catch {
    return []
  }
}

export function writeThreadMeetings(userId: string, threadId: string, ids: string[]) {
  const next = [...new Set(ids)].slice(0, 1)
  localStorage.setItem(threadKey(userId, threadId), JSON.stringify(next))
  activeMeetingIds = next
}

export function activeMeetingTranscripts() {
  return activeMeetingIds
}

export function bindThreadMeetings(userId: string, threadId: string, previousThreadId: string | null) {
  if (previousThreadId && previousThreadId !== threadId) {
    const carried = readThreadMeetings(userId, previousThreadId)
    const current = readThreadMeetings(userId, threadId)
    if (carried.length > 0 && current.length === 0) {
      writeThreadMeetings(userId, threadId, carried)
      return carried
    }
  }
  const ids = readThreadMeetings(userId, threadId)
  activeMeetingIds = ids
  return ids
}
