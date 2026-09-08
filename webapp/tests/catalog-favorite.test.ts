import { expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'

import {
  apiMealIdForCatalogPreview,
  CATALOG_FAVORITE_SOURCE_MARK,
  catalogFavoriteCreateDraft,
  catalogFavoriteSourceAssumption,
  isCatalogFavoriteMeal,
  isPlanPreviewMealId,
} from '../src/features/diary/catalog-favorite'
import { favoriteMealIdsForSync, reconcileLocalFavoriteIds } from '../src/features/diary/diary-feed'
import { visibleMealAssumptions } from '../src/features/diary/ration-import'

test('catalog favorite draft stamps a diary copy without a plan week', () => {
  const previewId = 'plan-preview:catalog_loss:2026-09-01:0:Завтрак'
  expect(isPlanPreviewMealId(previewId)).toBe(true)
  const draft = catalogFavoriteCreateDraft(
    {
      id: previewId,
      title: 'Жареный творог',
      ingredients: 'Творог, яйцо',
      category: 'Завтрак',
      meal: 'Завтрак',
      kcal: 410,
      protein: 27,
      fat: 25,
      carbs: 20,
    },
    new Date('2026-09-02T10:00:00.000Z'),
  )
  expect(draft.source).toBe('manual')
  expect(draft.assumptions).toEqual([
    CATALOG_FAVORITE_SOURCE_MARK,
    catalogFavoriteSourceAssumption(previewId),
  ])
  expect(draft.clientKey?.startsWith('cf:')).toBe(true)
  expect(draft.clientKey!.length).toBeLessThanOrEqual(64)
  expect(
    visibleMealAssumptions([
      CATALOG_FAVORITE_SOURCE_MARK,
      catalogFavoriteSourceAssumption(previewId),
      'Соль по вкусу',
    ]),
  ).toEqual(['Соль по вкусу'])
})

test('diary favorites sync drops preview and demo ids', () => {
  const owned = '11111111-1111-4111-8111-111111111111'
  expect(
    favoriteMealIdsForSync([
      owned,
      'meal-01',
      'plan-preview:catalog_loss:2026-09-01:0:Завтрак',
    ]),
  ).toEqual([owned])
})

test('diary favorites keep preview ids and drop API ids the server rejected', () => {
  const owned = '11111111-1111-4111-8111-111111111111'
  const rejected = '22222222-2222-4222-8222-222222222222'
  const preview = 'plan-preview:catalog_loss:2026-09-01:0:Завтрак'
  expect(
    [...reconcileLocalFavoriteIds([owned, rejected, preview, 'meal-01'], [owned])].sort(),
  ).toEqual(['meal-01', owned, preview].sort())
})

test('catalog preview maps to the persisted diary copy', () => {
  const previewId = 'plan-preview:catalog_loss:2026-09-01:0:Завтрак'
  const apiId = '11111111-1111-4111-8111-111111111111'
  expect(
    apiMealIdForCatalogPreview(previewId, [
      { id: apiId, assumptions: [CATALOG_FAVORITE_SOURCE_MARK, catalogFavoriteSourceAssumption(previewId)] },
    ]),
  ).toBe(apiId)
})

test('catalog preview and stamped copies are not user-authored meals', () => {
  const previewId = 'plan-preview:catalog_loss:2026-09-01:0:Завтрак'
  expect(isCatalogFavoriteMeal({ id: previewId })).toBe(true)
  expect(
    isCatalogFavoriteMeal({
      id: '11111111-1111-4111-8111-111111111111',
      assumptions: [CATALOG_FAVORITE_SOURCE_MARK, catalogFavoriteSourceAssumption(previewId)],
    }),
  ).toBe(true)
  expect(
    isCatalogFavoriteMeal({
      id: '11111111-1111-4111-8111-111111111111',
      assumptions: ['Вес по фото'],
    }),
  ).toBe(false)
})

test('diary, plan meals, and feed save into the same meal favorites API', () => {
  const diary = readFileSync(new URL('../src/features/diary/pages/news.tsx', import.meta.url), 'utf8')
  const planMeals = readFileSync(
    new URL('../src/features/plans/CurrentPlanMeals.tsx', import.meta.url),
    'utf8',
  )
  const feed = readFileSync(new URL('../src/features/diary/SharedMealsFeed.tsx', import.meta.url), 'utf8')
  const plans = readFileSync(new URL('../src/features/plans/pages.tsx', import.meta.url), 'utf8')
  expect(diary).toContain('putUserFavorites(')
  expect(planMeals).toContain('putUserFavorites(')
  expect(feed).toContain('putUserFavorites(')
  expect(feed).toContain('catalogFavoriteCreateDraft(')
  expect(plans).toContain('useSyncedPlanLibrary(')
  expect(plans).not.toContain('putUserFavorites(')
})
