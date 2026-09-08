import { expect, test } from 'bun:test'
import { questionnaireAnswersSchema } from '@web-app-demo/contracts'

import { questionnaireDailyCalorieTarget } from '../src/features/users/questionnaire-calorie-target'

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
  expect(questionnaireDailyCalorieTarget(null)).toBeNull()
  expect(
    questionnaireDailyCalorieTarget(
      questionnaireAnswersSchema.parse({ ...base, weight: 'нет данных' }),
    ),
  ).toBeNull()
})
