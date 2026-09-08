import { useLayoutEffect, useSyncExternalStore } from 'react'

import {
  applyPlannedCoverBlurToDocument,
  DEFAULT_PLANNED_COVER_BLUR,
  PLANNED_COVER_BLUR_STORAGE_KEY,
  type PlannedCoverBlurId,
  parsePlannedCoverBlurId,
} from './planned-cover-blur'

function readStoredPlannedCoverBlur(): PlannedCoverBlurId {
  if (typeof window === 'undefined') return DEFAULT_PLANNED_COVER_BLUR
  return parsePlannedCoverBlurId(window.localStorage.getItem(PLANNED_COVER_BLUR_STORAGE_KEY))
}

let plannedCoverBlurSnapshot = DEFAULT_PLANNED_COVER_BLUR
const plannedCoverBlurListeners = new Set<() => void>()

if (typeof window !== 'undefined') {
  plannedCoverBlurSnapshot = readStoredPlannedCoverBlur()
  applyPlannedCoverBlurToDocument(plannedCoverBlurSnapshot)
}

function emitPlannedCoverBlur() {
  for (const listener of plannedCoverBlurListeners) listener()
}

function subscribePlannedCoverBlur(listener: () => void) {
  plannedCoverBlurListeners.add(listener)
  return () => {
    plannedCoverBlurListeners.delete(listener)
  }
}

export function setPlannedCoverBlur(blur: string) {
  const next = parsePlannedCoverBlurId(blur)
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(PLANNED_COVER_BLUR_STORAGE_KEY, next)
  }
  applyPlannedCoverBlurToDocument(next)
  if (plannedCoverBlurSnapshot === next) return
  plannedCoverBlurSnapshot = next
  emitPlannedCoverBlur()
}

export function usePlannedCoverBlur() {
  return useSyncExternalStore(
    subscribePlannedCoverBlur,
    () => plannedCoverBlurSnapshot,
    () => DEFAULT_PLANNED_COVER_BLUR,
  )
}

/** Keep `data-planned-cover-blur` on <html> in lockstep with the stored picker. */
export function PlannedCoverBlurSync() {
  const blur = usePlannedCoverBlur()

  useLayoutEffect(() => {
    applyPlannedCoverBlurToDocument(blur)
  }, [blur])

  return null
}
