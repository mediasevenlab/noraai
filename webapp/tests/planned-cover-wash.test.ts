import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import {
  DEFAULT_PLANNED_COVER_WASH,
  PLANNED_COVER_WASHES,
  parsePlannedCoverWashId,
} from '../src/components/planned-cover-wash'

const css = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), '../src/styles/planned-cover-wash.css'),
  'utf8',
)
const menu = readFileSync(
  join(
    dirname(fileURLToPath(import.meta.url)),
    '../src/components/dashboard/PlannedCoverWashMenu.tsx',
  ),
  'utf8',
)
const header = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), '../src/components/dashboard/SiteHeader.tsx'),
  'utf8',
)
const main = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), '../src/main.tsx'),
  'utf8',
)
const sheet = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), '../src/features/diary/meal-sheet.tsx'),
  'utf8',
)

describe('planned cover wash', () => {
  test('exposes the original steps plus fifteen intermediates, defaulting to a clear overlay', () => {
    expect(PLANNED_COVER_WASHES.map((item) => item.percent)).toEqual([
      0, 2, 4, 6, 8, 10, 12, 14, 16, 20, 24, 28, 32, 36, 40, 44, 48, 52, 56, 60, 64, 68, 72, 76, 80,
    ])
    expect(PLANNED_COVER_WASHES).toHaveLength(25)
    expect(new Set(PLANNED_COVER_WASHES.map((item) => item.id)).size).toBe(25)
    expect(DEFAULT_PLANNED_COVER_WASH).toBe('0')
    expect(PLANNED_COVER_WASHES[0]?.percent).toBe(0)
    expect(PLANNED_COVER_WASHES[0]?.wash).toBe('transparent')
    expect(PLANNED_COVER_WASHES.find((item) => item.id === DEFAULT_PLANNED_COVER_WASH)?.label).toContain(
      'нет слоя',
    )
  })

  test('keeps a known wash id and falls back otherwise', () => {
    expect(parsePlannedCoverWashId('0')).toBe('0')
    expect(parsePlannedCoverWashId('14')).toBe('14')
    expect(parsePlannedCoverWashId('80')).toBe('80')
    expect(parsePlannedCoverWashId('planned-cover-wash-32')).toBe(DEFAULT_PLANNED_COVER_WASH)
    expect(parsePlannedCoverWashId(null)).toBe(DEFAULT_PLANNED_COVER_WASH)
    expect(parsePlannedCoverWashId('')).toBe(DEFAULT_PLANNED_COVER_WASH)
  })

  test('defines a stylesheet for every picker option', () => {
    expect(css).toContain('--planned-cover-wash: transparent')
    for (const item of PLANNED_COVER_WASHES) {
      expect(css).toContain(`html[data-planned-cover-wash='${item.id}']`)
      expect(css).toContain(`--planned-cover-wash: ${item.wash}`)
    }
  })

  test('planned covers read the picker variable instead of a fixed mix', () => {
    expect(sheet).toContain('after:bg-[var(--planned-cover-wash)]')
    expect(sheet).not.toContain('after:bg-[color-mix(in_srgb,var(--nora-tint)_32%,transparent)]')
  })

  test('desktop header can pick the wash and the app keeps it in sync', () => {
    expect(menu).toContain('aria-label="Слой запланированных"')
    expect(menu).toContain('Слой запланированных')
    expect(menu).toContain('setPlannedCoverWash(value)')
    expect(header).toContain('<PlannedCoverWashMenu />')
    expect(main).toContain('<PlannedCoverWashSync />')
  })
})
