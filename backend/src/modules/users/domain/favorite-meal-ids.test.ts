import { expect, test } from 'bun:test'

import { publishedFavoriteMealIds, uuidMealIds } from './favorite-meal-ids'

test('favorite ownership lookup drops demo and catalog preview ids', () => {
  const owned = '11111111-1111-4111-8111-111111111111'
  expect(
    uuidMealIds([
      owned,
      'meal-01',
      'plan-preview:catalog_loss:2026-09-01:0:Завтрак',
    ]),
  ).toEqual([owned])
})

test('published favorites keep only contract-safe owned meal ids', () => {
  const owned = '11111111-1111-4111-8111-111111111111'
  expect(
    publishedFavoriteMealIds([
      owned,
      'meal-01',
      `${owned}-extra-that-makes-this-id-longer-than-eighty-characters-xxxxxxxx`,
    ]),
  ).toEqual([owned])
})
