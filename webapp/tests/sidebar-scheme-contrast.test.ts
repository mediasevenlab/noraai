import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, test } from 'bun:test'

import { LIGHT_PALETTES } from '../src/components/light-palette'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')

type Rgb = { r: number; g: number; b: number }

function hexToRgb(hex: string): Rgb {
  const n = hex.replace('#', '').toLowerCase()
  return {
    r: Number.parseInt(n.slice(0, 2), 16),
    g: Number.parseInt(n.slice(2, 4), 16),
    b: Number.parseInt(n.slice(4, 6), 16),
  }
}

function mix(a: Rgb, b: Rgb, aShare: number): Rgb {
  const bShare = 1 - aShare
  return {
    r: a.r * aShare + b.r * bShare,
    g: a.g * aShare + b.g * bShare,
    b: a.b * aShare + b.b * bShare,
  }
}

function luma(c: Rgb) {
  return 0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b
}

function parsePaletteBorders(css: string) {
  const borders = new Map<string, string>()
  const re =
    /\.scheme-editor-light\.light-palette-([a-z]+)\{[^}]*--light-border:(#[0-9a-fA-F]{6});/g
  for (const match of css.replaceAll(/\s+/g, '').matchAll(re)) {
    borders.set(match[1], match[2].toLowerCase())
  }
  return borders
}

describe('sidebar scheme contrast', () => {
  const noraUi = readFileSync(resolve(root, 'src/styles/nora-ui.css'), 'utf8')
  const indexCss = readFileSync(resolve(root, 'src/index.css'), 'utf8')
  const borders = parsePaletteBorders(noraUi)

  test('defines sidebar chrome from the painted sidebar, not panel+canvas', () => {
    expect(indexCss).toContain('--nora-sidebar-search-bg')
    expect(indexCss).toContain('--nora-sidebar-item-hover')
    expect(indexCss).toContain('--nora-sidebar-item-active')
    expect(indexCss).toContain('[data-sidebar="sidebar"]')
  })

  test('search and active chips stay darker than the sidebar in every light palette', () => {
    expect(borders.size).toBe(LIGHT_PALETTES.length)
    const text = hexToRgb('#222222')

    for (const palette of LIGHT_PALETTES) {
      const panel = hexToRgb(palette.panel)
      const canvas = hexToRgb(palette.canvas)
      const border = hexToRgb(borders.get(palette.id) ?? '')
      expect(border.r + border.g + border.b, palette.id).toBeGreaterThan(0)

      const sidebar =
        palette.id === 'default'
          ? mix(panel, text, 0.985)
          : mix(panel, canvas, 0.28)

      const search = mix(sidebar, border, 0.36)
      const hover = mix(sidebar, border, 0.74)
      const active = mix(sidebar, border, 0.5)

      expect(luma(search), palette.id).toBeLessThan(luma(sidebar) - 4)
      expect(luma(active), palette.id).toBeLessThan(luma(hover))
      expect(luma(search), palette.id).toBeLessThan(luma(active))
      expect(luma(hover), palette.id).toBeLessThan(luma(sidebar))
    }
  })
})
