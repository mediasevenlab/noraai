import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import {
  CARD_SHADOWS,
  DEFAULT_CARD_SHADOW,
  parseCardShadowId,
} from '../src/components/card-shadow'

const css = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), '../src/styles/card-shadow.css'),
  'utf8',
)

describe('card shadow', () => {
  test('exposes ten named shadow variants', () => {
    expect(CARD_SHADOWS).toHaveLength(10)
    expect(new Set(CARD_SHADOWS.map((item) => item.id)).size).toBe(10)
    expect(DEFAULT_CARD_SHADOW).toBe('faint')
  })

  test('keeps a known shadow id and falls back otherwise', () => {
    expect(parseCardShadowId('soft')).toBe('soft')
    expect(parseCardShadowId('card-shadow-mid')).toBe(DEFAULT_CARD_SHADOW)
    expect(parseCardShadowId(null)).toBe(DEFAULT_CARD_SHADOW)
    expect(parseCardShadowId('')).toBe(DEFAULT_CARD_SHADOW)
  })

  test('defines a stylesheet for every picker option', () => {
    for (const item of CARD_SHADOWS) {
      expect(css).toContain(`html[data-card-shadow='${item.id}']`)
      expect(css).toContain(`--meal-card-shadow-y: ${item.y}`)
      expect(css).toContain(`--meal-card-shadow-blur: ${item.blur}`)
      expect(css).toContain(`--meal-card-shadow-alpha: ${item.alpha}`)
    }
  })
})
