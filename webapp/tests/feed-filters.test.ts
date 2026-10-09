import { expect, test } from 'bun:test'

import {
  FEED_GOAL_KCAL_RANGE,
  filterSharedMeals,
  filterSharedRations,
  orderByLikedAt,
  goalsForMealKcal,
  mealMatchesFeedGoal,
  type FeedGoal,
} from '../src/features/diary/feed-filters'
import type { MealEntry } from '../src/features/diary/meals-catalog'
import type { SharedRation } from '@web-app-demo/contracts'

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

  expect(
    filterSharedMeals(meals, { likedOnly: false, goal: 'Похудение', query: '' }).map((item) => item.id),
  ).toEqual([
    'light',
    'mid',
  ])
  expect(
    filterSharedMeals(meals, { likedOnly: false, goal: 'Набор', query: '' }).map((item) => item.id),
  ).toEqual([
    'heavy',
  ])
  expect(
    filterSharedMeals(meals, { likedOnly: false, goal: null, query: 'плов' }).map((item) => item.id),
  ).toEqual([
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
    filterSharedMeals(meals, { likedOnly: true, goal: 'Похудение', query: '' }).map((item) => item.id),
  ).toEqual(['liked-light'])
  expect(
    filterSharedMeals(meals, { likedOnly: true, goal: null, query: 'плов' }).map((item) => item.id),
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

test('ration feed keeps published plans by likes, goal and query', () => {
  function ration(overrides: Partial<SharedRation> & Pick<SharedRation, 'id'>): SharedRation {
    return {
      sourcePlanId: overrides.id,
      title: 'Офис',
      description: '',
      goal: 'Похудение',
      coverImage: '/cover.jpg',
      days: 1,
      kcal: 1400,
      protein: 80,
      fat: 40,
      carbs: 120,
      meals: [],
      shared: true,
      sharedAt: '2026-09-16T10:00:00.000Z',
      createdAt: '2026-09-16T10:00:00.000Z',
      updatedAt: '2026-09-16T10:00:00.000Z',
      likeCount: 0,
      liked: false,
      own: false,
      ...overrides,
    }
  }
  const items = [
    ration({ id: 'cut', title: 'Рельеф', goal: 'Похудение', liked: true }),
    ration({ id: 'bulk', title: 'Набор', goal: 'Набор', liked: false }),
  ]
  expect(filterSharedRations(items, { likedOnly: true, goal: null, query: '' }).map((item) => item.id)).toEqual([
    'cut',
  ])
  expect(
    filterSharedRations(items, { likedOnly: false, goal: 'Набор', query: '' }).map((item) => item.id),
  ).toEqual(['bulk'])
  expect(
    filterSharedRations(items, { likedOnly: false, goal: null, query: 'рельеф' }).map((item) => item.id),
  ).toEqual(['cut'])
  expect(
    filterSharedRations(items, {
      likedOnly: false,
      goal: null,
      query: '',
      period: {
        from: new Date(2026, 8, 16),
        to: new Date(2026, 8, 16, 23, 59, 59, 999),
      },
    }).map((item) => item.id),
  ).toEqual(['cut', 'bulk'])
  expect(
    filterSharedRations(items, {
      likedOnly: false,
      goal: null,
      query: '',
      period: {
        from: new Date(2026, 7, 1),
        to: new Date(2026, 7, 31, 23, 59, 59, 999),
      },
    }).map((item) => item.id),
  ).toEqual([])
})

test('feed period keeps meals whose recorded day is inside the picked range', () => {
  const meals = [
    meal({ id: 'aug', kcal: 400, at: '2026-08-10T12:00:00.000Z', title: 'Август' }),
    meal({ id: 'sep', kcal: 400, at: '2026-09-16T08:00:00.000Z', title: 'Сентябрь' }),
  ]
  expect(
    filterSharedMeals(meals, {
      likedOnly: false,
      goal: null,
      query: '',
      period: {
        from: new Date(2026, 8, 1),
        to: new Date(2026, 8, 30, 23, 59, 59, 999),
      },
    }).map((item) => item.id),
  ).toEqual(['sep'])
})

test('likes and bookmarks show the latest mark first', () => {
  const meals = [
    meal({ id: 'old', kcal: 400, likedAt: '2026-10-01T08:00:00.000Z' }),
    meal({ id: 'new', kcal: 400, likedAt: '2026-10-08T08:00:00.000Z' }),
    meal({ id: 'plain', kcal: 400 }),
  ]
  expect(orderByLikedAt(meals).map((item) => item.id)).toEqual(['new', 'old', 'plain'])
})
