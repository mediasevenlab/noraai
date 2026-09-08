import { useLayoutEffect, useSyncExternalStore } from 'react'

import {
  applyModalMotionToDocument,
  DEFAULT_MODAL_MOTION,
  MODAL_MOTION_STORAGE_KEY,
  type ModalMotionId,
  parseModalMotionId,
} from './modal-motion'

function readStoredModalMotion(): ModalMotionId {
  if (typeof window === 'undefined') return DEFAULT_MODAL_MOTION
  return parseModalMotionId(window.localStorage.getItem(MODAL_MOTION_STORAGE_KEY))
}

let modalMotionSnapshot = DEFAULT_MODAL_MOTION
const modalMotionListeners = new Set<() => void>()

if (typeof window !== 'undefined') {
  modalMotionSnapshot = readStoredModalMotion()
  applyModalMotionToDocument(modalMotionSnapshot)
}

function emitModalMotion() {
  for (const listener of modalMotionListeners) listener()
}

function subscribeModalMotion(listener: () => void) {
  modalMotionListeners.add(listener)
  return () => {
    modalMotionListeners.delete(listener)
  }
}

export function setModalMotion(motion: string) {
  const next = parseModalMotionId(motion)
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(MODAL_MOTION_STORAGE_KEY, next)
  }
  applyModalMotionToDocument(next)
  if (modalMotionSnapshot === next) return
  modalMotionSnapshot = next
  emitModalMotion()
}

export function useModalMotion() {
  return useSyncExternalStore(
    subscribeModalMotion,
    () => modalMotionSnapshot,
    () => DEFAULT_MODAL_MOTION,
  )
}

/** Keep `data-modal-motion` on <html> in lockstep with the stored picker. */
export function ModalMotionSync() {
  const motion = useModalMotion()

  useLayoutEffect(() => {
    applyModalMotionToDocument(motion)
  }, [motion])

  return null
}
