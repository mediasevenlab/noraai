import { useSyncExternalStore } from 'react'

export const GENERATION_TOKEN_USAGE_STORAGE_KEY = 'nora:generation-token-usage'
export const DEFAULT_GENERATION_TOKEN_USAGE_VISIBLE = false

export function parseGenerationTokenUsageVisible(raw: string | null): boolean {
  if (raw === 'true') return true
  if (raw === 'false') return false
  return DEFAULT_GENERATION_TOKEN_USAGE_VISIBLE
}

function readStoredGenerationTokenUsageVisible(): boolean {
  if (typeof window === 'undefined') return DEFAULT_GENERATION_TOKEN_USAGE_VISIBLE
  return parseGenerationTokenUsageVisible(
    window.localStorage.getItem(GENERATION_TOKEN_USAGE_STORAGE_KEY),
  )
}

let snapshot = DEFAULT_GENERATION_TOKEN_USAGE_VISIBLE
const listeners = new Set<() => void>()

if (typeof window !== 'undefined') {
  snapshot = readStoredGenerationTokenUsageVisible()
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

export function setGenerationTokenUsageVisible(next: boolean) {
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(GENERATION_TOKEN_USAGE_STORAGE_KEY, String(next))
  }
  if (snapshot === next) return
  snapshot = next
  emit()
}

export function useGenerationTokenUsageVisible() {
  return useSyncExternalStore(
    subscribe,
    () => snapshot,
    () => DEFAULT_GENERATION_TOKEN_USAGE_VISIBLE,
  )
}
