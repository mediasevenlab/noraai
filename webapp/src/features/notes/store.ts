export type SavedNote = {
  id: string
  role: 'user' | 'assistant'
  text: string
  source: string
  savedAt: string
}

export type NoteToggleResult = 'saved' | 'removed' | 'skipped' | 'rejected'

const EMPTY: SavedNote[] = []
const snapshots = new Map<string, { raw: string; notes: SavedNote[] }>()
const listeners = new Set<() => void>()

function storageKey(userId: string) {
  return `nora-notes:${userId}`
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

function parseNotes(raw: string): SavedNote[] {
  try {
    const parsed = JSON.parse(raw) as unknown
    return Array.isArray(parsed) ? parsed.filter(isNote) : []
  } catch {
    return []
  }
}

function readRaw(userId: string) {
  try {
    return localStorage.getItem(storageKey(userId)) ?? '[]'
  } catch {
    return snapshots.get(userId)?.raw ?? '[]'
  }
}

function readStored(userId: string): SavedNote[] {
  if (!userId) return EMPTY
  const raw = readRaw(userId)
  const hit = snapshots.get(userId)
  if (hit && hit.raw === raw) return hit.notes
  const notes = parseNotes(raw)
  snapshots.set(userId, { raw, notes })
  return notes
}

function notify() {
  for (const listener of listeners) listener()
}

function writeStored(userId: string, notes: SavedNote[]) {
  const raw = JSON.stringify(notes)
  localStorage.setItem(storageKey(userId), raw)
  snapshots.set(userId, { raw, notes })
  notify()
}

/** A message id from the thread, or a stable mark when that id is not ready yet. */
export function noteMessageId(messageId: string, role: SavedNote['role'], text: string) {
  const id = messageId.trim()
  if (id) return id
  const body = text.replace(/\s+/g, ' ').trim()
  if (!body) return ''
  return `${role}:${body.length}:${body.slice(0, 64)}`
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

export function noteIsSaved(userId: string, messageId: string, text = '') {
  const notes = readStored(userId)
  if (messageId && notes.some((note) => note.id === messageId)) return true
  const body = text.trim()
  return body.length > 0 && notes.some((note) => note.text === body)
}

export function toggleNote(
  userId: string,
  draft: { id: string; role: SavedNote['role']; text: string; source: string },
): NoteToggleResult {
  if (!userId || !draft.id) return 'skipped'
  const current = readStored(userId)
  const body = draft.text.trim()
  const existing = current.find((note) => note.id === draft.id)
    ?? current.find((note) => note.text === body)
  const next = existing
    ? current.filter((note) => note.id !== existing.id)
    : prepend(current, draft)
  if (!next) return 'skipped'
  try {
    writeStored(userId, next)
  } catch {
    return 'rejected'
  }
  return next.some((note) => note.id === draft.id) ? 'saved' : 'removed'
}

function prepend(
  current: SavedNote[],
  draft: { id: string; role: SavedNote['role']; text: string; source: string },
): SavedNote[] | null {
  const text = draft.text.trim()
  if (!text) return null
  return [
    {
      id: draft.id,
      role: draft.role,
      text,
      source: draft.source.trim() || 'Диалог',
      savedAt: new Date().toISOString(),
    },
    ...current,
  ]
}

export function removeNote(userId: string, messageId: string) {
  if (!userId) return
  const current = readStored(userId)
  if (!current.some((note) => note.id === messageId)) return
  try {
    writeStored(userId, current.filter((note) => note.id !== messageId))
  } catch {
    // The bookmark stays until the browser can store the shorter list.
  }
}
