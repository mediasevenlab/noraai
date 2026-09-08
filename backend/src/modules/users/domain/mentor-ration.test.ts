import { expect, test } from 'bun:test'

import { tryToMentorRationDto, toMentorRationDto } from './mentor-ration'

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

test('unreadable stored rations are skipped instead of failing the list', () => {
  expect(tryToMentorRationDto({ ...row, meals: [] })).toBeNull()
  expect(tryToMentorRationDto({ ...row, meals: 'bad' })).toBeNull()
  expect(tryToMentorRationDto(row)?.id).toBe(row.id)
})
