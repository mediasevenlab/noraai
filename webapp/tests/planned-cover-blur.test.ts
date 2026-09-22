import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import {
  DEFAULT_PLANNED_COVER_BLUR,
  PLANNED_COVER_BLURS,
  parsePlannedCoverBlurId,
} from '../src/components/planned-cover-blur'
import { plannedCoverGradeTable, DEFAULT_PLANNED_COVER_GRADE } from '../src/components/planned-cover-grade'
import { PLANNED_COVER_WASHES } from '../src/components/planned-cover-wash'

const css = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), '../src/styles/planned-cover-blur.css'),
  'utf8',
)
const menu = readFileSync(
  join(
    dirname(fileURLToPath(import.meta.url)),
    '../src/components/dashboard/PlannedCoverBlurMenu.tsx',
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

describe('planned cover blur', () => {
  test('uses the same percent steps as the wash picker and defaults to sharp', () => {
    expect(PLANNED_COVER_BLURS.map((item) => item.percent)).toEqual(
      PLANNED_COVER_WASHES.map((item) => item.percent),
    )
    expect(PLANNED_COVER_BLURS).toHaveLength(25)
    expect(new Set(PLANNED_COVER_BLURS.map((item) => item.id)).size).toBe(25)
    expect(DEFAULT_PLANNED_COVER_BLUR).toBe('0')
    expect(PLANNED_COVER_BLURS[0]?.blur).toBe('0px')
    expect(PLANNED_COVER_BLURS.find((item) => item.id === '80')?.blur).toBe('20px')
    expect(PLANNED_COVER_BLURS.find((item) => item.id === DEFAULT_PLANNED_COVER_BLUR)?.label).toContain(
      'нет блюра',
    )
  })

  test('keeps a known blur id and falls back otherwise', () => {
    expect(parsePlannedCoverBlurId('0')).toBe('0')
    expect(parsePlannedCoverBlurId('14')).toBe('14')
    expect(parsePlannedCoverBlurId('80')).toBe('80')
    expect(parsePlannedCoverBlurId('planned-cover-blur-32')).toBe(DEFAULT_PLANNED_COVER_BLUR)
    expect(parsePlannedCoverBlurId(null)).toBe(DEFAULT_PLANNED_COVER_BLUR)
    expect(parsePlannedCoverBlurId('')).toBe(DEFAULT_PLANNED_COVER_BLUR)
  })

  test('defines a stylesheet for every picker option', () => {
    expect(css).toContain('--planned-cover-blur: 0px')
    for (const item of PLANNED_COVER_BLURS) {
      expect(css).toContain(`html[data-planned-cover-blur='${item.id}']`)
      expect(css).toContain(`--planned-cover-blur: ${item.blur}`)
    }
  })

  test('planned covers blur the photo, not the status overlay', () => {
    expect(sheet).toContain('ration-pending-cover')
    expect(css).toContain('url("#nora-planned-cover-grade")')
    expect(css).toContain('blur(var(--planned-cover-blur))')
    expect(sheet).not.toContain("'[&_img]:grayscale'")
  })

  test('desktop header can pick the blur and the app keeps it in sync', () => {
    expect(menu).toContain('aria-label="Блюр запланированных"')
    expect(menu).toContain('Блюр запланированных')
    expect(menu).toContain('setPlannedCoverBlur(value)')
    expect(header).toContain('<PlannedCoverBlurMenu />')
    expect(header).toContain('<PlannedCoverGradeMenu />')
    expect(main).toContain('<PlannedCoverBlurSync />')
    expect(main).toContain('<PlannedCoverGradeSync />')
  })

  test('zero grade leaves the black-and-white curve unchanged', () => {
    const identity = plannedCoverGradeTable({ exposure: 0, contrast: 0, highlights: 0 })
      .split(' ')
      .map(Number)
    expect(identity[0]).toBe(0)
    expect(identity[8]).toBeCloseTo(0.5, 3)
    expect(identity.at(-1)).toBe(1)
    expect(DEFAULT_PLANNED_COVER_GRADE).toEqual({
      exposure: -7,
      contrast: 11,
      highlights: -17,
    })