import { useLayoutEffect, useSyncExternalStore } from 'react'

import {
  applyCardRadiusToDocument,
  CARD_RADIUS_STORAGE_KEY,
  DEFAULT_CARD_RADIUS,
  type CardRadiusId,
  parseCardRadiusId,
} from './card-radius'

function readStoredCardRadius(): CardRadiusId {
  if (typeof window === 'undefined') return DEFAULT_CARD_RADIUS
  return parseCardRadiusId(window.localStorage.getItem(CARD_RADIUS_STORAGE_KEY))
}

let cardRadiusSnapshot = DEFAULT_CARD_RADIUS
const cardRadiusListeners = new Set<() => void>()

if (typeof window !== 'undefined') {
  cardRadiusSnapshot = readStoredCardRadius()
  applyCardRadiusToDocument(cardRadiusSnapshot)
}

function emitCardRadius() {
  for (const listener of cardRadiusListeners) listener()
}

function subscribeCardRadius(listener: () => void) {
  cardRadiusListeners.add(listener)
  return () => {
    cardRadiusListeners.delete(listener)
  }
}

export function setCardRadius(radius: string) {
  const next = parseCardRadiusId(radius)
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(CARD_RADIUS_STORAGE_KEY, next)
  }
  applyCardRadiusToDocument(next)
  if (cardRadiusSnapshot === next) return
  cardRadiusSnapshot = next
  emitCardRadius()
}

export function useCardRadius() {
  return useSyncExternalStore(
    subscribeCardRadius,
    () => cardRadiusSnapshot,
    () => DEFAULT_CARD_RADIUS,
  )
}

/** Keep `data-card-radius` on <html> in lockstep with the stored picker. */
export function CardRadiusSync() {
  const radius = useCardRadius()

  useLayoutEffect(() => {
    applyCardRadiusToDocument(radius)
  }, [radius])

  return null
}
