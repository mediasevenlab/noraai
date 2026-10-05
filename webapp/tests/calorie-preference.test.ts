import { expect, test } from 'bun:test'

import {
  followedDailyCalories,
  parseCaloriePreference,
  parseCustomCalorieKcal,
  profileCalorieValue,
} from '../src/features/users/calorie-preference'

test('profile calories show maintenance and the goal, or a typed goal', () => {
  expect(parseCustomCalorieKcal('2100')).toBe(2100)
  expect(parseCustomCalorieKcal('2 100')).toBe(2100)
  expect(parseCustomCalorieKcal('499')).toBeNull()
  expect(parseCustomCalorieKcal('12.5')).toBeNull()

  const recommended = {
    maintenance: 1981,
    goalTarget: 2300,
    preference: parseCaloriePreference(null),
  }
  expect(profileCalorieValue(recommended)).toBe('1\u00a0981 / 2\u00a0300 ккал')
  expect(profileCalorieValue({
    ...recommended,
    preference: { useRecommendation: false, customKcal: 2100 },
  })).toBe('1\u00a0981 / 2\u00a0100 ккал')
  expect(followedDailyCalories({
    goalTarget: 2300,
    preference: { useRecommendation: false, customKcal: 2100 },
  })).toBe(2100)
  expect(followedDailyCalories({
    calorieTarget: 1800,
    goalTarget: 2300,
    preference: { useRecommendation: false, customKcal: 2100 },
  })).toBe(1800)
  expect(parseCaloriePreference('{"useRecommendation":false,"customKcal":2100}')).toEqual({
    useRecommendation: false,
    customKcal: 2100,
  })
})
