import { useTheme as useNextTheme } from 'next-themes'
import { useEffect, useLayoutEffect, useSyncExternalStore } from 'react'

import {
  allLightPaletteClassNames,
  DEFAULT_LIGHT_PALETTE,
  LIGHT_PALETTE_STORAGE_KEY,
  type LightPaletteId,
  noraSchemeClassNames,
  parseLightPaletteId,
} from './light-palette'

/** Nora scheme compatibility for DS demos (`NoraPreviewRoot`). */
export type Scheme = 'editor-dark' | 'editor-light' | 'marketing'

function readStoredLightPalette(): LightPaletteId {
  if (typeof window === 'undefined') return DEFAULT_LIGHT_PALETTE
  return parseLightPaletteId(window.localStorage.getItem(LIGHT_PALETTE_STORAGE_KEY))
}

let lightPaletteSnapshot = DEFAULT_LIGHT_PALETTE
const lightPaletteListeners = new Set<() => void>()

if (typeof window !== 'undefined') {
  lightPaletteSnapshot = readStoredLightPalette()
}

function emitLightPalette() {
  for (const listener of lightPaletteListeners) listener()
}

function subscribeLightPalette(listener: () => void) {
  lightPaletteListeners.add(listener)
  return () => {
    lightPaletteListeners.delete(listener)
  }
}

export function setLightPalette(palette: string) {
  const next = parseLightPaletteId(palette)
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(LIGHT_PALETTE_STORAGE_KEY, next)
  }
  if (lightPaletteSnapshot === next) {
    syncNoraSchemeFromHtml()
    return
  }
  lightPaletteSnapshot = next
  emitLightPalette()
  syncNoraSchemeFromHtml()
}

export function useLightPalette() {
  return useSyncExternalStore(
    subscribeLightPalette,
    () => lightPaletteSnapshot,
    () => DEFAULT_LIGHT_PALETTE,
  )
}

export function useTheme() {
  const { resolvedTheme } = useNextTheme()
  const scheme: Scheme = resolvedTheme === 'dark' ? 'editor-dark' : 'editor-light'
  const lightPalette = useLightPalette()

  return {
    scheme,
    setScheme: (scheme: Scheme) => void scheme,
    lightPalette,
    setLightPalette,
    lightTextTone: 'default' as const,
    setLightTextTone: (tone: string) => void tone,
  }
}

function disableTransitionsTemporarily() {
  const style = document.createElement('style')
  style.appendChild(
    document.createTextNode(
      '*,*::before,*::after{-webkit-transition:none!important;transition:none!important}',
    ),
  )
  document.head.appendChild(style)

  return () => {
    window.getComputedStyle(document.body)
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        style.remove()
      })
    })
  }
}

function desiredNoraClasses(isDark: boolean) {
  return noraSchemeClassNames(isDark, lightPaletteSnapshot)
}

function isNoraSchemeAligned(root: HTMLElement, isDark: boolean) {
  const desired = desiredNoraClasses(isDark)
  if (!desired.every((name) => root.classList.contains(name))) return false
  if (isDark) {
    return (
      !root.classList.contains('scheme-editor-light')
      && !root.classList.contains('scheme-marketing')
      && allLightPaletteClassNames().every((name) => !root.classList.contains(name))
      && !root.classList.contains('light-text-default')
    )
  }
  return (
    !root.classList.contains('scheme-editor-dark')
    && !root.classList.contains('scheme-marketing')
  )
}

function syncBrowserChrome(isDark: boolean) {
  const themeMeta = document.querySelector('meta[name="theme-color"]')
  if (themeMeta) themeMeta.setAttribute('content', isDark ? '#111111' : '#fbfbfa')
}

/** Apply Nora scheme classes to match next-themes `.dark` / light. */
function syncNoraSchemeFromHtml() {
  const root = document.documentElement
  const isDark = root.classList.contains('dark')
  syncBrowserChrome(isDark)
  if (isNoraSchemeAligned(root, isDark)) return

  const restore = disableTransitionsTemporarily()

  root.classList.remove(
    'scheme-editor-dark',
    'scheme-editor-light',
    'scheme-marketing',
    'light-text-default',
    ...allLightPaletteClassNames(),
  )
  for (const name of desiredNoraClasses(isDark)) {
    root.classList.add(name)
  }
  root.setAttribute('data-scheme', isDark ? 'editor-dark' : 'editor-light')

  restore()
}

/**
 * Keep `scheme-editor-*` in lockstep with next-themes.
 * next-themes mutates `.dark` on <html> immediately; without a matching Nora
 * scheme in the same turn, fills and inset borders update one frame apart
 * (and box-shadow transitions make borders look even later).
 */
export function NoraSchemeSync() {
  const { resolvedTheme } = useNextTheme()
  const lightPalette = useLightPalette()

  useLayoutEffect(() => {
    syncNoraSchemeFromHtml()
  }, [resolvedTheme, lightPalette])

  useEffect(() => {
    const root = document.documentElement
    const observer = new MutationObserver(() => {
      syncNoraSchemeFromHtml()
    })
    observer.observe(root, { attributes: true, attributeFilter: ['class'] })
    return () => observer.disconnect()
  }, [])

  return null
}
