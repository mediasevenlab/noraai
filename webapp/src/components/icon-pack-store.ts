import { useEffect, useLayoutEffect, useSyncExternalStore } from 'react'

import {
  applyIconPackToDocument,
  DEFAULT_ICON_PACK,
  ICON_PACK_STORAGE_KEY,
  type IconPackId,
  parseIconPackId,
} from './icon-pack'

function readStoredIconPack(): IconPackId {
  if (typeof window === 'undefined') return DEFAULT_ICON_PACK
  return parseIconPackId(window.localStorage.getItem(ICON_PACK_STORAGE_KEY))
}

let iconPackSnapshot = DEFAULT_ICON_PACK
const iconPackListeners = new Set<() => void>()

if (typeof window !== 'undefined') {
  iconPackSnapshot = readStoredIconPack()
  applyIconPackToDocument(iconPackSnapshot)
}

function emitIconPack() {
  for (const listener of iconPackListeners) listener()
}

function subscribeIconPack(listener: () => void) {
  iconPackListeners.add(listener)
  return () => {
    iconPackListeners.delete(listener)
  }
}

export function setIconPack(pack: string) {
  const next = parseIconPackId(pack)
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(ICON_PACK_STORAGE_KEY, next)
  }
  applyIconPackToDocument(next)
  if (iconPackSnapshot === next) return
  iconPackSnapshot = next
  emitIconPack()
}

export function useIconPack() {
  return useSyncExternalStore(subscribeIconPack, () => iconPackSnapshot, () => DEFAULT_ICON_PACK)
}

/** Keep `data-icon-pack` on <html> in lockstep with the stored picker. */
export function IconPackSync() {
  const pack = useIconPack()

  useLayoutEffect(() => {
    applyIconPackToDocument(pack)
  }, [pack])

  useEffect(() => {
    if (pack !== 'lucide-animated') return

    const relay = (event: MouseEvent, type: 'mouseover' | 'mouseout') => {
      if (!event.isTrusted) return
      const node = event.target
      if (!(node instanceof Element)) return
      const button = node.closest(
        'button, [role="button"], [data-sidebar="menu-button"]',
      )
      if (!button) return
      const next = event.relatedTarget
      if (next instanceof Node && button.contains(next)) return
      for (const icon of button.querySelectorAll('[data-nora-animated-icon]')) {
        icon.dispatchEvent(new MouseEvent(type, { bubbles: true, relatedTarget: document.body }))
      }
    }

    const enter = (event: MouseEvent) => relay(event, 'mouseover')
    const leave = (event: MouseEvent) => relay(event, 'mouseout')
    document.addEventListener('mouseover', enter)
    document.addEventListener('mouseout', leave)
    return () => {
      document.removeEventListener('mouseover', enter)
      document.removeEventListener('mouseout', leave)
    }
  }, [pack])

  return null
}
