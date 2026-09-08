import { describe, expect, test } from 'bun:test'

import {
  intersectingMealIds,
  rememberViewedMealIds,
} from '../src/features/diary/meal-viewport'

function entry(id: string | null, isIntersecting: boolean) {
  return {
    isIntersecting,
    target: {
      getAttribute(name: string) {
        return name === 'data-meal-id' ? id : null
      },
    },
  }
}

describe('rememberViewedMealIds', () => {
  test('adds new persisted ids and keeps the same set when nothing changes', () => {
    const uploaded = '11111111-1111-4111-8111-111111111111'
    const other = '22222222-2222-4222-8222-222222222222'
    const current = new Set([uploaded])
    expect(rememberViewedMealIds(current, [uploaded, 'demo-meal-1'])).toBe(current)
    expect([...rememberViewedMealIds(current, [other])]).toEqual([uploaded, other])
  })
})

describe('intersectingMealIds', () => {
  test('keeps only visible persisted meal cards', () => {
    const uploaded = '11111111-1111-4111-8111-111111111111'
    const other = '22222222-2222-4222-8222-222222222222'
    expect(
      intersectingMealIds([
        entry(uploaded, true),
        entry('demo-meal-1', true),
        entry(other, false),
        entry(uploaded, true),
        entry(null, true),
      ]),
    ).toEqual([uploaded])
  })
})
