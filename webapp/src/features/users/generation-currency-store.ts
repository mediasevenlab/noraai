import { useSyncExternalStore } from 'react'

export const GENERATION_CURRENCY_STORAGE_KEY = 'nora:generation-currency'
export const DEFAULT_GENERATION_CURRENCY = 'rub' as const

export type GenerationCurrency = 'rub' | 'usd'

export function parseGenerationCurrency(raw: string | null): GenerationCurrency {
  if (raw === 'usd') return 'usd'
  return DEFAULT_GENERATION_CURRENCY
}

function readStoredGenerationCurrency(): GenerationCurrency {
  if (typeof window === 'undefined') return DEFAULT_GENERATION_CURRENCY
  return parseGenerationCurrency(window.localStorage.getItem(GENERATION_CURRENCY_STORAGE_KEY))
}

let snapshot: GenerationCurrency = DEFAULT_GENERATION_CURRENCY
const listeners = new Set<() => void>()

if (typeof window !== 'undefined') {
  snapshot = readStoredGenerationCurrency()
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

export function setGenerationCurrency(next: GenerationCurrency) {
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(GENERATION_CURRENCY_STORAGE_KEY, next)
  }
  if (snapshot === next) return
  snapshot = next
  emit()
}

export function useGenerationCurrency() {
  return useSyncExternalStore(
    subscribe,
    () => snapshot,
    () => DEFAULT_GENERATION_CURRENCY,
  )
}
