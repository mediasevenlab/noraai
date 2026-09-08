import { useSyncExternalStore } from 'react'

export const SIDEBAR_PROMO_CARDS_STORAGE_KEY = 'nora:sidebar-promo-cards'
export const DEFAULT_SIDEBAR_PROMO_CARDS = false

export function parseSidebarPromoCards(raw: string | null): boolean {
  if (raw === 'true') return true
  if (raw === 'false') return false
  return DEFAULT_SIDEBAR_PROMO_CARDS
}

function readStoredSidebarPromoCards(): boolean {
  if (typeof window === 'undefined') return DEFAULT_SIDEBAR_PROMO_CARDS
  return parseSidebarPromoCards(window.localStorage.getItem(SIDEBAR_PROMO_CARDS_STORAGE_KEY))
}

let snapshot = DEFAULT_SIDEBAR_PROMO_CARDS
const listeners = new Set<() => void>()

if (typeof window !== 'undefined') {
  snapshot = readStoredSidebarPromoCards()
}

function emit() {
  for (const listener of listeners) listener()
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function setSidebarPromoCards(next: boolean) {
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(SIDEBAR_PROMO_CARDS_STORAGE_KEY, String(next))
  }
  if (snapshot === next) return
  snapshot = next
  emit()
}

export function useSidebarPromoCards() {
  return useSyncExternalStore(subscribe, () => snapshot, () => DEFAULT_SIDEBAR_PROMO_CARDS)
}
