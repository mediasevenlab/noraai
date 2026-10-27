const KEY = 'dialogs-suggestions-open'
const listeners = new Set<() => void>()

export function suggestionsEnabledFrom(stored: string | null) {
  return stored !== '0'
}

function readOpen() {
  try {
    return suggestionsEnabledFrom(localStorage.getItem(KEY))
  } catch {
    return true
  }
}

let open = readOpen()

export function suggestionsEnabled() {
  return open
}

export function setSuggestionsEnabled(next: boolean) {
  open = next
  try {
    localStorage.setItem(KEY, next ? '1' : '0')
  } catch {
    /* the switch still toggles this tab */
  }
  for (const listener of listeners) listener()
}

export function subscribeSuggestionsOpen(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}
