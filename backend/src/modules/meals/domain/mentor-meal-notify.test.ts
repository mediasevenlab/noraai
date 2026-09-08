import { describe, expect, test } from 'bun:test'

import { CATALOG_FAVORITE_SOURCE_MARK, RATION_DIARY_SOURCE_MARK } from './meal-share'
import {
  buildMentorMealNotifyPayload,
  formatMentorMealNotifyText,
  menteeNotifyLabel,
  shouldNotifyMentorOfNewMeal,
} from './mentor-meal-notify'

describe('mentor meal notify', () => {
  test('skips when the mentor created the meal themselves', () => {
    expect(
      shouldNotifyMentorOfNewMeal({
        actorUserId: 'mentor-1',
        mentorId: 'mentor-1',
      }),
    ).toBe(false)
    expect(
      shouldNotifyMentorOfNewMeal({
        actorUserId: 'mentee-1',
        mentorId: 'mentor-1',
      }),
    ).toBe(true)
  })

  test('skips meals copied from a ration or the feed', () => {
    expect(
      shouldNotifyMentorOfNewMeal({
        actorUserId: 'mentee-1',
        mentorId: 'mentor-1',
        assumptions: [RATION_DIARY_SOURCE_MARK, 'Рацион:office-1400', 'План:week:2026-08-31'],
      }),
    ).toBe(false)
    expect(
      shouldNotifyMentorOfNewMeal({
        actorUserId: 'mentee-1',
        mentorId: 'mentor-1',
        assumptions: ['Добавлено из ленты'],
      }),
    ).toBe(false)
    expect(
      shouldNotifyMentorOfNewMeal({
        actorUserId: 'mentee-1',
        mentorId: 'mentor-1',
        assumptions: ['Вес по фото'],
      }),
    ).toBe(true)
    expect(
      shouldNotifyMentorOfNewMeal({
        actorUserId: 'mentee-1',
        mentorId: 'mentor-1',
        assumptions: [CATALOG_FAVORITE_SOURCE_MARK, 'Каталог:plan-preview:catalog_loss:1'],
      }),
    ).toBe(false)
  })

  test('labels the mentee for the Telegram text', () => {
    expect(
      menteeNotifyLabel({ publicId: 12, nickname: 'anya', displayName: 'Аня' }),
    ).toBe('Аня (@anya)')
    expect(
      menteeNotifyLabel({ publicId: 12, nickname: 'anya', displayName: null }),
    ).toBe('anya')
    expect(
      menteeNotifyLabel({ publicId: 12, nickname: null, displayName: null }),
    ).toBe('пользователь #12')
  })

  test('formats a compact meal card without a photo', () => {
    const text = formatMentorMealNotifyText({
      mentee: { publicId: 104, nickname: 'anya', displayName: 'Аня' },
      meal: {
        title: 'Овсянка с ягодами',
        mealSlot: 'Завтрак',
        kcal: 320,
        protein: 12,
        fat: 8,
        carbs: 48,
        ingredients: 'овсянка, ягоды, мёд',
        source: 'manual',
      },
    })
    expect(text).toContain('Аня (@anya)')
    expect(text).toContain('#104')
    expect(text).toContain('Завтрак')
    expect(text).toContain('Овсянка с ягодами')
    expect(text).toContain('320 ккал')
    expect(text).toContain('овсянка, ягоды, мёд')
    expect(text).not.toContain('http')
  })

  test('includes structured fields for later messengers', () => {
    const payload = buildMentorMealNotifyPayload({
      chatId: '12345',
      mentee: { publicId: 7, nickname: 'igor', displayName: null },
      meal: {
        title: 'Салат',
        mealSlot: 'Обед',
        kcal: 200,
        protein: 10,
        fat: 8,
        carbs: 12,
        ingredients: 'огурец',
        source: 'telegram',
      },
    })
    expect(payload.chatId).toBe('12345')
    expect(payload.source).toBe('telegram')
    expect(payload.text).toContain('Салат')
    expect(payload.menteeLabel).toBe('igor')
  })
})
