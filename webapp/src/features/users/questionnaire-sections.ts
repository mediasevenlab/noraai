import type { QuestionnaireAnswers } from '@web-app-demo/contracts'
import {
  ActivityIcon,
  CakeIcon,
  RulerIcon,
  ScaleIcon,
  ShieldAlertIcon,
  TargetIcon,
  UserRoundIcon,
  ZapIcon,
  type LucideIcon,
} from '@/components/icons'

import { goalUsesPace } from './questionnaire-calorie-target'

export type FieldKey = keyof QuestionnaireAnswers
export type FieldLayout = 'inline' | 'extended'
export type FieldControl = 'text' | 'sex' | 'choice' | 'multi-choice'

export type ChoiceOption = {
  value: string
  label: string
  description?: string
}

export type ProfileField = {
  key: FieldKey
  label: string
  layout?: FieldLayout
  control?: FieldControl
  options?: ReadonlyArray<ChoiceOption>
  allowCustom?: boolean
  customPlaceholder?: string
  exclusiveValue?: string
  optional?: boolean
  placeholder?: string
  /** Shown after the label («Возраст, лет»); the stored answer keeps the unit. */
  unit?: string
  /** Hide label when the step heading already names the question. */
  hideLabel?: boolean
  /** Onboarding: place beside another short field in a 2-column row. */
  halfWidth?: boolean
  icon: LucideIcon
}

export type ProfileSection = {
  title: string
  description: string
  icon: LucideIcon
  fields: ReadonlyArray<ProfileField>
}

export type OnboardingStep = {
  category: string
  heading: string
  summary: string
  icon: LucideIcon
  fields: ReadonlyArray<ProfileField>
}

const fieldSex: ProfileField = {
  key: 'sexLabel',
  label: 'Пол',
  control: 'sex',
  icon: UserRoundIcon,
}

const fieldAge: ProfileField = {
  key: 'ageLabel',
  label: 'Возраст',
  unit: 'лет',
  halfWidth: true,
  icon: CakeIcon,
}

const fieldHeight: ProfileField = {
  key: 'height',
  label: 'Рост',
  unit: 'см',
  halfWidth: true,
  icon: RulerIcon,
}

const fieldWeight: ProfileField = {
  key: 'weight',
  label: 'Вес',
  unit: 'кг',
  halfWidth: true,
  icon: ScaleIcon,
}

export function measureLabel(field: Pick<ProfileField, 'label' | 'unit'>) {
  return field.unit ? `${field.label}, ${field.unit}` : field.label
}

export function measureInputValue(value: string, unit?: string) {
  if (!unit) return value
  const suffix = ` ${unit}`
  return value.endsWith(suffix) ? value.slice(0, -suffix.length) : value
}

export function measureStoredValue(value: string, unit?: string) {
  const trimmed = value.trim()
  if (!unit || trimmed === '') return trimmed
  const suffix = ` ${unit}`
  return trimmed.endsWith(suffix) ? trimmed : `${trimmed}${suffix}`
}

export const fieldGoal: ProfileField = {
  key: 'goal',
  label: 'Цель',
  icon: TargetIcon,
  control: 'choice',
  hideLabel: true,
  options: [
    { value: 'Похудение', label: 'Похудение', description: 'Снижение веса' },
    { value: 'Набор', label: 'Набор', description: 'Мышцы и вес' },
    { value: 'Поддержание', label: 'Поддержание', description: 'Стабильный вес' },
    { value: 'Здоровье', label: 'Здоровье', description: 'Без цели по весу' },
  ],
}

export function canonicalGoal(value: string) {
  const key = value.trim().toLowerCase()
  if (key.startsWith('похуд')) return 'Похудение'
  if (key.startsWith('набор')) return 'Набор'
  if (key.startsWith('поддерж')) return 'Поддержание'
  if (key.startsWith('здоров')) return 'Здоровье'
  return value
}

export const fieldGoalPace: ProfileField = {
  key: 'goalPace',
  label: 'Темп',
  icon: ZapIcon,
  control: 'choice',
  options: [
    { value: 'Медленно', label: 'Медленно', description: 'Небольшой сдвиг' },
    { value: 'Умеренно', label: 'Умеренно', description: 'Обычный темп' },
    { value: 'Быстро', label: 'Быстро', description: 'Заметный сдвиг' },
  ],
}

const fieldRestrictions: ProfileField = {
  key: 'restrictions',
  label: 'Что нельзя',
  icon: ShieldAlertIcon,
  layout: 'extended',
  optional: true,
  placeholder: 'Например, лактоза, орехи или свинина',
}

const fieldActivity: ProfileField = {
  key: 'activity',
  label: 'Активность',
  icon: ActivityIcon,
  control: 'choice',
  hideLabel: true,
  options: [
    { value: 'Сидячий', label: 'Сидячий', description: 'Почти без движения' },
    { value: 'Лёгкая', label: 'Лёгкая', description: 'Прогулки или 1–2 тренировки' },
    { value: 'Умеренная', label: 'Умеренная', description: 'Движение днём или 3–4 тренировки' },
    { value: 'Высокая', label: 'Высокая', description: 'Физическая работа или 5–6 тренировок' },
    { value: 'Спортсмен', label: 'Спортсмен', description: 'Нагрузка почти каждый день' },
  ],
}

/** Pace is collected only when it changes the calorie deficit or surplus. */
export function fieldsForAnswers<T extends { key: FieldKey }>(
  fields: ReadonlyArray<T>,
  answers: Pick<QuestionnaireAnswers, 'goal'>,
) {
  return fields.filter((field) => field.key !== 'goalPace' || goalUsesPace(answers.goal))
}

/**
 * Wizard steps — each step has a matching live-preview card and profile card.
 * Body, activity, goal, and pace move the calorie numbers.
 * Restrictions are kept for the mentor and do not enter the formula.
 */
export const ONBOARDING_STEPS: ReadonlyArray<OnboardingStep> = [
  {
    category: 'Антропометрия',
    heading: 'Базовые данные',
    summary: 'Пол, возраст, рост и вес',
    icon: UserRoundIcon,
    fields: [fieldSex, fieldAge, fieldHeight, fieldWeight],
  },
  {
    category: 'Образ жизни',
    heading: 'Активность',
    summary: 'Подвижность обычного дня',
    icon: ActivityIcon,
    fields: [{ ...fieldActivity, hideLabel: false }],
  },
  {
    category: 'Фокус результата',
    heading: 'Цель',
    summary: 'Цель и темп',
    icon: TargetIcon,
    fields: [
      { ...fieldGoal, hideLabel: false },
      { ...fieldGoalPace, hideLabel: false },
    ],
  },
  {
    category: 'Для наставника',
    heading: 'Ограничения',
    summary: 'Аллергии и запреты',
    icon: ShieldAlertIcon,
    fields: [fieldRestrictions],
  },
]

/** Profile cards — one per onboarding step. */
export const PROFILE_SECTIONS: ReadonlyArray<ProfileSection> = ONBOARDING_STEPS.map(
  (step) => ({
    title: step.heading,
    description: step.summary,
    icon: step.icon,
    fields: step.fields,
  }),
)
