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

function knownActivityFactor(activity: string): number | null {
  const key = activity.trim().toLowerCase()
  if (!key) return null
  return ACTIVITY_FACTOR[key] ?? null
}

/** Pace changes the deficit or surplus only for weight loss and weight gain. */
export function goalUsesPace(goal: string): boolean {
  const key = goal.trim().toLowerCase()
  return key.startsWith('похуд') || key.startsWith('набор')
}

function goalCalorieDelta(goal: string, pace: string | undefined): number {
  if (!goalUsesPace(goal)) return 0
  const key = goal.trim().toLowerCase()
  const level = pace?.trim().toLowerCase() ?? ''
  const slow = level.startsWith('медл')
  const extreme = level.startsWith('экстрем')
  const fast = level.startsWith('быстр')
  if (key.startsWith('похуд')) {
    if (slow) return -250
    if (extreme) return -1000
    if (fast) return -750
    return -500
  }
  if (key.startsWith('набор')) {
    if (slow) return 200
    if (extreme) return 750
    if (fast) return 500
    return 300
  }
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
    bmr * activityFactor(answers.activity) + goalCalorieDelta(answers.goal, answers.goalPace),
  )
  const floor = female ? 1200 : 1500
  return Math.min(4000, Math.max(floor, target))
}

/**
 * Calories that hold the current weight at the questionnaire activity.
 * Sex, age, height, weight, and a known activity are required.
 * The goal does not move this number.
 */
export function questionnaireMaintenanceCalories(
  answers: QuestionnaireAnswers | null | undefined,
): number | null {
  if (!answers) return null
  const weight = firstNumber(answers.weight)
  const height = firstNumber(answers.height)
  const age = firstNumber(answers.ageLabel)
  const activity = knownActivityFactor(answers.activity)
  if (weight == null || height == null || age == null || activity == null) return null
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
  return Math.round(bmr * activity)
}
