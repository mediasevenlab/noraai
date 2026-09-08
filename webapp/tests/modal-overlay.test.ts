import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import {
  DEFAULT_MODAL_OVERLAY,
  MODAL_OVERLAYS,
  parseModalOverlayId,
} from '../src/components/modal-overlay'

const css = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), '../src/styles/modal-motion.css'),
  'utf8',
)
const menu = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), '../src/components/dashboard/ModalOverlayMenu.tsx'),
  'utf8',
)

describe('modal overlay', () => {
  test('exposes twenty named backdrop variants', () => {
    expect(MODAL_OVERLAYS).toHaveLength(20)
    expect(new Set(MODAL_OVERLAYS.map((overlay) => overlay.id)).size).toBe(20)
  })

  test('keeps a known overlay id and falls back otherwise', () => {
    expect(parseModalOverlayId('frost')).toBe('frost')
    expect(parseModalOverlayId('modal-overlay-frost')).toBe(DEFAULT_MODAL_OVERLAY)
    expect(parseModalOverlayId(null)).toBe(DEFAULT_MODAL_OVERLAY)
    expect(parseModalOverlayId('')).toBe(DEFAULT_MODAL_OVERLAY)
  })

  test('defines a stylesheet for every picker option', () => {
    expect(css).toContain('background: var(--modal-overlay-bg)')
    expect(css).toContain(
      'backdrop-filter: blur(var(--modal-overlay-blur)) saturate(var(--modal-overlay-saturate))',
    )
    for (const overlay of MODAL_OVERLAYS) {
      expect(css).toContain(`html[data-modal-overlay='${overlay.id}']`)
      expect(css).toContain(`--modal-overlay-bg: ${overlay.bg}`)
      expect(css).toContain(`--modal-overlay-blur: ${overlay.blur}`)
    }
  })

  test('defaults to dusk frost', () => {
    expect(DEFAULT_MODAL_OVERLAY).toBe('dusk')
    const root = css.slice(css.indexOf(':root {'), css.indexOf("html[data-modal-overlay='haze']"))
    expect(root).toContain('--modal-overlay-bg: color-mix(in srgb, #0f172a 18%, transparent)')
    expect(root).toContain('--modal-overlay-blur: 12px')
    expect(root).toContain('--modal-overlay-saturate: 140%')
  })

  test('desktop header can pick the overlay', () => {
    expect(menu).toContain('aria-label="Фон окна"')
    expect(menu).toContain('Фон окна')
    expect(menu).toContain('setModalOverlay(value)')
  })
})
