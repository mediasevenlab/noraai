import { existsSync, readFileSync } from 'node:fs'
import { describe, expect, test } from 'bun:test'

import { RATION_GOAL_KCAL_CAP, type RationEntry } from '../src/features/mentor/rations-catalog'

const webappRoot = new URL('../', import.meta.url)

describe('ration catalog product surface', () => {
  test('keeps day types without a numbered catalog', () => {
    expect(RATION_GOAL_KCAL_CAP.Похудение).toBeGreaterThan(0)
    const sample: RationEntry = {
      id: 'day',
      title: 'День',
      description: '',
      goal: 'Похудение',
      days: 1,
      kcal: 900,
      protein: 60,
      fat: 30,
      carbs: 45,
      mealsPerDay: 3,
      image: '/rations/ration-01.jpg',
      source: 'План',
      meals: [],
    }
    expect(sample.source).toBe('План')
  })

  test('drops catalog pages, nav, and assignment feeds', () => {
    expect(existsSync(new URL('src/features/users/UserRationsNavigation.tsx', webappRoot))).toBe(
      false,
    )
    expect(existsSync(new URL('src/features/mentor/MentorRationsPage.tsx', webappRoot))).toBe(false)
    expect(existsSync(new URL('src/platform/user-authored-rations.ts', webappRoot))).toBe(false)

    const nav = readFileSync(new URL('src/features/navigation/model.ts', webappRoot), 'utf8')
    expect(nav).not.toContain("label: 'Дневные рационы'")
    expect(nav).not.toContain("to: '/app/rations'")
    expect(nav).toContain("to: '/app/general'")
    expect(nav).toContain("to: '/mentor/plans'")

    const catalog = readFileSync(
      new URL('src/features/mentor/rations-catalog.ts', webappRoot),
      'utf8',
    )
    expect(catalog).not.toContain('export const RATION_CATALOG')
    expect(catalog).not.toContain('export const RATION_BY_ID')
  })
})
