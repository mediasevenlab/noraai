import { expect, test } from 'bun:test'

import {
  CATALOG_FAVORITE_ID_PREFIX,
  CATALOG_FAVORITE_SOURCE_MARK,
  FEED_DIARY_SOURCE_MARK,
  FEED_SOURCE_ID_PREFIX,
  mealAssumptionsAreCatalogCopy,
  mealAssumptionsArePlanCopy,
  mealAssumptionsBlockShare,
  mealCanPublishToFeed,
  MEAL_AUTHOR_PHOTO_MARK,
  preserveMealShareAssumptions,
  RATION_DIARY_DONE_MARK,
  RATION_DIARY_SOURCE_MARK,
  RATION_PLAN_ID_PREFIX,
  WEEK_PLAN_ID_PREFIX,
  withAuthorPhotoMark,
} from './meal-share'

test('personal meals can be published; derived copies need an owner photo', () => {
  expect(mealAssumptionsBlockShare([])).toBe(false)
  expect(mealAssumptionsBlockShare(['Вес по фото'])).toBe(false)
  expect(mealAssumptionsBlockShare([RATION_DIARY_SOURCE_MARK])).toBe(true)
  expect(mealAssumptionsBlockShare([RATION_DIARY_SOURCE_MARK, RATION_DIARY_DONE_MARK])).toBe(true)
  expect(mealAssumptionsBlockShare([`${RATION_PLAN_ID_PREFIX}mentor-ab12`])).toBe(true)
  expect(mealAssumptionsBlockShare([`${WEEK_PLAN_ID_PREFIX}week:2026-08-31`])).toBe(true)
  expect(mealAssumptionsBlockShare([FEED_DIARY_SOURCE_MARK])).toBe(true)
  expect(mealAssumptionsBlockShare([`${FEED_SOURCE_ID_PREFIX}aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa`])).toBe(true)
  expect(mealAssumptionsBlockShare([CATALOG_FAVORITE_SOURCE_MARK])).toBe(true)
  expect(mealAssumptionsBlockShare([`${CATALOG_FAVORITE_ID_PREFIX}plan-preview:catalog_loss:1`])).toBe(true)
  expect(mealAssumptionsArePlanCopy([CATALOG_FAVORITE_SOURCE_MARK])).toBe(false)
  expect(mealAssumptionsAreCatalogCopy([CATALOG_FAVORITE_SOURCE_MARK])).toBe(true)
  expect(mealAssumptionsAreCatalogCopy([RATION_DIARY_SOURCE_MARK])).toBe(false)
  expect(
    mealCanPublishToFeed({
      assumptions: [CATALOG_FAVORITE_SOURCE_MARK, MEAL_AUTHOR_PHOTO_MARK],
    }),
  ).toBe(true)
  expect(
    mealCanPublishToFeed({
      assumptions: [RATION_DIARY_SOURCE_MARK],
      extraImageKeys: ['meals/owner-photo.webp'],
    }),
  ).toBe(true)
  expect(
    mealCanPublishToFeed({
      assumptions: [FEED_DIARY_SOURCE_MARK],
      extraImageKeys: ['  '],
    }),
  ).toBe(false)
})

test('refine keeps origin stamps and records an owner photo', () => {
  expect(
    preserveMealShareAssumptions(
      [RATION_DIARY_SOURCE_MARK, `${RATION_PLAN_ID_PREFIX}office`, 'Старый вес'],
      ['Банан спелый', RATION_DIARY_SOURCE_MARK],
    ),
  ).toEqual([
    RATION_DIARY_SOURCE_MARK,
    `${RATION_PLAN_ID_PREFIX}office`,
    'Банан спелый',
  ])
  expect(withAuthorPhotoMark([CATALOG_FAVORITE_SOURCE_MARK])).toEqual([
    CATALOG_FAVORITE_SOURCE_MARK,
    MEAL_AUTHOR_PHOTO_MARK,
  ])
  expect(withAuthorPhotoMark([MEAL_AUTHOR_PHOTO_MARK])).toEqual([MEAL_AUTHOR_PHOTO_MARK])
})
