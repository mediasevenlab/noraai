import { describe, expect, test } from 'bun:test'

import {
  createMealFromBotRequestSchema,
  listMealsResponseSchema,
  mealSchema,
  shareMealRequestSchema,
  likeMealRequestSchema,
  mentorUnreadMealsResponseSchema,
  markMentorMealsViewedRequestSchema,
  markMentorMealsViewedResponseSchema,
  setMealPlanDoneRequestSchema,
  mealsGeminiRequestSchema,
  mealsTranscribeRequestSchema,
  mealsTranscribeResponseSchema,
  mealComposerTurnRequestSchema,
  mealComposerTurnResponseSchema,
  normalizeMicronutrients,
  normalizePortionItems,
  partitionMealMicronutrients,
  telegramUserLookupResponseSchema,
} from './meals'

const versionId = '019c0000-0000-7000-8000-000000000201'

const meal = {
  id: '019c0000-0000-7000-8000-000000000101',
  userId: '019c0000-0000-7000-8000-000000000001',
  title: 'Овсянка с творогом',
  ingredients: 'Овсянка, творог, банан',
  category: 'Завтрак' as const,
  meal: 'Завтрак' as const,
  recordedAt: '2026-08-04T01:00:00.000Z',
  kcal: 420,
  protein: 28,
  fat: 10,
  carbs: 55,
  imageUrl: '/api/meals/019c0000-0000-7000-8000-000000000101/image',
  extraImageUrls: [],
  portionItems: [{ label: 'Овсянка ~45 г', kcal: 180, protein: 8, fat: 3, carbs: 30 }],
  clientComment: 'Обычный завтрак',
  assumptions: ['Овсянка на воде'],
  micronutrients: [],
  versions: [
    {
      id: versionId,
      createdAt: '2026-08-04T01:00:00.000Z',
      label: 'vers. 1.0',
      snapshot: {
        title: 'Овсянка с творогом',
        ingredients: 'Овсянка, творог, банан',
        category: 'Завтрак' as const,
        meal: 'Завтрак' as const,
        kcal: 420,
        protein: 28,
        fat: 10,
        carbs: 55,
        portionItems: [{ label: 'Овсянка ~45 г', kcal: 180, protein: 8, fat: 3, carbs: 30 }],
        clientComment: 'Обычный завтрак',
        assumptions: ['Овсянка на воде'],
        micronutrients: [],
      },
    },
  ],
  activeVersionId: versionId,
  source: 'telegram' as const,
  createdAt: '2026-08-04T01:00:00.000Z',
  shared: false,
  likeCount: 0,
  liked: false,
}

describe('meal contracts', () => {
  test('validates meal DTO and list response', () => {
    expect(mealSchema.parse(meal)).toEqual(meal)
    expect(listMealsResponseSchema.parse({ items: [meal] }).items).toHaveLength(1)
    expect(
      mealSchema.parse({
        ...meal,
        extraImageUrls: ['/api/meals/019c0000-0000-7000-8000-000000000101/extras/0'],
      }).extraImageUrls,
    ).toEqual(['/api/meals/019c0000-0000-7000-8000-000000000101/extras/0'])
    expect(
      mealSchema.parse({
        ...meal,
        shared: true,
        authorName: 'Mentor',
      }),
    ).toMatchObject({ shared: true, authorName: 'Mentor' })
    expect(shareMealRequestSchema.parse({ shared: true })).toEqual({ shared: true })
    expect(mealSchema.parse({ ...meal, shared: true }).likeCount).toBe(0)
    expect(mealSchema.parse(meal).unread).toBeUndefined()
    expect(mealSchema.parse({ ...meal, unread: true }).unread).toBe(true)
    expect(likeMealRequestSchema.parse({ liked: true })).toEqual({ liked: true })
    expect(setMealPlanDoneRequestSchema.parse({ done: true })).toEqual({ done: true })
    expect(
      setMealPlanDoneRequestSchema.parse({
        done: true,
        recordedAt: '2026-09-04T08:30:00.000Z',
      }),
    ).toEqual({
      done: true,
      recordedAt: '2026-09-04T08:30:00.000Z',
    })
    expect(
      mentorUnreadMealsResponseSchema.parse({
        items: [{ userId: meal.userId, unreadCount: 3 }],
      }),
    ).toEqual({ items: [{ userId: meal.userId, unreadCount: 3 }] })
    expect(
      markMentorMealsViewedRequestSchema.parse({
        mealIds: [meal.id],
      }),
    ).toEqual({ mealIds: [meal.id] })
    expect(
      markMentorMealsViewedResponseSchema.parse({
        ok: true,
        viewedMealIds: [meal.id],
        unreadCount: 2,
      }),
    ).toEqual({ ok: true, viewedMealIds: [meal.id], unreadCount: 2 })
  })

  test('normalizes bot create payloads', () => {
    expect(
      createMealFromBotRequestSchema.parse({
        userId: meal.userId,
        title: '  Овсянка  ',
        category: 'Завтрак',
        meal: 'Завтрак',
        kcal: 420,
        protein: 28,
        fat: 10,
        carbs: 55,
        telegramUpdateId: '123',
      }),
    ).toMatchObject({
      title: 'Овсянка',
      ingredients: '',
      portionItems: [],
      source: 'telegram',
    })
  })

  test('normalizes micronutrients into the canonical meal list', () => {
    const items = normalizeMicronutrients({
      sodium: 420,
      'Витамин С': 18.25,
      unknown: 9,
    })
    expect(items).toHaveLength(18)
    expect(items[0]).toEqual({ key: 'sodium', label: 'Натрий', unit: 'мг', amount: 420 })
    expect(items.find((item) => item.key === 'vitaminC')).toEqual({
      key: 'vitaminC',
      label: 'Витамин C',
      unit: 'мг',
      amount: 18.3,
    })
    expect(items.find((item) => item.key === 'iron')?.amount).toBe(0)
    expect(normalizeMicronutrients([])).toEqual([])
    expect(partitionMealMicronutrients(items).primary.map((item) => item.key)).toEqual([
      'sodium',
      'potassium',
      'vitaminC',
      'vitaminD',
      'iron',
      'calcium',
    ])
    expect(partitionMealMicronutrients(items).additional.map((item) => item.key)).toEqual([
      'vitaminA',
      'zinc',
      'iodine',
      'selenium',
      'magnesium',
      'phosphorus',
      'biotin',
      'vitaminK',
      'vitaminE',
      'folate',
      'vitaminB6',
      'vitaminB12',
    ])
    expect(partitionMealMicronutrients([])).toEqual({ primary: [], additional: [] })
    expect(
      mealSchema.parse({
        ...meal,
        versions: [
          {
            ...meal.versions[0]!,
            snapshot: {
              title: meal.title,
              ingredients: meal.ingredients,
              category: meal.category,
              meal: meal.meal,
              kcal: meal.kcal,
              protein: meal.protein,
              fat: meal.fat,
              carbs: meal.carbs,
              portionItems: meal.portionItems,
              clientComment: meal.clientComment,
              assumptions: meal.assumptions,
            },
          },
        ],
      }).versions[0]?.snapshot.micronutrients,
    ).toEqual([])
  })

  test('accepts legacy string portion items and structured macros', () => {
    expect(normalizePortionItems(['Овсянка ~45 г', ' '])).toEqual([
      { label: 'Овсянка ~45 г', kcal: 0, protein: 0, fat: 0, carbs: 0 },
    ])
    expect(
      mealSchema.parse({
        ...meal,
        portionItems: ['Овсянка ~45 г'],
      }).portionItems,
    ).toEqual([{ label: 'Овсянка ~45 г', kcal: 0, protein: 0, fat: 0, carbs: 0 }])
  })

  test('requires image input for Gemini analyze', () => {
    expect(() => mealsGeminiRequestSchema.parse({ note: 'обед' })).toThrow()
    expect(
      mealsGeminiRequestSchema.parse({
        imageBase64: 'abc',
        imageMime: 'image/jpeg',
        thinking: false,
      }),
    ).toMatchObject({ imageBase64: 'abc', thinking: false })
  })

  test('validates voice transcribe payloads', () => {
    expect(() => mealsTranscribeRequestSchema.parse({})).toThrow()
    expect(
      mealsTranscribeRequestSchema.parse({
        audioBase64: 'abc',
        audioMime: 'audio/webm',
      }),
    ).toEqual({
      audioBase64: 'abc',
      audioMime: 'audio/webm',
    })
    expect(
      mealsTranscribeResponseSchema.parse({
        ok: true,
        text: 'Добавь брокколи',
        model: 'gemini-2.5-flash',
        fallbackFrom: 'n8n',
      }),
    ).toEqual({
      ok: true,
      text: 'Добавь брокколи',
      model: 'gemini-2.5-flash',
      fallbackFrom: 'n8n',
    })
    expect(
      mealsTranscribeResponseSchema.parse({
        ok: true,
        text: 'Добавь брокколи',
        model: 'gemini-2.5-flash',
      }).fallbackFrom,
    ).toBeUndefined()
  })

  test('validates in-app meal composer turns', () => {
    expect(() => mealComposerTurnRequestSchema.parse({ action: 'photo' })).toThrow()
    expect(
      mealComposerTurnRequestSchema.parse({
        action: 'photo',
        imageBase64: 'abc',
        imageMime: 'image/jpeg',
      }),
    ).toMatchObject({ action: 'photo', imageBase64: 'abc' })
    expect(() => mealComposerTurnRequestSchema.parse({ action: 'remove-photo' })).toThrow()
    expect(
      mealComposerTurnRequestSchema.parse({
        action: 'remove-photo',
        photoIndex: 0,
      }),
    ).toMatchObject({ action: 'remove-photo', photoIndex: 0 })
    expect(
      mealComposerTurnResponseSchema.parse({
        status: 'collecting',
        messages: [{ role: 'assistant', text: '📷 Фото принято.' }],
        photoCount: 1,
        flushAfterMs: 20000,
      }),
    ).toMatchObject({ status: 'collecting', photoCount: 1, flushAfterMs: 20000 })
  })

  test('telegram lookup can return null or a linked user', () => {
    expect(telegramUserLookupResponseSchema.parse({ user: null })).toEqual({ user: null })
    expect(
      telegramUserLookupResponseSchema.parse({
        user: {
          id: meal.userId,
          publicId: 101,
        },
      }).user?.id,
    ).toBe(meal.userId)
    expect(() =>
      telegramUserLookupResponseSchema.parse({
        user: {
          id: meal.userId,
          publicId: 101,
          email: 'hidden@example.com',
        },
      }),
    ).toThrow()
  })
})
