import { expect, test } from 'bun:test'

import { readPlanStartDate, writePlanStartDate } from '../src/platform/plan-start'
import { planSlotIndex, planSlotLabel } from '../src/platform/plan-slots'

test('plan slots are ordinal days, Monday stamp is Day 1', () => {
  expect(planSlotLabel(0)).toBe('День 1')
  expect(planSlotLabel(6)).toBe('День 7')
  expect(planSlotIndex(new Date(2026, 7, 31))).toBe(0)
  expect(planSlotIndex(new Date(2026, 8, 1))).toBe(1)
})

test('plan start date is stored per plan for the account', () => {
  const memory = new Map<string, string>()
  const originalStorage = globalThis.localStorage
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: {
      getItem: (key: string) => memory.get(key) ?? null,
      setItem: (key: string, value: string) => {
        memory.set(key, value)
      },
      removeItem: (key: string) => {
        memory.delete(key)
      },
    },
  })
  try {
    const scope = { userId: 'user-1', email: 'plan@example.com' }
    writePlanStartDate(scope, 'week:2026-08-31', new Date(2026, 8, 3))
    const start = readPlanStartDate(scope, 'week:2026-08-31')
    expect(start?.getFullYear()).toBe(2026)
    expect(start?.getMonth()).toBe(8)
    expect(start?.getDate()).toBe(3)
    expect(readPlanStartDate(scope, 'other')).toBeNull()
  } finally {
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      value: originalStorage,
    })
  }
})
