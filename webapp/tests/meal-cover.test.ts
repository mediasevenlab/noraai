import { describe, expect, test } from 'bun:test'

import {
  displayMealCover,
  displayPlanCover,
  durablePlanCoverSrc,
  isCoverPlaceholder,
  isPersistedMealImageUrl,
  MEAL_COVER_PLACEHOLDER_SRC,
  MEAL_COVER_STUB_SRC,
  PLAN_COVER_PLACEHOLDER_SRC,
  preferredMealPhotoSrc,
  resolveMealCover,
  setMealCoverExtras,
  usableMealCover,
} from '../src/features/diary/meal-cover'

describe('meal cover resolution', () => {
  test('keeps signed API photos and local catalog files', () => {
    expect(isPersistedMealImageUrl('/cover.jpg')).toBe(true)
    expect(isPersistedMealImageUrl('/diary/meals/meal-01.jpg')).toBe(true)
    expect(isPersistedMealImageUrl('/rations/ration-01.jpg')).toBe(true)
    expect(
      isPersistedMealImageUrl(
        '/api/meals/11111111-1111-4111-8111-111111111111/image?exp=1&sig=abc',
      ),
    ).toBe(true)
    expect(
      isPersistedMealImageUrl('/api/meals/11111111-1111-4111-8111-111111111111/image'),
    ).toBe(false)
  })

  test('replaces the empty API stub with a catalog or ration cover', () => {
    setMealCoverExtras([['Лосось с киноа', '/rations/ration-05-2.jpg']])
    expect(
      resolveMealCover('/api/meals/11111111-1111-4111-8111-111111111111/image', 'Лосось с киноа'),
    ).toBe('/rations/ration-05-2.jpg')
    expect(
      resolveMealCover(
        '/api/meals/11111111-1111-4111-8111-111111111111/image?exp=1&sig=abc',
        'Лосось с киноа',
      ),
    ).toBe('/api/meals/11111111-1111-4111-8111-111111111111/image?exp=1&sig=abc')
    expect(
      resolveMealCover('/api/meals/11111111-1111-4111-8111-111111111111/image', 'Неизвестное блюдо'),
    ).toBe(MEAL_COVER_PLACEHOLDER_SRC)
  })

  test('usable meal covers skip the collage placeholder and unsigned stubs', () => {
    expect(usableMealCover('')).toBe('')
    expect(usableMealCover(MEAL_COVER_PLACEHOLDER_SRC)).toBe('')
    expect(usableMealCover(MEAL_COVER_STUB_SRC)).toBe('')
    expect(usableMealCover(PLAN_COVER_PLACEHOLDER_SRC)).toBe('')
    expect(usableMealCover('/api/meals/11111111-1111-4111-8111-111111111111/image')).toBe('')
    expect(usableMealCover('/diary/croissant.jpg')).toBe('/diary/croissant.jpg')
    expect(usableMealCover('data:image/jpeg;base64,abc')).toBe('data:image/jpeg;base64,abc')
    expect(
      preferredMealPhotoSrc({
        image: MEAL_COVER_PLACEHOLDER_SRC,
        extraImages: ['/diary/croissant.jpg'],
      }),
    ).toBe('/diary/croissant.jpg')
  })

  test('stored plan covers skip signed meal routes that expire', () => {
    const signed =
      '/api/meals/11111111-1111-4111-8111-111111111111/image?exp=1&sig=abc'
    expect(durablePlanCoverSrc(signed)).toBe('')
    expect(durablePlanCoverSrc('/diary/croissant.jpg')).toBe('/diary/croissant.jpg')
    expect(durablePlanCoverSrc('data:image/jpeg;base64,abc')).toBe('data:image/jpeg;base64,abc')
    expect(durablePlanCoverSrc(PLAN_COVER_PLACEHOLDER_SRC)).toBe('')
  })

  test('blank plans show the plan cover stub until a real meal photo exists', () => {
    expect(isCoverPlaceholder(PLAN_COVER_PLACEHOLDER_SRC)).toBe(true)
    expect(displayPlanCover('')).toBe(PLAN_COVER_PLACEHOLDER_SRC)
    expect(displayPlanCover(MEAL_COVER_PLACEHOLDER_SRC)).toBe(PLAN_COVER_PLACEHOLDER_SRC)
    expect(displayPlanCover('/diary/croissant.jpg')).toBe('/diary/croissant.jpg')
  })

  test('blank meals show the meal cover stub until a real photo exists', () => {
    expect(isCoverPlaceholder(MEAL_COVER_STUB_SRC)).toBe(true)
    expect(displayMealCover('')).toBe(MEAL_COVER_STUB_SRC)
    expect(displayMealCover(MEAL_COVER_PLACEHOLDER_SRC)).toBe(MEAL_COVER_STUB_SRC)
    expect(displayMealCover('/diary/croissant.jpg')).toBe('/diary/croissant.jpg')
  })
})
