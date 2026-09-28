import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import {
  CARD_RADII,
  DEFAULT_CARD_RADIUS,
  parseCardRadiusId,
} from '../src/components/card-radius'

const css = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), '../src/styles/card-radius.css'),
  'utf8',
)

describe('card radius', () => {
  test('exposes ten named radius variants', () => {
    expect(CARD_RADII).toHaveLength(10)
    expect(new Set(CARD_RADII.map((item) => item.id)).size).toBe(10)
    expect(DEFAULT_CARD_RADIUS).toBe('12')
    expect(CARD_RADII.find((item) => item.id === DEFAULT_CARD_RADIUS)?.label).toContain(
      'по умолчанию',
    )
  })

  test('keeps a known radius id and falls back otherwise', () => {
    expect(parseCardRadiusId('20')).toBe('20')
    expect(parseCardRadiusId('card-radius-22')).toBe(DEFAULT_CARD_RADIUS)
    expect(parseCardRadiusId(null)).toBe(DEFAULT_CARD_RADIUS)
    expect(parseCardRadiusId('')).toBe(DEFAULT_CARD_RADIUS)
  })

  test('uses 12px as the stylesheet fallback before a picker value is applied', () => {
    expect(css).toMatch(
      /:root \{\s*--meal-card-radius: 12px;\s*--meal-card-preview-radius: 8px;/,
    )
  })

  test('defines matching card and preview radii for every picker option', () => {
    for (const item of CARD_RADII) {
      expect(css).toContain(`html[data-card-radius='${item.id}']`)
      expect(css).toContain(`--meal-card-radius: ${item.radius}`)
      expect(css).toContain(`--meal-card-preview-radius: ${item.preview}`)
    }
  })

  test('mobile cards stay slightly rounder than the picker value without ballooning', () => {
    expect(css).toContain('@media (max-width: 767px)')
    expect(css).toContain('calc(var(--meal-card-radius) + 2px)')
    expect(css).toContain('calc(var(--meal-card-preview-radius) + 2px)')
    expect(css).not.toContain('calc(var(--meal-card-radius) + 4px)')
  })

  test('preview inherit applies only to cover media, not badges', () => {
    expect(css).toContain("[data-slot='meal-card-preview'] > [data-slot='meal-cover']")
    expect(css).not.toContain("[data-slot='meal-card-preview'] > * {")
  })

  test('card radius stylesheet does not own footer padding', () => {
    expect(css).not.toContain("[data-slot='meal-card-footer']")
  })
})
