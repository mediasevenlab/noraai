import { expect, test } from 'bun:test'

import {
  capitalizeShoppingLabel,
  groceryShoppingLines,
  mergeGroceryShoppingLines,
} from '../src/platform/grocery-lines'

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

test('sums the same grocery across spoons, millilitres and litres', () => {
  expect(
    mergeGroceryShoppingLines([
      'Масло растительное – 110 мл',
      'Масло растительное – 1 ч.л',
      'Масло растительное – 5 ст.л',
    ]),
  ).toEqual(['Масло растительное – 190 мл'])
  expect(
    mergeGroceryShoppingLines(['Вода – 1 л', 'Вода – 700 мл', 'вода – 2 ст.л']),
  ).toEqual(['Вода – 1730 мл'])
  expect(mergeGroceryShoppingLines(['Соль – 1 ч.л', 'Соль – 1 ч.л'])).toEqual(['Соль – 2 ч.л'])
  expect(mergeGroceryShoppingLines(['Приправа – 1 ст.л', 'Приправа – 2 ст.л'])).toEqual([
    'Приправа – 3 ст.л',
  ])
})

test('shopping lines drop quoted garnish notes', () => {
  expect(
    groceryShoppingLines(
      'Свинина – 1 кг, Чернослив – 250 г, Приправа – 1 ст.л. , "Для свинины", Соль – 1 ч.л. , или по вкусу',
    ),
  ).toEqual(['Свинина – 1 кг', 'Чернослив – 250 г', 'Приправа – 1 ст.л', 'Соль – 1 ч.л'])
  expect(groceryShoppingLines('«Для свинины», Перец черный – 1,5 ч.л')).toEqual([
    'Перец черный – 1,5 ч.л',
  ])
})

test('shopping labels start with a capital letter', () => {
  expect(capitalizeShoppingLabel('булгур – 260 г')).toBe('Булгур – 260 г')
  expect(capitalizeShoppingLabel('яблоко 150 г')).toBe('Яблоко 150 г')
  expect(capitalizeShoppingLabel('Филе – 400 г')).toBe('Филе – 400 г')
  expect(capitalizeShoppingLabel('  салат с – 10 г')).toBe('Салат с – 10 г')
})
