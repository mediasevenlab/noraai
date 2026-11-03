let height = 0
const listeners = new Set<() => void>()

export function subscribeComposerDock(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function composerDockHeight() {
  return height
}

export function setComposerDockHeight(next: number) {
  const rounded = Math.max(0, Math.ceil(next))
  if (rounded === height) return
  height = rounded
  for (const listener of listeners) listener()
}
