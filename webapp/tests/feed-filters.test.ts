import { expect, test } from 'bun:test'

import {
  FEED_GOAL_KCAL_RANGE,
  filterSharedMeals,
  goalsForMealKcal,
  mealMatchesFeedGoal,
  type FeedGoal,
} from '../src/features/diary/feed-filters'
import type { MealEntry } from '../src/features/diary/meals-catalog'

function meal(
  overrides: Partial<MealEntry> & Pick<MealEntry, 'id' | 'kcal'>,
): MealEntry {
  return {
    title: 'Обед',
    ingredients: 'курица, рис',
    category: 'Мясо',
    meal: 'Обед',
    at: '2026-08-01T12:00:00.000Z',
    protein: 20,
    fat: 10,
    carbs: 30,
    image: '/diary/meals/meal-01.jpg',
    ...overrides,
  }
}

test('meal kcal maps onto catalog meal extrema for each goal', () => {
  expect(FEED_GOAL_KCAL_RANGE.Похудение).toEqual([0, 550])
  expect(FEED_GOAL_KCAL_RANGE.Здоровье).toEqual([0, 525])
  expect(FEED_GOAL_KCAL_RANGE.Поддержание).toEqual([350, 620])
  expect(FEED_GOAL_KCAL_RANGE.Набор[0]).toBe(550)
  expect(FEED_GOAL_KCAL_RANGE.Набор[1]).toBe(Number.POSITIVE_INFINITY)

  expect(goalsForMealKcal(180)).toEqual(['Похудение', 'Здоровье'])
  expect(goalsForMealKcal(300)).toEqual(['Похудение', 'Здоровье'])
  expect(goalsForMealKcal(400)).toEqual(['Похудение', 'Поддержание', 'Здоровье'])
  expect(goalsForMealKcal(500)).toEqual(['Похудение', 'Поддержание', 'Здоровье'])
  expect(goalsForMealKcal(560)).toEqual(['Набор', 'Поддержание'])
  expect(goalsForMealKcal(850)).toEqual(['Набор'])

  expect(mealMatchesFeedGoal(550, 'Похудение')).toBe(true)
  expect(mealMatchesFeedGoal(551, 'Похудение')).toBe(false)
  expect(mealMatchesFeedGoal(549, 'Набор')).toBe(false)
  expect(mealMatchesFeedGoal(550, 'Набор')).toBe(true)
})

test('feed goal filter keeps meals whose calories fall in that interval', () => {
  const meals = [
    meal({ id: 'light', kcal: 180, title: 'Йогурт' }),
    meal({ id: 'mid', kcal: 400, title: 'Курица' }),
    meal({ id: 'heavy', kcal: 850, title: 'Плов' }),
  ]

  expect(filterSharedMeals(meals, { tab: 'Все', goal: 'Похудение', query: '' }).map((item) => item.id)).toEqual([
    'light',
    'mid',
  ])
  expect(filterSharedMeals(meals, { tab: 'Все', goal: 'Набор', query: '' }).map((item) => item.id)).toEqual([
    'heavy',
  ])
  expect(filterSharedMeals(meals, { tab: 'Все', goal: null, query: 'плов' }).map((item) => item.id)).toEqual([
    'heavy',
  ])
})

test('my likes capsule keeps liked meals and still applies the goal filter', () => {
  const meals = [
    meal({ id: 'liked-light', kcal: 180, liked: true, title: 'Йогурт' }),
    meal({ id: 'liked-heavy', kcal: 850, liked: true, title: 'Плов' }),
    meal({ id: 'plain', kcal: 400, liked: false, title: 'Курица' }),
  ]

  expect(
    filterSharedMeals(meals, { tab: 'Мои лайки', goal: 'Похудение', query: '' }).map((item) => item.id),
  ).toEqual(['liked-light'])
  expect(
    filterSharedMeals(meals, { tab: 'Мои лайки', goal: null, query: 'плов' }).map((item) => item.id),
  ).toEqual(['liked-heavy'])
})

test('every catalog goal has a closed kcal interval for the feed filter', () => {
  const goals: FeedGoal[] = ['Похудение', 'Набор', 'Поддержание', 'Здоровье']
  for (const goal of goals) {
    const [min, max] = FEED_GOAL_KCAL_RANGE[goal]
    expect(min).toBeLessThan(max)
    expect(mealMatchesFeedGoal(min, goal)).toBe(true)
  }
})
