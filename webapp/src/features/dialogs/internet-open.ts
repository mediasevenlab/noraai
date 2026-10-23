const KEY = 'dialogs-internet-open'
const listeners = new Set<() => void>()

export function internetEnabledFrom(stored: string | null) {
  return stored === '1'
}

function readOpen() {
  try {
    return internetEnabledFrom(localStorage.getItem(KEY))
  } catch {
    return false
  }
}

let open = readOpen()

export function internetEnabled() {
  return open
}

export function setInternetEnabled(next: boolean) {
  open = next
  try {
    localStorage.setItem(KEY, next ? '1' : '0')
  } catch {
    /* the button still toggles this tab */
  }
  for (const listener of listeners) listener()
}

export function subscribeInternetOpen(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}
