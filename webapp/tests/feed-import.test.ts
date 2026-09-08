import { afterEach, describe, expect, test } from 'bun:test'

import {
  FEED_DIARY_SOURCE_MARK,
  FEED_SOURCE_ID_PREFIX,
  feedMealCreateDraft,
  feedMealStampOnDay,
  feedPlanWeekDays,
  feedSourceAssumption,
  feedSourceOnDay,
  isFeedImportedMeal,
} from '../src/features/diary/feed-import'
import {
  isRationImportedMeal,
  isRationPlanDone,
  isRationPlanPending,
  mealCardOrigin,
  setRationImportedMealTitles,
  visibleMealAssumptions,
} from '../src/features/diary/ration-import'
import { SAMPLE_RATIONS } from './sample-ration'

function restoreRationTitles() {
  setRationImportedMealTitles(SAMPLE_RATIONS.flatMap((ration) => ration.meals.map((meal) => meal.title)))
}

const SOURCE = {
  id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  title: 'Плов с шашлыком',
  ingredients: 'Рис, шашлык из курицы',
  category: 'Мясо' as const,
  meal: 'Обед' as const,
  kcal: 850,
  protein: 54,
  fat: 34,
  carbs: 84,
  portionItems: [{ label: 'Рис ~120 г', kcal: 200, protein: 5, fat: 1, carbs: 40 }],
  micronutrients: [],
}

describe('feed meals copied into the diary', () => {
  afterEach(restoreRationTitles)
  test('stamps a new diary draft without ration marks', () => {
    const now = new Date(2026, 7, 26, 14, 30, 0)
    const draft = feedMealCreateDraft(SOURCE, now)

    expect(draft.title).toBe(SOURCE.title)
    expect(draft.ingredients).toBe(SOURCE.ingredients)
    expect(draft.meal).toBe('Обед')
    expect(draft.recordedAt).toBe(now.toISOString())
    expect(draft.portionItems).toEqual(SOURCE.portionItems)
    expect(draft.assumptions).toEqual([
      FEED_DIARY_SOURCE_MARK,
      feedSourceAssumption(SOURCE.id),
    ])
    expect(draft.assumptions?.some((item) => item.includes('Рацион'))).toBe(false)
    expect(draft.clientKey).toMatch(/^fp:aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa:2026-08-26:/)
    expect(draft.clientKey!.length).toBeLessThanOrEqual(64)
  })

  test('feed stamps are pending, completable, and not treated as a ration import', () => {
    setRationImportedMealTitles(['Плов с шашлыком'])
    const meal = {
      id: '11111111-1111-4111-8111-111111111111',
      title: 'Плов с шашлыком',
      assumptions: [FEED_DIARY_SOURCE_MARK, feedSourceAssumption(SOURCE.id)],
      fromApi: true as const,
    }

    expect(isFeedImportedMeal(meal)).toBe(true)
    expect(isRationImportedMeal(meal)).toBe(false)
    expect(isRationPlanPending(meal)).toBe(true)
    expect(isRationPlanPending(meal, new Set([meal.id]))).toBe(false)
    expect(isRationPlanDone(meal, new Set([meal.id]))).toBe(true)
    expect(mealCardOrigin(meal)).toBe('feed')
    expect(
      visibleMealAssumptions([
        FEED_DIARY_SOURCE_MARK,
        `${FEED_SOURCE_ID_PREFIX}${SOURCE.id}`,
        'Вес по фото',
      ]),
    ).toEqual(['Вес по фото'])
  })

  test('stamps the chosen weekday and remembers the source on that day', () => {
    const thursday = new Date(2026, 7, 27, 9, 15, 0)
    const draft = feedMealCreateDraft(SOURCE, thursday)
    expect(draft.recordedAt).toBe(thursday.toISOString())
    expect(draft.clientKey).toContain('2026-08-27')

    const copied = {
      at: thursday.toISOString(),
      assumptions: [FEED_DIARY_SOURCE_MARK, feedSourceAssumption(SOURCE.id)],
    }
    expect(feedSourceOnDay([copied], SOURCE.id, thursday)).toBe(true)
    expect(feedSourceOnDay([copied], SOURCE.id, new Date(2026, 7, 26, 12, 0, 0))).toBe(false)
    expect(feedSourceOnDay([copied], 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', thursday)).toBe(false)

    const week = feedPlanWeekDays(new Date(2026, 7, 26, 12, 0, 0))
    expect(week.map((day) => day.short)).toEqual([
      'День 1',
      'День 2',
      'День 3',
      'День 4',
      'День 5',
      'День 6',
      'День 7',
    ])
    expect(week[2]?.isToday).toBe(true)
    expect(feedMealStampOnDay(week[3]!.date, thursday).getDate()).toBe(27)
    expect(feedMealStampOnDay(week[3]!.date, thursday).getHours()).toBe(9)
  })
})
