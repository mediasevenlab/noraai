const KEY = 'dialogs-reasoning-open'
const listeners = new Set<() => void>()

export function reasoningEnabledFrom(stored: string | null) {
  return stored === '1'
}

function readOpen() {
  try {
    return reasoningEnabledFrom(localStorage.getItem(KEY))
  } catch {
    return false
  }
}

let open = readOpen()

export function reasoningExpanded() {
  return open
}

export function setReasoningExpanded(next: boolean) {
  open = next
  try {
    localStorage.setItem(KEY, next ? '1' : '0')
  } catch {
    /* the button still toggles this tab */
  }
  for (const listener of listeners) listener()
}

export function subscribeReasoningOpen(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}
