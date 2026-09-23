import type { QuestionnaireAnswers } from '@web-app-demo/contracts'
import {
  ActivityIcon,
  HeartPulseIcon,
  MoonStarIcon,
  ShieldAlertIcon,
  TargetIcon,
  UserRoundIcon,
  type LucideIcon,
} from 'lucide-react'

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
}

const fieldAge: ProfileField = {
  key: 'ageLabel',
  label: 'Возраст',
  unit: 'лет',
  halfWidth: true,
}

const fieldHeight: ProfileField = {
  key: 'height',
  label: 'Рост',
  unit: 'см',
  halfWidth: true,
}

const fieldWeight: ProfileField = {
  key: 'weight',
  label: 'Вес',
  unit: 'кг',
  halfWidth: true,
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

const fieldGoal: ProfileField = {
  key: 'goal',
  label: 'Цель',
  control: 'choice',
  hideLabel: true,
  options: [
    { value: 'Похудение', label: 'Похудение', description: 'Снижение веса' },
    { value: 'Набор', label: 'Набор', description: 'Мышцы и вес' },
    { value: 'Поддержание', label: 'Поддержание', description: 'Стабильный вес' },
    { value: 'Здоровье', label: 'Здоровье', description: 'Без цели по весу' },
  ],
}

const fieldTimeline: ProfileField = {
  key: 'timeline',
  label: 'Срок',
  control: 'choice',
  options: [
    { value: '1 месяц', label: '1 месяц', description: 'Быстрый старт' },
    { value: '3 месяца', label: '3 месяца', description: 'Оптимально' },
    { value: '6 месяцев', label: '6 месяцев', description: 'С запасом' },
    { value: 'Год и дольше', label: 'Год+', description: 'Долгий путь' },
  ],
}

const fieldGoalDetail: ProfileField = {
  key: 'goalDetail',
  label: 'Комментарий',
  layout: 'extended',
  optional: true,
  placeholder: 'Можно уточнить цель или написать свой вариант',
}

const fieldActivity: ProfileField = {
  key: 'activity',
  label: 'Активность',
  control: 'choice',
  hideLabel: true,
  options: [
    { value: 'Сидячий', label: 'Сидячий', description: 'Мало движения' },
    { value: 'Лёгкая', label: 'Лёгкая', description: '1–2 тренировки / нед.' },
    { value: 'Умеренная', label: 'Умеренная', description: '3–4 тренировки / нед.' },
    { value: 'Высокая', label: 'Высокая', description: '5–6 тренировок / нед.' },
    { value: 'Спортсмен', label: 'Спортсмен', description: 'Ежедневные нагрузки' },
  ],
}

const fieldMeals: ProfileField = {
  key: 'meals',
  label: 'Приёмы пищи',
  control: 'choice',
  options: [
    { value: '2 раза', label: '2 раза', description: 'Редко, плотно' },
    { value: '3 раза', label: '3 раза', description: 'Классика' },
    { value: '4–5 раз', label: '4–5 раз', description: 'Чаще и меньше' },
    { value: 'Без режима', label: 'Без режима', description: 'Как получится' },
  ],
}

const fieldWater: ProfileField = {
  key: 'water',
  label: 'Вода',
  control: 'choice',
  options: [
    { value: 'До 1 л', label: 'До 1 л', description: 'Мало воды' },
    { value: '1–1.5 л', label: '1–1.5 л', description: 'Средне' },
    { value: '1.5–2.5 л', label: '1.5–2.5 л', description: 'Хорошо' },
    { value: 'Больше 2.5 л', label: '2.5+ л', description: 'Много' },
  ],
}

const fieldActivityDetail: ProfileField = {
  key: 'activityDetail',
  label: 'Комментарий',
  layout: 'extended',
  optional: true,
  placeholder: 'Можно уточнить активность, еду или воду',
}

const fieldSleep: ProfileField = {
  key: 'sleep',
  label: 'Сон',
  control: 'choice',
  options: [
    { value: 'До 6 ч', label: 'До 6 ч', description: 'Недосып' },
    { value: '6–7 ч', label: '6–7 ч', description: 'Короткий сон' },
    { value: '7–8 ч', label: '7–8 ч', description: 'Норма' },
    { value: '8+ ч', label: '8+ ч', description: 'Длинный сон' },
  ],
}

const fieldCooking: ProfileField = {
  key: 'cooking',
  label: 'Готовка',
  control: 'choice',
  options: [
    { value: 'Дома', label: 'Дома', description: 'Чаще сам/сама' },
    { value: 'Смешанно', label: 'Смешанно', description: 'Дом и снаружи' },
    { value: 'Чаще вне дома', label: 'Вне дома', description: 'Кафе / доставка' },
    { value: 'Готовят другие', label: 'Готовят другие', description: 'Не сам/сама' },
  ],
}

const fieldDietType: ProfileField = {
  key: 'dietType',
  label: 'Тип питания',
  control: 'choice',
  hideLabel: true,
  options: [
    { value: 'Обычное', label: 'Обычное', description: 'Без строгих рамок' },
    { value: 'Вегетарианство', label: 'Вегетарианство', description: 'Без мяса и рыбы' },
    { value: 'Веганство', label: 'Веганство', description: 'Только растения' },
    { value: 'Пескетарианство', label: 'Песке', description: 'Рыба, без мяса' },
  ],
}

const fieldRoutineDetail: ProfileField = {
  key: 'routineDetail',
  label: 'Комментарий',
  layout: 'extended',
  optional: true,
  placeholder: 'Что ещё важно по режиму',
}

const fieldRestrictions: ProfileField = {
  key: 'restrictions',
  label: 'Ограничения',
  control: 'multi-choice',
  hideLabel: true,
  exclusiveValue: 'Нет ограничений',
  options: [
    { value: 'Нет ограничений', label: 'Нет', description: 'Без исключений' },
    { value: 'Лактоза', label: 'Лактоза', description: 'Молоко и молочка' },
    { value: 'Глютен', label: 'Глютен', description: 'Пшеница и рожь' },
    { value: 'Орехи', label: 'Орехи', description: 'В т.ч. арахис' },
    { value: 'Морепродукты', label: 'Морепродукты', description: 'Рыба, креветки' },
    { value: 'Яйца', label: 'Яйца', description: 'Куриные и другие' },
    { value: 'Соя', label: 'Соя', description: 'Тофу, соусы' },
    { value: 'Острое', label: 'Острое', description: 'Жгучие специи' },
  ],
}

const fieldHealth: ProfileField = {
  key: 'health',
  label: 'Здоровье',
  control: 'choice',
  options: [
    { value: 'Без особенностей', label: 'Без особенностей', description: 'Ничего критичного' },
    { value: 'ЖКТ', label: 'ЖКТ', description: 'Пищеварение' },
    { value: 'Гормоны / щитовидка', label: 'Гормоны', description: 'Эндокринный фон' },
    { value: 'Давление / сердце', label: 'Сердце', description: 'ССС и давление' },
  ],
}

const fieldStressEating: ProfileField = {
  key: 'stressEating',
  label: 'Стресс и еда',
  control: 'choice',
  options: [
    { value: 'Редко', label: 'Редко', description: 'Почти не влияет' },
    { value: 'Иногда', label: 'Иногда', description: 'Бывает заедание' },
    { value: 'Часто', label: 'Часто', description: 'Сильно связано' },
    { value: 'Скорее пропускаю еду', label: 'Пропускаю', description: 'Ем меньше' },
  ],
}

const fieldDietExperience: ProfileField = {
  key: 'dietExperience',
  label: 'Опыт диет',
  control: 'choice',
  hideLabel: true,
  options: [
    { value: 'Нет опыта', label: 'Нет опыта', description: 'Первый раз' },
    { value: 'Пробовал(а) коротко', label: 'Коротко', description: 'Короткие попытки' },
    { value: 'Есть опыт', label: 'Есть опыт', description: 'Несколько подходов' },
    { value: 'Много лет', label: 'Много лет', description: 'Долгая история' },
  ],
}

const fieldNotes: ProfileField = {
  key: 'notes',
  label: 'Комментарий',
  layout: 'extended',
  optional: true,
  placeholder: 'Если есть другие ограничения — напишите здесь',
}

/**
 * Wizard steps — each step has a matching live-preview card and profile card.
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
    category: 'Фокус результата',
    heading: 'Цель',
    summary: 'Цель и срок',
    icon: TargetIcon,
    fields: [
      { ...fieldGoal, hideLabel: false },
      fieldTimeline,
      fieldGoalDetail,
    ],
  },
  {
    category: 'Образ жизни',
    heading: 'Активность',
    summary: 'Движение, еда и вода',
    icon: ActivityIcon,
    fields: [
      { ...fieldActivity, hideLabel: false },
      fieldMeals,
      fieldWater,
      fieldActivityDetail,
    ],
  },
  {
    category: 'Образ жизни',
    heading: 'Быт',
    summary: 'Сон, готовка и тип питания',
    icon: MoonStarIcon,
    fields: [
      fieldSleep,
      fieldCooking,
      { ...fieldDietType, hideLabel: false },
      fieldRoutineDetail,
    ],
  },
  {
    category: 'Безопасность рациона',
    heading: 'Ограничения',
    summary: 'Аллергии и исключения',
    icon: ShieldAlertIcon,
    fields: [
      { ...fieldRestrictions, hideLabel: false },
      fieldNotes,
    ],
  },
  {
    category: 'Безопасность рациона',
    heading: 'Контекст',
    summary: 'Здоровье, стресс и опыт',
    icon: HeartPulseIcon,
    fields: [
      fieldHealth,
      fieldStressEating,
      { ...fieldDietExperience, hideLabel: false },
    ],
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
