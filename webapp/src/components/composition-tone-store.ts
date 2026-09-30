import { useLayoutEffect, useSyncExternalStore } from 'react'

import {
  applyCompositionToneToDocument,
  COMPOSITION_TONE_STORAGE_KEY,
  DEFAULT_COMPOSITION_TONE,
  type CompositionToneId,
  parseCompositionToneId,
} from './composition-tone'

function readStoredCompositionTone(): CompositionToneId {
  if (typeof window === 'undefined') return DEFAULT_COMPOSITION_TONE
  return parseCompositionToneId(window.localStorage.getItem(COMPOSITION_TONE_STORAGE_KEY))
}

let compositionToneSnapshot = DEFAULT_COMPOSITION_TONE
const compositionToneListeners = new Set<() => void>()

if (typeof window !== 'undefined') {
  compositionToneSnapshot = readStoredCompositionTone()
  applyCompositionToneToDocument(compositionToneSnapshot)
}

function emitCompositionTone() {
  for (const listener of compositionToneListeners) listener()
}

function subscribeCompositionTone(listener: () => void) {
  compositionToneListeners.add(listener)
  return () => {
    compositionToneListeners.delete(listener)
  }
}

export function setCompositionTone(tone: string) {
  const next = parseCompositionToneId(tone)
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(COMPOSITION_TONE_STORAGE_KEY, next)
  }
  applyCompositionToneToDocument(next)
  if (compositionToneSnapshot === next) return
  compositionToneSnapshot = next
  emitCompositionTone()
}

export function useCompositionTone() {
  return useSyncExternalStore(
    subscribeCompositionTone,
    () => compositionToneSnapshot,
    () => DEFAULT_COMPOSITION_TONE,
  )
}

/** Keep `data-composition-tone` on <html> in lockstep with the stored picker. */
export function CompositionToneSync() {
  const tone = useCompositionTone()

  useLayoutEffect(() => {
    applyCompositionToneToDocument(tone)
  }, [tone])

  return null
}
