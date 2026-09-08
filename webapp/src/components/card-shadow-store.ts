import { useLayoutEffect, useSyncExternalStore } from 'react'

import {
  applyCardShadowToDocument,
  CARD_SHADOW_STORAGE_KEY,
  DEFAULT_CARD_SHADOW,
  type CardShadowId,
  parseCardShadowId,
} from './card-shadow'

function readStoredCardShadow(): CardShadowId {
  if (typeof window === 'undefined') return DEFAULT_CARD_SHADOW
  return parseCardShadowId(window.localStorage.getItem(CARD_SHADOW_STORAGE_KEY))
}

let cardShadowSnapshot = DEFAULT_CARD_SHADOW
const cardShadowListeners = new Set<() => void>()

if (typeof window !== 'undefined') {
  cardShadowSnapshot = readStoredCardShadow()
  applyCardShadowToDocument(cardShadowSnapshot)
}

function emitCardShadow() {
  for (const listener of cardShadowListeners) listener()
}

function subscribeCardShadow(listener: () => void) {
  cardShadowListeners.add(listener)
  return () => {
    cardShadowListeners.delete(listener)
  }
}

export function setCardShadow(shadow: string) {
  const next = parseCardShadowId(shadow)
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(CARD_SHADOW_STORAGE_KEY, next)
  }
  applyCardShadowToDocument(next)
  if (cardShadowSnapshot === next) return
  cardShadowSnapshot = next
  emitCardShadow()
}

export function useCardShadow() {
  return useSyncExternalStore(
    subscribeCardShadow,
    () => cardShadowSnapshot,
    () => DEFAULT_CARD_SHADOW,
  )
}

/** Keep `data-card-shadow` on <html> in lockstep with the stored picker. */
export function CardShadowSync() {
  const shadow = useCardShadow()

  useLayoutEffect(() => {
    applyCardShadowToDocument(shadow)
  }, [shadow])

  return null
}
