import { expect, test } from 'bun:test'

import { capitalizeShoppingLabel, mergeGroceryShoppingLines } from '../src/platform/grocery-lines'

test('merges the same grocery by name and sums compatible amounts', () => {
  expect(
    mergeGroceryShoppingLines(['Мука – 30 г', 'Мука – 400 г', 'Сахар – 70 г', 'Мука – 30 г']),
  ).toEqual(['Мука – 460 г', 'Сахар – 70 г'])
  expect(mergeGroceryShoppingLines(['Мука – 1 кг', 'мука – 30 г'])).toEqual(['Мука – 1030 г'])
  expect(mergeGroceryShoppingLines(['Яйцо куриное – 2 шт', 'Яйцо куриное – 4 шт'])).toEqual([
    'Яйцо куриное – 6 шт',
  ])
  expect(mergeGroceryShoppingLines(['яйца', 'хлеб', 'яйца', 'хлеб'])).toEqual(['яйца', 'хлеб'])
  expect(mergeGroceryShoppingLines(['Мука – 30 г', 'Мука пшеничная – 70 г'])).toEqual([
    'Мука – 30 г',
    'Мука пшеничная – 70 г',
  ])
  expect(mergeGroceryShoppingLines(['яблоко 150 г', 'Яблоко – 50 г'])).toEqual(['яблоко – 200 г'])
  expect(mergeGroceryShoppingLines(['кефир 1%', 'кефир 1%'])).toEqual(['кефир 1%'])
})

test('shopping labels start with a capital letter', () => {
  expect(capitalizeShoppingLabel('булгур – 260 г')).toBe('Булгур – 260 г')
  expect(capitalizeShoppingLabel('яблоко 150 г')).toBe('Яблоко 150 г')
  expect(capitalizeShoppingLabel('Филе – 400 г')).toBe('Филе – 400 г')
  expect(capitalizeShoppingLabel('  салат с – 10 г')).toBe('Салат с – 10 г')
})
