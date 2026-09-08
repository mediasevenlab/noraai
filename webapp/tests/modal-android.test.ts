import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import {
  ANDROID_MODAL_SAFE_ATTR,
  HYBRID_SHELL_ATTR,
  applyAndroidModalSafe,
  applyHybridRuntimeFlags,
  isAndroidClient,
  isAndroidWebView,
  isHybridNativeRuntime,
  isHybridShell,
} from '../src/components/modal-android'

const css = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), '../src/styles/modal-motion.css'),
  'utf8',
)
const indexCss = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), '../src/index.css'),
  'utf8',
)
const noraCss = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), '../src/styles/nora-ui.css'),
  'utf8',
)
const main = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), '../src/main.tsx'),
  'utf8',
)
const html = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), '../index.html'),
  'utf8',
)

describe('android modal compositor safe path', () => {
  test('detects Android Chrome and WebView, not iPhone or desktop', () => {
    expect(
      isAndroidClient(
        'Mozilla/5.0 (Linux; Android 15; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Mobile Safari/537.36',
      ),
    ).toBe(true)
    expect(
      isAndroidClient(
        'Mozilla/5.0 (Linux; Android 14; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/139.0.0.0 Mobile Safari/537.36',
      ),
    ).toBe(true)
    expect(
      isAndroidClient(
        'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/Safari/604.1',
      ),
    ).toBe(false)
    expect(
      isAndroidClient(
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36',
      ),
    ).toBe(false)
  })

  test('marks html only for Android runtimes', () => {
    const attrs = new Map<string, string>()
    const root = {
      setAttribute(name: string, value: string) {
        attrs.set(name, value)
      },
      removeAttribute(name: string) {
        attrs.delete(name)
      },
    }

    expect(applyAndroidModalSafe(null, 'Android')).toBe(false)
    expect(applyAndroidModalSafe(root, 'iPhone')).toBe(false)
    expect(attrs.has(ANDROID_MODAL_SAFE_ATTR)).toBe(false)
    expect(applyAndroidModalSafe(root, 'Android 15; Pixel 8')).toBe(true)
    expect(attrs.has(ANDROID_MODAL_SAFE_ATTR)).toBe(true)
    expect(applyAndroidModalSafe(root, 'Macintosh')).toBe(false)
    expect(attrs.has(ANDROID_MODAL_SAFE_ATTR)).toBe(false)
  })

  test('marks the Capacitor shell so cutout padding applies before first paint', () => {
    expect(isHybridNativeRuntime({})).toBe(false)
    expect(
      isHybridNativeRuntime({ Capacitor: { isNativePlatform: () => true } }),
    ).toBe(true)

    const attrs = new Map<string, string>()
    const root = {
      setAttribute(name: string, value: string) {
        attrs.set(name, value)
      },
      removeAttribute(name: string) {
        attrs.delete(name)
      },
    }

    expect(
      applyHybridRuntimeFlags(root, {
        userAgent: 'Android',
        runtime: { Capacitor: { isNativePlatform: () => true } },
      }),
    ).toEqual({ android: true, hybrid: true })
    expect(attrs.has(ANDROID_MODAL_SAFE_ATTR)).toBe(true)
    expect(attrs.has(HYBRID_SHELL_ATTR)).toBe(true)
    expect(html).toContain("root.setAttribute('data-hybrid', '')")
    expect(html).toContain("root.setAttribute('data-android', '')")
    expect(html).toContain('; wv')
    expect(html).toContain('viewport-fit=cover')
  })

  test('treats Android WebView UA as hybrid even before Capacitor injects', () => {
    const webViewUa =
      'Mozilla/5.0 (Linux; Android 15; Pixel 8; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/139.0.0.0 Mobile Safari/537.36'
    const chromeUa =
      'Mozilla/5.0 (Linux; Android 15; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Mobile Safari/537.36'
    expect(isAndroidWebView(webViewUa)).toBe(true)
    expect(isAndroidWebView(chromeUa)).toBe(false)
    expect(isHybridShell({ userAgent: webViewUa, runtime: {} })).toBe(true)
    expect(isHybridShell({ userAgent: chromeUa, runtime: {} })).toBe(false)

    const attrs = new Map<string, string>()
    const root = {
      setAttribute(name: string, value: string) {
        attrs.set(name, value)
      },
      removeAttribute(name: string) {
        attrs.delete(name)
      },
    }
    expect(applyHybridRuntimeFlags(root, { userAgent: webViewUa, runtime: {} })).toEqual({
      android: true,
      hybrid: true,
    })
    expect(attrs.has(HYBRID_SHELL_ATTR)).toBe(true)
  })

  test('boots the Android mark before React mounts', () => {
    expect(main).toContain('applyHybridRuntimeFlags')
    expect(main).toContain('attachHybridHaptics')
    expect(main).toContain('attachHybridPress')
    expect(main).toContain('document.documentElement')
    expect(main).toContain('navigator.userAgent')
  })

  test('drops overlay blur, page recess, and sheet slide on Android', () => {
    expect(css).toContain(`html[${ANDROID_MODAL_SAFE_ATTR}]`)
    expect(css).toContain('html[data-android] [data-slot=\'dialog-overlay\']')
    expect(css).toContain('html[data-android] [data-slot=\'sheet-overlay\']')
    expect(css).toContain('html[data-android] [data-slot=\'drawer-overlay\']')
    expect(css).toContain('backdrop-filter: none')
    expect(css).toContain('-webkit-backdrop-filter: none')
    expect(css).toContain("html[data-android] [data-slot='dialog-content']")
    expect(css).toContain('animation: none !important')
    expect(css).toContain('transform: none !important')
    expect(css).toContain("[data-starting-style]")
    expect(css).toContain('html[data-modal-motion]:not([data-android])')
    expect(css).toContain(
      'html[data-android][data-modal-motion]:has([data-slot=\'dialog-content\']:not([data-ending-style])) #root',
    )
  })

  test('hybrid shell pads content below the camera cutout', () => {
    expect(indexCss).toContain('html[data-hybrid] #root')
    expect(indexCss).toContain('padding-top: var(--app-safe-top)')
    expect(indexCss).toContain('--safe-area-inset-top: 48px')
    expect(indexCss).toContain('-webkit-tap-highlight-color: transparent')
    expect(indexCss).toContain('@keyframes hybrid-opacity-pulse')
    expect(indexCss).toContain('html:is([data-hybrid], [data-android]) .animate-spin')
    expect(css).toContain(
      '--modal-sheet-inset: max(10px, var(--app-safe-top, env(safe-area-inset-top, 0px)))',
    )
  })

  test('makes glass sheets opaque on Android so tile content stays visible', () => {
    expect(noraCss).toContain('html[data-android] [data-slot="sheet-content"].ios-glass-sheet')
    expect(noraCss).toContain('html[data-android] .ios-glass-chip')
  })
})
