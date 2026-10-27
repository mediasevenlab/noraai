export type SavedNote = {
  id: string
  role: 'user' | 'assistant'
  text: string
  source: string
  savedAt: string
}

const cache = new Map<string, SavedNote[]>()
const listeners = new Set<() => void>()

function storageKey(userId: string) {
  return `nora-notes:${userId}`
}

function readStored(userId: string): SavedNote[] {
  if (!userId) return []
  const hit = cache.get(userId)
  if (hit) return hit
  let notes: SavedNote[] = []
  try {
    const raw = localStorage.getItem(storageKey(userId))
    const parsed = raw ? (JSON.parse(raw) as unknown) : []
    if (Array.isArray(parsed)) {
      notes = parsed.filter(isNote)
    }
  } catch {
    notes = []
  }
  cache.set(userId, notes)
  return notes
}

function isNote(value: unknown): value is SavedNote {
  if (!value || typeof value !== 'object') return false
  const note = value as Partial<SavedNote>
  return (
    typeof note.id === 'string'
    && (note.role === 'user' || note.role === 'assistant')
    && typeof note.text === 'string'
    && typeof note.source === 'string'
    && typeof note.savedAt === 'string'
  )
}

function publish(userId: string, notes: SavedNote[]) {
  cache.set(userId, notes)
  try {
    localStorage.setItem(storageKey(userId), JSON.stringify(notes))
  } catch {
    // The page still shows the in-memory copy for this session.
  }
  for (const listener of listeners) listener()
}

export function subscribeNotes(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function notesFor(userId: string) {
  return readStored(userId)
}

export function noteIsSaved(userId: string, messageId: string) {
  return readStored(userId).some((note) => note.id === messageId)
}

export function toggleNote(
  userId: string,
  draft: { id: string; role: SavedNote['role']; text: string; source: string },
) {
  if (!userId || !draft.id) return false
  const current = readStored(userId)
  if (current.some((note) => note.id === draft.id)) {
    publish(userId, current.filter((note) => note.id !== draft.id))
    return false
  }
  const text = draft.text.trim()
  if (!text) return false
  publish(userId, [
    {
      id: draft.id,
      role: draft.role,
      text,
      source: draft.source.trim() || 'Диалог',
      savedAt: new Date().toISOString(),
    },
    ...current,
  ])
  return true
}

export function removeNote(userId: string, messageId: string) {
  if (!userId) return
  const current = readStored(userId)
  if (!current.some((note) => note.id === messageId)) return
  publish(userId, current.filter((note) => note.id !== messageId))
}
