import { afterEach, describe, expect, test } from 'bun:test'

import { CATALOG_FAVORITE_SOURCE_MARK } from '../src/features/diary/catalog-favorite'
import { assumptionsForMeal } from '../src/features/diary/meals-catalog'
import {
  currentWeekPlanStampId,
  isDiaryFeedMealVisible,
  isPendingPlanMealShownInDiary,
  isRationImportedMeal,
  isRationPlanDone,
  isRationPlanPending,
  mealBelongsToWeekPlan,
  mealCanShareToFeed,
  mealCardOrigin,
  RATION_DIARY_DONE_MARK,
  RATION_DIARY_SOURCE_MARK,
  rationPlanAssumption,
  setRationImportedMealTitles,
  visibleMealAssumptions,
  weekPlanAssumption,
} from '../src/features/diary/ration-import'
import { SAMPLE_RATIONS } from './sample-ration'
import { weekPlanOptions } from '../src/features/mentor/ration-assignments'

function restoreRationTitles() {
  setRationImportedMealTitles(SAMPLE_RATIONS.flatMap((ration) => ration.meals.map((meal) => meal.title)))
}

describe('ration-imported diary meals', () => {
  afterEach(restoreRationTitles)

  test('does not treat a self-uploaded meal as planned just because the title matches a ration dish', () => {
    setRationImportedMealTitles(['Шаурма с курицей', 'Треска и брокколи'])
    expect(
      isRationImportedMeal({
        title: 'Шаурма с курицей',
        fromApi: true,
      }),
    ).toBe(false)
    expect(
      isRationImportedMeal({
        id: '11111111-1111-4111-8111-111111111111',
        title: 'Треска и брокколи',
      }),
    ).toBe(false)
    expect(
      isRationImportedMeal({
        title: 'Куриный ролл с салатом',
        fromApi: true,
      }),
    ).toBe(false)
  })

  test('mutes meals stamped as added from a ration even without a title match', () => {
    setRationImportedMealTitles([])
    expect(
      isRationImportedMeal({
        title: 'Свой ужин',
        assumptions: [RATION_DIARY_SOURCE_MARK],
        fromApi: true,
      }),
    ).toBe(true)
    expect(
      isRationImportedMeal({
        title: 'Свой ужин',
        assumptions: [rationPlanAssumption('ration-02')],
      }),
    ).toBe(true)
    expect(
      visibleMealAssumptions([
        RATION_DIARY_SOURCE_MARK,
        rationPlanAssumption('ration-02'),
        weekPlanAssumption('week:2026-08-17'),
        'Вес по фото',
      ]),
    ).toEqual(['Вес по фото'])
  })

  test('planned ration meals stay pending until marked done', () => {
    const meal = {
      id: '11111111-1111-4111-8111-111111111111',
      title: 'Говядина и гречка',
      fromApi: true as const,
      assumptions: [RATION_DIARY_SOURCE_MARK],
    }
    expect(isRationPlanPending(meal)).toBe(true)
    expect(isRationPlanPending(meal, new Set([meal.id]))).toBe(false)
    expect(isRationPlanDone(meal)).toBe(false)
    expect(isRationPlanDone(meal, new Set([meal.id]))).toBe(true)
    expect(
      isRationPlanPending({
        ...meal,
        assumptions: [RATION_DIARY_DONE_MARK],
      }),
    ).toBe(false)
    expect(
      isRationPlanPending({
        title: 'Говядина и гречка',
        fromApi: true,
      }),
    ).toBe(false)
  })

  test('diary cards keep a meal origin even when the meal came from a ration', () => {
    setRationImportedMealTitles(['Треска и брокколи'])
    expect(
      mealCardOrigin({
        title: 'Мой ужин',
        fromApi: true,
      }),
    ).toBe('diary')
    expect(
      mealCardOrigin({
        title: 'Треска и брокколи',
        fromApi: true,
      }),
    ).toBe('diary')
    expect(
      mealCardOrigin({
        title: 'Свой ужин',
        assumptions: [rationPlanAssumption('ration-02')],
      }),
    ).toBe('diary')
    expect(
      mealCardOrigin({
        title: 'Омлет наставника',
        assumptions: [rationPlanAssumption('mentor-ab12cd34-xyz')],
      }),
    ).toBe('diary')
  })

  test('hides pending plan meals in the diary until a plan is selected', () => {
    const now = new Date(2026, 8, 1)
    const weekId = currentWeekPlanStampId(now)
    expect(weekId).toBe(weekPlanOptions(now)[0]?.id)
    const pending = {
      id: 'pending-plan-meal',
      title: 'Овсянка',
      fromApi: true as const,
      assumptions: [RATION_DIARY_SOURCE_MARK, rationPlanAssumption('ration-01'), weekPlanAssumption(weekId)],
    }
    const done = {
      ...pending,
      id: 'done-plan-meal',
      assumptions: [
        RATION_DIARY_SOURCE_MARK,
        RATION_DIARY_DONE_MARK,
        rationPlanAssumption('ration-01'),
        weekPlanAssumption(weekId),
      ],
    }
    const own = { id: 'own-meal', title: 'Мой обед', fromApi: true as const }
    const otherPlan = {
      ...pending,
      id: 'other-plan-meal',
      assumptions: [
        RATION_DIARY_SOURCE_MARK,
        rationPlanAssumption('ration-01'),
        weekPlanAssumption('plan_office'),
      ],
    }
    expect(isPendingPlanMealShownInDiary(own, null, undefined, now)).toBe(true)
    expect(isPendingPlanMealShownInDiary(done, null, undefined, now)).toBe(true)
    expect(isPendingPlanMealShownInDiary(pending, null, undefined, now)).toBe(false)
    expect(isPendingPlanMealShownInDiary(pending, weekId, undefined, now)).toBe(true)
    expect(isPendingPlanMealShownInDiary(otherPlan, weekId, undefined, now)).toBe(false)
    expect(isPendingPlanMealShownInDiary(otherPlan, 'plan_office', undefined, now)).toBe(true)
    expect(isPendingPlanMealShownInDiary(pending, weekId, new Set([pending.id]), now)).toBe(true)
    const unstamped = {
      id: 'unstamped-plan-meal',
      title: 'Овсянка',
      fromApi: true as const,
      assumptions: [RATION_DIARY_SOURCE_MARK, rationPlanAssumption('ration-01')],
    }
    expect(isPendingPlanMealShownInDiary(unstamped, weekId, undefined, now)).toBe(true)
    expect(isPendingPlanMealShownInDiary(unstamped, 'plan_office', undefined, now)).toBe(false)
  })

  test('the live week plan still owns last week’s week-stamped template', () => {
    const now = new Date(2026, 8, 1)
    const thisWeek = currentWeekPlanStampId(now)
    const lastWeek = 'week:2026-08-24'
    const meal = {
      assumptions: [RATION_DIARY_SOURCE_MARK, weekPlanAssumption(lastWeek)],
    }
    expect(mealBelongsToWeekPlan(meal, thisWeek, thisWeek)).toBe(true)
    expect(mealBelongsToWeekPlan(meal, 'plan_office', thisWeek)).toBe(false)
    expect(mealBelongsToWeekPlan(meal, lastWeek, thisWeek)).toBe(true)
  })

  test('shows pending plan meals only on today and hides future diary days', () => {
    const now = new Date(2026, 8, 1, 12)
    const weekId = currentWeekPlanStampId(now)
    const pendingToday = {
      id: 'pending-today',
      title: 'Овсянка',
      fromApi: true as const,
      at: new Date(2026, 8, 1, 9).toISOString(),
      assumptions: [
        RATION_DIARY_SOURCE_MARK,
        rationPlanAssumption('ration-01'),
        weekPlanAssumption(weekId),
      ],
    }
    const pendingYesterday = {
      ...pendingToday,
      id: 'pending-yesterday',
      at: new Date(2026, 7, 31, 9).toISOString(),
    }
    const pendingTomorrow = {
      ...pendingToday,
      id: 'pending-tomorrow',
      at: new Date(2026, 8, 2, 9).toISOString(),
    }
    const doneYesterday = {
      ...pendingYesterday,
      id: 'done-yesterday',
      assumptions: [...pendingYesterday.assumptions, RATION_DIARY_DONE_MARK],
    }
    const ownYesterday = {
      id: 'own-yesterday',
      title: 'Мой обед',
      fromApi: true as const,
      at: pendingYesterday.at,
    }
    const ownTomorrow = {
      id: 'own-tomorrow',
      title: 'Завтрак заранее',
      fromApi: true as const,
      at: pendingTomorrow.at,
    }
    expect(isPendingPlanMealShownInDiary(pendingYesterday, weekId, undefined, now)).toBe(true)
    expect(isDiaryFeedMealVisible(pendingToday, weekId, undefined, now)).toBe(true)
    expect(isDiaryFeedMealVisible(pendingYesterday, weekId, undefined, now)).toBe(false)
    expect(isDiaryFeedMealVisible(pendingTomorrow, weekId, undefined, now)).toBe(false)
    expect(isDiaryFeedMealVisible(doneYesterday, weekId, undefined, now)).toBe(true)
    expect(isDiaryFeedMealVisible(ownYesterday, weekId, undefined, now)).toBe(true)
    expect(isDiaryFeedMealVisible(ownTomorrow, null, undefined, now)).toBe(false)
    expect(isDiaryFeedMealVisible(pendingYesterday, weekId, undefined, now, true)).toBe(false)
    expect(isDiaryFeedMealVisible(pendingTomorrow, weekId, undefined, now, true)).toBe(true)
    expect(isDiaryFeedMealVisible(ownTomorrow, null, undefined, now, true)).toBe(false)
    const otherPlan = {
      ...pendingToday,
      id: 'pending-office',
      assumptions: [
        RATION_DIARY_SOURCE_MARK,
        rationPlanAssumption('ration-office'),
        weekPlanAssumption('plan_office'),
      ],
    }
    expect(isDiaryFeedMealVisible(pendingToday, new Set([weekId, 'plan_office']), undefined, now)).toBe(
      true,
    )
    expect(isDiaryFeedMealVisible(otherPlan, new Set([weekId, 'plan_office']), undefined, now)).toBe(
      true,
    )
    expect(isDiaryFeedMealVisible(otherPlan, new Set([weekId]), undefined, now)).toBe(false)
  })

  test('hides the import stamp from the visible assumptions list', () => {
    expect(
      assumptionsForMeal({
        id: 'meal-ration',
        title: 'Треска и брокколи',
        ingredients: 'Треска, брокколи',
        category: 'Рыба',
        meal: 'Ужин',
        at: '2026-08-22T15:30:00.000Z',
        kcal: 350,
        protein: 38,
        fat: 8,
        carbs: 22,
        image: '/rations/ration-01-4.jpg',
        assumptions: [RATION_DIARY_SOURCE_MARK],
        fromApi: true,
      }),
    ).toEqual([
      'Вес продуктов оценён по фото, без кухонных весов.',
      'Масло/соус учтены средним значением для такого блюда.',
      'Допускается погрешность ±10–15% по КБЖУ.',
    ])
  })

  test('only user-authored meals can be shared to the feed', () => {
    expect(mealCanShareToFeed({ title: 'Овсянка', fromApi: true, assumptions: [] })).toBe(true)
    expect(
      mealCanShareToFeed({
        title: 'План',
        fromApi: true,
        assumptions: [RATION_DIARY_SOURCE_MARK],
      }),
    ).toBe(false)
    expect(
      mealCanShareToFeed({
        id: 'plan-preview:catalog_loss:2026-09-01:0:Завтрак',
        title: 'Каталог',
      }),
    ).toBe(false)
    expect(
      mealCanShareToFeed({
        id: '11111111-1111-4111-8111-111111111111',
        title: 'Каталог',
        fromApi: true,
        assumptions: [CATALOG_FAVORITE_SOURCE_MARK],
      }),
    ).toBe(false)
  })
})
