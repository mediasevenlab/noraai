import { useLayoutEffect, useSyncExternalStore } from 'react'

import {
  applyModalOverlayToDocument,
  DEFAULT_MODAL_OVERLAY,
  MODAL_OVERLAY_STORAGE_KEY,
  type ModalOverlayId,
  parseModalOverlayId,
} from './modal-overlay'

function readStoredModalOverlay(): ModalOverlayId {
  if (typeof window === 'undefined') return DEFAULT_MODAL_OVERLAY
  return parseModalOverlayId(window.localStorage.getItem(MODAL_OVERLAY_STORAGE_KEY))
}

let modalOverlaySnapshot = DEFAULT_MODAL_OVERLAY
const modalOverlayListeners = new Set<() => void>()

if (typeof window !== 'undefined') {
  modalOverlaySnapshot = readStoredModalOverlay()
  applyModalOverlayToDocument(modalOverlaySnapshot)
}

function emitModalOverlay() {
  for (const listener of modalOverlayListeners) listener()
}

function subscribeModalOverlay(listener: () => void) {
  modalOverlayListeners.add(listener)
  return () => {
    modalOverlayListeners.delete(listener)
  }
}

export function setModalOverlay(overlay: string) {
  const next = parseModalOverlayId(overlay)
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(MODAL_OVERLAY_STORAGE_KEY, next)
  }
  applyModalOverlayToDocument(next)
  if (modalOverlaySnapshot === next) return
  modalOverlaySnapshot = next
  emitModalOverlay()
}

export function useModalOverlay() {
  return useSyncExternalStore(
    subscribeModalOverlay,
    () => modalOverlaySnapshot,
    () => DEFAULT_MODAL_OVERLAY,
  )
}

/** Keep `data-modal-overlay` on <html> in lockstep with the stored picker. */
export function ModalOverlaySync() {
  const overlay = useModalOverlay()

  useLayoutEffect(() => {
    applyModalOverlayToDocument(overlay)
  }, [overlay])

  return null
}
