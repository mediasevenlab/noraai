import { describe, expect, test } from 'bun:test'

import {
  dayShoppingItems,
  isDayShoppingComplete,
  shoppingItemKey,
  toggleBoughtShoppingKey,
} from '../src/features/diary/day-shopping'
import { RATION_DIARY_SOURCE_MARK, setRationImportedMealTitles } from '../src/features/diary/ration-import'

function planned(id: string, ingredients: string) {
  return {
    id,
    title: `План ${id}`,
    ingredients,
    assumptions: [RATION_DIARY_SOURCE_MARK],
    fromApi: true as const,
  }
}

describe('day shopping list', () => {
  test('collects unique ingredients only from ration-imported meals', () => {
    setRationImportedMealTitles([])
    const items = dayShoppingItems([
      planned('a', 'Тунец гриль 140 г, пекинская капуста, огурец.'),
      planned('b', 'Огурец, натуральный йогурт'),
      {
        id: 'own',
        title: 'Свой ужин',
        ingredients: 'Пицца, кола',
        fromApi: true,
      },
    ])
    expect(items.map((item) => item.label)).toEqual([
      'Тунец гриль 140 г',
      'Пекинская капуста',
      'Огурец',
      'Натуральный йогурт',
    ])
    expect(dayShoppingItems([
      planned('a', 'Тунец гриль 140 г, пекинская капуста, огурец.'),
      planned('b', 'Огурец, натуральный йогурт'),
    ], 2).map((item) => item.label)).toEqual(['Тунец гриль 140 г', 'Пекинская капуста'])
    expect(items.map((item) => item.key)).toEqual([
      'тунец гриль 140 г',
      'пекинская капуста',
      'огурец',
      'натуральный йогурт',
    ])
  })

  test('toggle marks a grocery as bought and back', () => {
    const key = shoppingItemKey('Огурец')
    const bought = toggleBoughtShoppingKey(new Set(), key)
    expect(bought.has(key)).toBe(true)
    expect(toggleBoughtShoppingKey(bought, key).has(key)).toBe(false)
  })

  test('a list is complete only after every grocery is bought', () => {
    const items = dayShoppingItems([planned('a', 'огурец, йогурт')])
    expect(isDayShoppingComplete(items, new Set())).toBe(false)
    expect(isDayShoppingComplete(items, new Set(items.map((item) => item.key)))).toBe(true)
    expect(isDayShoppingComplete([], new Set())).toBe(false)
  })
})
