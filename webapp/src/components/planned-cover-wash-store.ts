import { useLayoutEffect, useSyncExternalStore } from 'react'

import {
  applyPlannedCoverWashToDocument,
  DEFAULT_PLANNED_COVER_WASH,
  PLANNED_COVER_WASH_STORAGE_KEY,
  type PlannedCoverWashId,
  parsePlannedCoverWashId,
} from './planned-cover-wash'

function readStoredPlannedCoverWash(): PlannedCoverWashId {
  if (typeof window === 'undefined') return DEFAULT_PLANNED_COVER_WASH
  return parsePlannedCoverWashId(window.localStorage.getItem(PLANNED_COVER_WASH_STORAGE_KEY))
}

let plannedCoverWashSnapshot = DEFAULT_PLANNED_COVER_WASH
const plannedCoverWashListeners = new Set<() => void>()

if (typeof window !== 'undefined') {
  plannedCoverWashSnapshot = readStoredPlannedCoverWash()
  applyPlannedCoverWashToDocument(plannedCoverWashSnapshot)
}

function emitPlannedCoverWash() {
  for (const listener of plannedCoverWashListeners) listener()
}

function subscribePlannedCoverWash(listener: () => void) {
  plannedCoverWashListeners.add(listener)
  return () => {
    plannedCoverWashListeners.delete(listener)
  }
}

export function setPlannedCoverWash(wash: string) {
  const next = parsePlannedCoverWashId(wash)
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(PLANNED_COVER_WASH_STORAGE_KEY, next)
  }
  applyPlannedCoverWashToDocument(next)
  if (plannedCoverWashSnapshot === next) return
  plannedCoverWashSnapshot = next
  emitPlannedCoverWash()
}

export function usePlannedCoverWash() {
  return useSyncExternalStore(
    subscribePlannedCoverWash,
    () => plannedCoverWashSnapshot,
    () => DEFAULT_PLANNED_COVER_WASH,
  )
}

/** Keep `data-planned-cover-wash` on <html> in lockstep with the stored picker. */
export function PlannedCoverWashSync() {
  const wash = usePlannedCoverWash()

  useLayoutEffect(() => {
    applyPlannedCoverWashToDocument(wash)
  }, [wash])

  return null
}
