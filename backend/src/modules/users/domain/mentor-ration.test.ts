import { expect, test } from 'bun:test'

import { mentorPlanWriteFields, tryToMentorRationDto, toMentorRationDto } from './mentor-ration'

const row = {
  id: '3f1c0a1e-6b2d-4c8a-9e11-aaaaaaaaaaaa',
  mentorId: '3f1c0a1e-6b2d-4c8a-9e11-bbbbbbbbbbbb',
  title: 'Тестовый день',
  description: '',
  goal: 'Поддержание',
  source: 'Рацион наставника',
  image: '/rations/ration-01.jpg',
  days: 1,
  mealsPerDay: 1,
  kcal: 350,
  protein: 35,
  fat: 8,
  carbs: 15,
  createdAt: new Date('2026-08-25T10:00:00.000Z'),
  updatedAt: new Date('2026-08-25T10:00:00.000Z'),
  meals: [
    {
      slot: 'Обед',
      title: 'Треска и брокколи',
      ingredients: 'треска 160 г',
      steps: ['Приготовить'],
      image: '/rations/ration-01.jpg',
      kcal: 350,
      protein: 35,
      fat: 8,
      carbs: 15,
    },
  ],
}

test('stored meals keep extra keys from older drafts', () => {
  const dto = toMentorRationDto({
    ...row,
    meals: [{ ...(row.meals[0] as object), key: 'meal-1', notes: 'old' }],
  })
  expect(dto.title).toBe('Тестовый день')
  expect(dto.meals).toHaveLength(1)
  expect(dto.meals[0]?.title).toBe('Треска и брокколи')
})

test('stored day indexes survive a round trip', () => {
  const dto = toMentorRationDto({
    ...row,
    days: 2,
    mealsPerDay: 1,
    meals: [
      { ...(row.meals[0] as object), dayIndex: 0 },
      { ...(row.meals[0] as object), title: 'Омлет', dayIndex: 1 },
    ],
  })
  expect(dto.meals.map((meal) => meal.dayIndex)).toEqual([0, 1])
})

test('a mentor plan records the days that were actually filled', () => {
  const fields = mentorPlanWriteFields({
    title: 'Неделя',
    description: '',
    goal: 'Поддержание',
    meals: [
      {
        slot: 'Завтрак',
        title: 'Овсянка',
        ingredients: '',
        steps: [],
        image: '',
        kcal: 300,
        protein: 10,
        fat: 5,
        carbs: 40,
        dayIndex: 0,
      },
      {
        slot: 'Обед',
        title: 'Суп',
        ingredients: '',
        steps: [],
        image: '',
        kcal: 400,
        protein: 20,
        fat: 10,
        carbs: 30,
        dayIndex: 0,
      },
      {
        slot: 'Завтрак',
        title: 'Яйца',
        ingredients: '',
        steps: [],
        image: '',
        kcal: 250,
        protein: 18,
        fat: 16,
        carbs: 2,
        dayIndex: 2,
      },
    ],
  })
  expect(fields.days).toBe(3)
  expect(fields.mealsPerDay).toBe(2)
  expect(fields.source).toBe('План наставника')
})

test('unreadable stored rations are skipped instead of failing the list', () => {
  expect(tryToMentorRationDto({ ...row, meals: [] })).toBeNull()
  expect(tryToMentorRationDto({ ...row, meals: 'bad' })).toBeNull()
  expect(tryToMentorRationDto(row)?.id).toBe(row.id)
})
