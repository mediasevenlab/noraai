const KEY = 'dialogs-reasoning-open'
const listeners = new Set<() => void>()

export function reasoningEnabledFrom(_stored: string | null) {
  return false
}

function readOpen() {
  try {
    localStorage.removeItem(KEY)
  } catch {
    /* private mode still starts with reasoning off */
  }
  return reasoningEnabledFrom(null)
}

let open = readOpen()

export function reasoningExpanded() {
  return open
}

export function setReasoningExpanded(next: boolean) {
  open = next
  for (const listener of listeners) listener()
}

export function subscribeReasoningOpen(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}
