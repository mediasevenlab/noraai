import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, test } from 'bun:test'

import {
  allLightPaletteClassNames,
  DEFAULT_LIGHT_PALETTE,
  LIGHT_PALETTES,
  lightPaletteClassName,
  noraSchemeClassNames,
  parseLightPaletteId,
} from '../src/components/light-palette'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')

const REMOVED_PALETTE_IDS = [
  'linen',
  'mist',
  'fog',
  'stone',
  'slate',
  'chalk',
  'shell',
  'pumice',
  'silk',
  'parchment',
  'flint',
  'drift',
  'quiet',
  'sage',
  'sky',
  'blush',
  'sand',
  'lilac',
  'mint',
  'apricot',
  'glacier',
  'clay',
  'honey',
  'ivory',
  'alabaster',
  'gypsum',
  'biscuit',
  'talc',
  'cotton',
  'ash',
  'salt',
  'quartz',
  'marble',
  'frost',
  'platinum',
  'snow',
  'ice',
  'silver',
  'steel',
  'cement',
  'zinc',
  'chrome',
  'vapor',
  'moon',
  'enamel',
  'foam',
  'veil',
  'pebble',
  'tin',
  'nickel',
  'titanium',
  'granite',
  'mica',
  'echo',
  'sigh',
  'aside',
  'mute',
  'haze',
  'lull',
  'faint',
  'dim',
] as const

const ADDED_PALETTE_IDS = [
  'breath',
  'breathtwo',
  'breaththree',
  'limestone',
  'plaster',
  'limewash',
  'gesso',
  'kaolin',
  'calcite',
  'whisper',
  'still',
  'nordic',
  'mineral',
  'honed',
  'dolomite',
  'feldspar',
  'dew',
  'cirrus',
  'hush',
  'gallery',
  'zen',
  'spa',
  'wisp',
  'murmur',
] as const

function hexRgb(hex: string) {
  const n = hex.replace('#', '')
  return {
    r: Number.parseInt(n.slice(0, 2), 16),
    g: Number.parseInt(n.slice(2, 4), 16),
    b: Number.parseInt(n.slice(4, 6), 16),
  }
}

function hexChannelSpread(hex: string) {
  const { r, g, b } = hexRgb(hex)
  return Math.max(r, g, b) - Math.min(r, g, b)
}

describe('light palette', () => {
  test('keeps a known palette id and falls back otherwise', () => {
    expect(DEFAULT_LIGHT_PALETTE).toBe('pearl')
    expect(parseLightPaletteId('pearl')).toBe('pearl')
    expect(parseLightPaletteId('whisper')).toBe('whisper')
    expect(parseLightPaletteId('light-palette-pearl')).toBe(DEFAULT_LIGHT_PALETTE)
    expect(parseLightPaletteId(null)).toBe(DEFAULT_LIGHT_PALETTE)
    expect(parseLightPaletteId('')).toBe(DEFAULT_LIGHT_PALETTE)
  })

  test('drops retired palettes back to the default scheme', () => {
    for (const id of REMOVED_PALETTE_IDS) {
      expect(parseLightPaletteId(id)).toBe(DEFAULT_LIGHT_PALETTE)
    }
  })

  test('applies a palette class only in the light scheme', () => {
    expect(noraSchemeClassNames(true, 'breath')).toEqual(['scheme-editor-dark'])
    expect(noraSchemeClassNames(false, 'breath')).toEqual([
      'scheme-editor-light',
      'light-palette-breath',
      'light-text-default',
    ])
  })

  test('lists every palette class so dark sync can strip them', () => {
    expect(allLightPaletteClassNames()).toContain(lightPaletteClassName('default'))
    expect(allLightPaletteClassNames()).toContain(lightPaletteClassName('aluminum'))
    expect(allLightPaletteClassNames()).toHaveLength(31)
    expect(LIGHT_PALETTES).toHaveLength(31)
    for (const id of ADDED_PALETTE_IDS) {
      expect(allLightPaletteClassNames()).toContain(lightPaletteClassName(id))
    }
    for (const id of REMOVED_PALETTE_IDS) {
      expect(allLightPaletteClassNames()).not.toContain(`light-palette-${id}`)
    }
    const whisper = LIGHT_PALETTES.find((palette) => palette.id === 'whisper')
    const murmur = LIGHT_PALETTES.find((palette) => palette.id === 'murmur')
    expect(whisper).toBeDefined()
    expect(murmur?.label).toBe('Шорох')
    expect(murmur?.panel).toBe(whisper?.panel)
    expect(murmur?.canvas).toBe(whisper?.canvas)
    const limewash = LIGHT_PALETTES.find((palette) => palette.id === 'limewash')
    expect(limewash?.label).toBe('Известь')
    expect(limewash?.panel).toBe('#ffffff')
    expect(limewash?.canvas).toBe('#f2f2f2')
    expect(hexChannelSpread(limewash?.canvas ?? '')).toBe(0)
  })

  test('keeps every light palette in a quiet cool-gray range without beige', () => {
    for (const palette of LIGHT_PALETTES) {
      const canvas = hexRgb(palette.canvas)
      expect(hexChannelSpread(palette.panel), palette.id).toBeLessThanOrEqual(10)
      expect(hexChannelSpread(palette.canvas), palette.id).toBeLessThanOrEqual(16)
      expect(canvas.r - canvas.b, palette.id).toBeLessThanOrEqual(3)
    }
  })

  test('hairlines sit between the Base and Dove line weights', () => {
    const css = readFileSync(resolve(root, 'src/styles/nora-ui.css'), 'utf8')
    expect(css).toContain('var(--light-canvas) 96%')
    expect(css).toContain('--nora-divider: color-mix')
    expect(css).not.toMatch(/--nora-divider:\s*var\(--light-border/)

    const text = hexRgb('#333333')
    const baseLine = hexRgb('#eeeeee')
    const doveLine = hexRgb('#dcdddd')
    const hairline = {
      r: baseLine.r * 0.96 + text.r * 0.04,
      g: baseLine.g * 0.96 + text.g * 0.04,
      b: baseLine.b * 0.96 + text.b * 0.04,
    }
    const luma = ({ r, g, b }: { r: number; g: number; b: number }) =>
      0.2126 * r + 0.7152 * g + 0.0722 * b
    expect(luma(hairline)).toBeLessThan(luma(baseLine))
    expect(luma(hairline)).toBeGreaterThan(luma(doveLine))

    expect(css).toContain('light-palette-limewash')
    expect(css).toContain('var(--light-canvas) 94%')
    const limewashCanvas = hexRgb('#f2f2f2')
    const limewashLine = {
      r: limewashCanvas.r * 0.94 + text.r * 0.06,
      g: limewashCanvas.g * 0.94 + text.g * 0.06,
      b: limewashCanvas.b * 0.94 + text.b * 0.06,
    }
    const plasterLine = {
      r: limewashCanvas.r * 0.96 + text.r * 0.04,
      g: limewashCanvas.g * 0.96 + text.g * 0.04,
      b: limewashCanvas.b * 0.96 + text.b * 0.04,
    }
    expect(luma(limewashLine)).toBeLessThan(luma(plasterLine))
    expect(luma(limewashLine)).toBeGreaterThan(luma(doveLine))
  })
})
