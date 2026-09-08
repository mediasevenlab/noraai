import { describe, expect, test } from 'bun:test'

import { mealImageCardKey, parseMealImageSize } from './meal-image-variants'

describe('meal image variants', () => {
  test('defaults missing size to the card thumbnail', () => {
    expect(parseMealImageSize(undefined)).toBe('card')
    expect(parseMealImageSize('card')).toBe('card')
    expect(parseMealImageSize('full')).toBe('full')
    expect(parseMealImageSize('original')).toBe('card')
  })

  test('derives a sibling card key without changing the stored original key', () => {
    expect(mealImageCardKey('user/meal-1.jpg')).toBe('user/meal-1.card.webp')
    expect(mealImageCardKey('meal-images/u/2026/08/24/id-meal.webp')).toBe(
      'meal-images/u/2026/08/24/id-meal.card.webp',
    )
    expect(mealImageCardKey('user/meal-1.card.webp')).toBe('user/meal-1.card.webp')
  })
})
