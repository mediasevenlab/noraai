const KEY = 'dialogs-bitrix-open'
const listeners = new Set<() => void>()

export function bitrixEnabledFrom(stored: string | null) {
  return stored === '1'
}

function readOpen() {
  try {
    return bitrixEnabledFrom(localStorage.getItem(KEY))
  } catch {
    return false
  }
}

let open = readOpen()

export function bitrixEnabled() {
  return open
}

export function setBitrixEnabled(next: boolean) {
  open = next
  try {
    localStorage.setItem(KEY, next ? '1' : '0')
  } catch {
    /* the button still toggles this tab */
  }
  for (const listener of listeners) listener()
}

export function subscribeBitrixOpen(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}
