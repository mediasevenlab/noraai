import { useLayoutEffect, useSyncExternalStore } from 'react'

import {
  applySidebarShadeToDocument,
  DEFAULT_SIDEBAR_SHADE,
  parseSidebarShadeId,
  SIDEBAR_SHADE_STORAGE_KEY,
  type SidebarShadeId,
} from './sidebar-shade'

function readStoredSidebarShade(): SidebarShadeId {
  if (typeof window === 'undefined') return DEFAULT_SIDEBAR_SHADE
  return parseSidebarShadeId(window.localStorage.getItem(SIDEBAR_SHADE_STORAGE_KEY))
}

let sidebarShadeSnapshot = DEFAULT_SIDEBAR_SHADE
const sidebarShadeListeners = new Set<() => void>()

if (typeof window !== 'undefined') {
  sidebarShadeSnapshot = readStoredSidebarShade()
  applySidebarShadeToDocument(sidebarShadeSnapshot)
}

function emitSidebarShade() {
  for (const listener of sidebarShadeListeners) listener()
}

function subscribeSidebarShade(listener: () => void) {
  sidebarShadeListeners.add(listener)
  return () => {
    sidebarShadeListeners.delete(listener)
  }
}

export function setSidebarShade(shade: string) {
  const next = parseSidebarShadeId(shade)
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(SIDEBAR_SHADE_STORAGE_KEY, next)
  }
  applySidebarShadeToDocument(next)
  if (sidebarShadeSnapshot === next) return
  sidebarShadeSnapshot = next
  emitSidebarShade()
}

export function useSidebarShade() {
  return useSyncExternalStore(
    subscribeSidebarShade,
    () => sidebarShadeSnapshot,
    () => DEFAULT_SIDEBAR_SHADE,
  )
}

/** Keep `data-sidebar-shade` on <html> in lockstep with the stored picker. */
export function SidebarShadeSync() {
  const shade = useSidebarShade()

  useLayoutEffect(() => {
    applySidebarShadeToDocument(shade)
  }, [shade])

  return null
}
