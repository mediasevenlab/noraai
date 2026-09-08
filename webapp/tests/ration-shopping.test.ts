import { describe, expect, test } from 'bun:test'

import { SAMPLE_RATIONS } from './sample-ration'
import {
  rationShoppingList,
  toggleBoughtRationShoppingKey,
} from '../src/features/mentor/ration-shopping'

describe('ration shopping list', () => {
  test('collects unique grocery lines from every meal in the ration', () => {
    const ration = SAMPLE_RATIONS[0]!
    const items = rationShoppingList(ration.meals)
    expect(items.length).toBeGreaterThan(3)
    expect(new Set(items.map((item) => item.key)).size).toBe(items.length)
    expect(items.some((item) => item.label.toLowerCase().includes('кабачок'))).toBe(true)
    expect(items.map((item) => item.key)).toEqual(items.map((item) => item.label.trim().toLowerCase()))
  })

  test('toggle marks a grocery as bought and back', () => {
    const key = rationShoppingList(SAMPLE_RATIONS[0]!.meals)[0]!.key
    const bought = toggleBoughtRationShoppingKey(new Set(), key)
    expect(bought.has(key)).toBe(true)
    expect(toggleBoughtRationShoppingKey(bought, key).has(key)).toBe(false)
  })
})
