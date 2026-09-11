import { describe, expect, test } from 'bun:test'
import type { MealDto } from '@web-app-demo/contracts'

import { MEAL_COVER_PLACEHOLDER_SRC, setMealCoverExtras } from '../src/features/diary/meal-cover'
import {
  mealCarouselImages,
  mealDtoToEntry,
  mergeDemoAndApiMeals,
} from '../src/features/diary/merge-meals'
import { SAMPLE_RATIONS } from './sample-ration'

function restoreRationMealCovers() {
  setMealCoverExtras(
    SAMPLE_RATIONS.flatMap((ration) =>
      ration.meals.map((meal) => [meal.title, meal.image] as const),
    ),
  )
}
import type { MealEntry } from '../src/features/diary/meals-catalog'

const demo: MealEntry[] = [
  {
    id: 'meal-01',
    title: 'Demo A',
    ingredients: 'A',
    category: 'Птица',
    meal: 'Обед',
    at: '2026-07-30T12:00:00.000Z',
    kcal: 100,
    protein: 10,
    fat: 5,
    carbs: 8,
    image: '/diary/meals/meal-01.jpg',
  },
  {
    id: 'meal-02',
    title: 'Demo B',
    ingredients: 'B',
    category: 'Рыба',
    meal: 'Ужин',
    at: '2026-07-29T18:00:00.000Z',
    kcal: 200,
    protein: 20,
    fat: 10,
    carbs: 5,
    image: '/diary/meals/meal-02.jpg',
  },
]

const apiMeal: MealDto = {
  id: '11111111-1111-4111-8111-111111111111',
  userId: '22222222-2222-4222-8222-222222222222',
  title: 'Telegram meal',
  ingredients: 'Рис, курица',
  category: 'Птица',
  meal: 'Обед',
  recordedAt: '2026-07-31T10:00:00.000Z',
  kcal: 450,
  protein: 30,
  fat: 12,
  carbs: 40,
  imageUrl: '/api/meals/11111111-1111-4111-8111-111111111111/image?exp=1&sig=abc',
  extraImageUrls: [],
  portionItems: [{ label: 'Рис ~150 г', kcal: 160, protein: 3, fat: 1, carbs: 35 }],
  clientComment: 'С работы',
  assumptions: ['Вес по фото'],
  micronutrients: [],
  versions: [
    {
      id: '33333333-3333-4333-8333-333333333333',
      createdAt: '2026-07-31T10:00:00.000Z',
      label: 'vers. 1.0',
      snapshot: {
        title: 'Telegram meal',
        ingredients: 'Рис, курица',
        category: 'Птица',
        meal: 'Обед',
        kcal: 450,
        protein: 30,
        fat: 12,
        carbs: 40,
        portionItems: [{ label: 'Рис ~150 г', kcal: 160, protein: 3, fat: 1, carbs: 35 }],
        clientComment: 'С работы',
        assumptions: ['Вес по фото'],
        micronutrients: [],
      },
    },
  ],
  activeVersionId: '33333333-3333-4333-8333-333333333333',
  source: 'telegram',
  createdAt: '2026-07-31T10:01:00.000Z',
  shared: false,
  likeCount: 0,
  liked: false,
}

describe('mergeDemoAndApiMeals', () => {
  test('maps mentor unread onto diary entries', () => {
    expect(mealDtoToEntry(apiMeal).unread).toBeUndefined()
    expect(mealDtoToEntry({ ...apiMeal, unread: true }).unread).toBe(true)
    expect(mealDtoToEntry({ ...apiMeal, unread: false }).unread).toBe(false)
  })

  test('keeps all demo catalog meals and prepends newer API meals', () => {
    const merged = mergeDemoAndApiMeals(demo, [apiMeal])
    expect(merged.map((meal) => meal.id)).toEqual([
      apiMeal.id,
      'meal-01',
      'meal-02',
    ])
    expect(merged.find((meal) => meal.id === 'meal-01')?.title).toBe('Demo A')
    expect(merged[0]?.versions?.[0]?.label).toBe('vers. 1.0')
  })

  test('maps extra image urls onto the active version entry', () => {
    const merged = mergeDemoAndApiMeals(demo, [
      { ...apiMeal, extraImageUrls: ['/api/meals/11111111-1111-4111-8111-111111111111/extras/0?exp=1&sig=abc'] },
    ])
    expect(merged[0]?.extraImages).toEqual([
      '/api/meals/11111111-1111-4111-8111-111111111111/extras/0?exp=1&sig=abc',
    ])
  })

  test('carousel only includes saved extras, not a local attach preview', () => {
    expect(
      mealCarouselImages({
        cover: '/cover.jpg',
        extraImages: ['/extras/0'],
        galleryExtras: ['data:image/jpeg;base64,abc'],
      }),
    ).toEqual(['/cover.jpg', '/extras/0'])
    expect(
      mealCarouselImages({
        cover: '/cover.jpg',
        extraImages: [],
      }),
    ).toEqual(['/cover.jpg'])
  })

  test('unsigned API covers fall back to a registered ration photo', () => {
    setMealCoverExtras([['Telegram meal', '/rations/ration-05-2.jpg']])
    const merged = mergeDemoAndApiMeals(demo, [
      { ...apiMeal, imageUrl: '/api/meals/11111111-1111-4111-8111-111111111111/image' },
    ])
    expect(merged[0]?.image).toBe('/rations/ration-05-2.jpg')
    setMealCoverExtras([])
    const blank = mergeDemoAndApiMeals(demo, [
      { ...apiMeal, imageUrl: '/api/meals/11111111-1111-4111-8111-111111111111/image' },
    ])
    expect(blank[0]?.image).toBe(MEAL_COVER_PLACEHOLDER_SRC)
    restoreRationMealCovers()
  })

  test('carousel skips the collage placeholder and keeps a real extra photo', () => {
    expect(
      mealCarouselImages({
        cover: MEAL_COVER_PLACEHOLDER_SRC,
        extraImages: ['/diary/croissant.jpg'],
      }),
    ).toEqual(['/diary/croissant.jpg'])
  })

  test('carousel falls back to local extras when the version has none persisted', () => {
    expect(
      mealCarouselImages({
        cover: '/cover.jpg',
        extraImages: [],
        galleryExtras: ['data:image/jpeg;base64,abc'],
      }),
    ).toEqual(['/cover.jpg', 'data:image/jpeg;base64,abc'])
  })
})
