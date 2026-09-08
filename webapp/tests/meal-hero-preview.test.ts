import { expect, test } from 'bun:test'

import { nextComposerHeroIndex } from '../src/features/diary/meal-hero-preview'

test('added photos land on the newest slide', () => {
  expect(
    nextComposerHeroIndex({
      previous: [],
      next: ['a'],
      activeIndex: 0,
    }),
  ).toBe(0)
  expect(
    nextComposerHeroIndex({
      previous: ['a'],
      next: ['a', 'b'],
      activeIndex: 0,
    }),
  ).toBe(1)
  expect(
    nextComposerHeroIndex({
      previous: ['a', 'b'],
      next: ['a', 'b', 'c'],
      activeIndex: 1,
    }),
  ).toBe(2)
})

test('deleting the current photo goes back to the previous slide', () => {
  expect(
    nextComposerHeroIndex({
      previous: ['a', 'b'],
      next: ['a'],
      activeIndex: 1,
    }),
  ).toBe(0)
  expect(
    nextComposerHeroIndex({
      previous: ['a', 'b', 'c'],
      next: ['a', 'b'],
      activeIndex: 2,
    }),
  ).toBe(1)
})

test('deleting an earlier photo keeps the same remaining image in view', () => {
  expect(
    nextComposerHeroIndex({
      previous: ['a', 'b', 'c'],
      next: ['b', 'c'],
      activeIndex: 2,
    }),
  ).toBe(1)
})
