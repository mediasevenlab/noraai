import { expect, test } from 'bun:test'
import { questionnaireAnswersSchema } from '@web-app-demo/contracts'

import {
  goalUsesPace,
  questionnaireDailyCalorieTarget,
  questionnaireMaintenanceCalories,
} from '../src/features/users/questionnaire-calorie-target'

test('daily calorie target follows Mifflin–St Jeor from questionnaire answers', () => {
  const base = {
    sexLabel: 'Женский',
    ageLabel: '30 лет',
    height: '165 см',
    weight: '60 кг',
    goal: 'Похудение',
    goalDetail: '',
    targetWeight: '55 кг',
    timeline: '3 месяца',
    activity: 'Умеренная',
    activityDetail: '',
    meals: '3 раза',
    water: '1.5–2.5 л',
    sleep: '7–8 ч',
    cooking: 'Дома',
    dietType: 'Обычное',
    routineDetail: '',
    restrictions: 'Нет ограничений',
    health: 'Без особенностей',
    stressEating: 'Редко',
    dietExperience: 'Нет опыта',
    notes: '',
  }
  expect(questionnaireDailyCalorieTarget(questionnaireAnswersSchema.parse(base))).toBe(1550)
  expect(
    questionnaireDailyCalorieTarget(
      questionnaireAnswersSchema.parse({
        ...base,
        sexLabel: 'Мужской',
        ageLabel: '35 лет',
        height: '180 см',
        weight: '80 кг',
        goal: 'Поддержание',
        activity: 'Высокая',
      }),
    ),
  ).toBe(3050)
  // 30 y, 165 cm, 60 kg, moderate: BMR 1320.25 × 1.55 = 2046
  expect(questionnaireMaintenanceCalories(questionnaireAnswersSchema.parse(base))).toBe(2046)
  expect(
    questionnaireMaintenanceCalories(
      questionnaireAnswersSchema.parse({ ...base, goal: 'Поддержание' }),
    ),
  ).toBe(2046)
  expect(
    questionnaireMaintenanceCalories(
      questionnaireAnswersSchema.parse({ ...base, activity: 'Сидячий' }),
    ),
  ).toBe(1584)
  // 35 y, 180 cm, 80 kg, high: BMR 1755 × 1.725 = 3027
  expect(
    questionnaireMaintenanceCalories(
      questionnaireAnswersSchema.parse({
        ...base,
        sexLabel: 'Мужской',
        ageLabel: '35 лет',
        height: '180 см',
        weight: '80 кг',
        goal: 'Набор',
        activity: 'Высокая',
      }),
    ),
  ).toBe(3027)
  expect(
    questionnaireMaintenanceCalories(
      questionnaireAnswersSchema.parse({ ...base, activity: 'как получится' }),
    ),
  ).toBeNull()
  // 23 y, 159 cm, 56 kg, moderate, gain: 1 981 maintenance, then +300 snapped to 2 300
  const current = questionnaireAnswersSchema.parse({
    ...base,
    ageLabel: '23 лет',
    height: '159 см',
    weight: '56 кг',
    goal: 'Набор массы',
    activity: 'Умеренная',
  })
  expect(questionnaireMaintenanceCalories(current)).toBe(1981)
  expect(questionnaireDailyCalorieTarget(current)).toBe(2300)
  expect(questionnaireDailyCalorieTarget(
    questionnaireAnswersSchema.parse({ ...current, goalPace: 'Медленно' }),
  )).toBe(2200)
  expect(questionnaireDailyCalorieTarget(
    questionnaireAnswersSchema.parse({ ...current, goalPace: 'Быстро' }),
  )).toBe(2500)
  expect(questionnaireDailyCalorieTarget(
    questionnaireAnswersSchema.parse({ ...current, goalPace: 'Экстремально' }),
  )).toBe(2300)
  expect(questionnaireDailyCalorieTarget(
    questionnaireAnswersSchema.parse({ ...base, goalPace: 'Быстро' }),
  )).toBe(1300)
  expect(questionnaireDailyCalorieTarget(
    questionnaireAnswersSchema.parse({ ...base, goal: 'Поддержание', goalPace: 'Экстремально' }),
  )).toBe(2050)
  expect(questionnaireDailyCalorieTarget(
    questionnaireAnswersSchema.parse({ ...base, goalPace: 'Экстремально' }),
  )).toBe(1550)
  expect(questionnaireDailyCalorieTarget(
    questionnaireAnswersSchema.parse({ ...base, activity: 'Спортсмен', goalPace: 'Экстремально' }),
  )).toBe(2000)
  expect(questionnaireMaintenanceCalories(null)).toBeNull()
  expect(questionnaireDailyCalorieTarget(null)).toBeNull()
  expect(
    questionnaireDailyCalorieTarget(
      questionnaireAnswersSchema.parse({ ...base, weight: 'нет данных' }),
    ),
  ).toBeNull()
})

test('calorie numbers use body, activity, goal, and pace', () => {
  const minimal = questionnaireAnswersSchema.parse({
    sexLabel: 'Женский',
    ageLabel: '30 лет',
    height: '165 см',
    weight: '60 кг',
    goal: 'Похудение',
    activity: 'Умеренная',
  })
  expect(minimal.goalPace).toBe('Умеренно')
  expect(minimal.meals).toBe('')
  expect(minimal.restrictions).toBe('')
  expect(questionnaireMaintenanceCalories(minimal)).toBe(2046)
  expect(questionnaireDailyCalorieTarget(minimal)).toBe(1550)
  expect(
    questionnaireDailyCalorieTarget(
      questionnaireAnswersSchema.parse({
        ...minimal,
        water: 'До 1 л',
        sleep: 'До 6 ч',
        dietType: 'Веганство',
        restrictions: 'Лактоза',
      }),
    ),
  ).toBe(1550)
  expect(goalUsesPace('Похудение')).toBe(true)
  expect(goalUsesPace('Набор массы')).toBe(true)
  expect(goalUsesPace('Поддержание')).toBe(false)
  expect(goalUsesPace('Здоровье')).toBe(false)
})
