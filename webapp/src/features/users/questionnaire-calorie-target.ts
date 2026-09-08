import type { QuestionnaireAnswers } from '@web-app-demo/contracts'

const QUESTIONNAIRE_NUMBER = /\d+(?:[.,]\d+)?/
const ACTIVITY_FACTOR: Record<string, number> = {
  сидячий: 1.2,
  низкая: 1.2,
  лёгкая: 1.375,
  легкая: 1.375,
  умеренная: 1.55,
  высокая: 1.725,
  'очень высокая': 1.9,
  спортсмен: 1.9,
}

function firstNumber(value: string): number | null {
  const match = value.match(QUESTIONNAIRE_NUMBER)
  if (!match) return null
  const parsed = Number(match[0].replace(',', '.'))
  return Number.isFinite(parsed) ? parsed : null
}

function activityFactor(activity: string): number {
  return ACTIVITY_FACTOR[activity.trim().toLowerCase()] ?? 1.375
}

function goalCalorieDelta(goal: string): number {
  const key = goal.trim().toLowerCase()
  if (key.startsWith('похуд')) return -500
  if (key.startsWith('набор')) return 300
  return 0
}

function roundCaloriesTo50(value: number): number {
  return Math.round(value / 50) * 50
}

/**
 * Daily calorie target from onboarding/profile answers (Mifflin–St Jeor).
 * Returns null when sex, age, height, or weight cannot be read.
 */
export function questionnaireDailyCalorieTarget(
  answers: QuestionnaireAnswers | null | undefined,
): number | null {
  if (!answers) return null
  const weight = firstNumber(answers.weight)
  const height = firstNumber(answers.height)
  const age = firstNumber(answers.ageLabel)
  if (weight == null || height == null || age == null) return null
  if (weight < 30 || weight > 300 || height < 120 || height > 230 || age < 14 || age > 90) {
    return null
  }
  const sex = answers.sexLabel.trim().toLowerCase()
  const male = sex.startsWith('муж') || sex === 'm' || sex === 'male'
  const female = sex.startsWith('жен') || sex === 'f' || sex === 'female'
  if (!male && !female) return null
  const bmr = male
    ? 10 * weight + 6.25 * height - 5 * age + 5
    : 10 * weight + 6.25 * height - 5 * age - 161
  const target = roundCaloriesTo50(
    bmr * activityFactor(answers.activity) + goalCalorieDelta(answers.goal),
  )
  const floor = female ? 1200 : 1500
  return Math.min(4000, Math.max(floor, target))
}
