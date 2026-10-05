import {
  isQuestionnaireAnswersComplete,
  questionnaireAnswersSchema,
  type QuestionnaireAnswers,
} from '@web-app-demo/contracts'

const GOALS = ['Похудение', 'Набор массы', 'Поддержание', 'Здоровье'] as const
const ACTIVITIES = ['Низкая', 'Умеренная', 'Высокая', 'Очень высокая'] as const
const COOKING = ['Дома', 'Смешанно', 'Чаще вне дома'] as const
const DIETS = ['Обычное', 'Высокобелковое', 'Вегетарианское', 'Безглютеновое'] as const
const RESTRICTIONS = ['Нет', 'Лактоза', 'Глютен', 'Орехи'] as const
const HEALTH = ['Нет хронических', 'ЖКТ', 'Давление', 'Щитовидная'] as const
const STRESS = ['Редко', 'Иногда', 'Часто'] as const
const EXPERIENCE = ['Нет опыта', 'Был опыт', 'Много попыток'] as const

/** Deterministic unique answers for backfill of existing user accounts. */
export function uniqueQuestionnaireAnswers(publicId: number): QuestionnaireAnswers {
  const sexLabel = publicId % 2 === 0 ? 'Мужской' : 'Женский'
  const age = 22 + (publicId % 28)
  const height = 158 + (publicId % 35)
  const weight = 55 + (publicId % 50)
  const targetWeight = Math.max(50, weight - 5 - (publicId % 15))
  const goal = GOALS[publicId % GOALS.length]!
  const activity = ACTIVITIES[publicId % ACTIVITIES.length]!
  const cooking = COOKING[publicId % COOKING.length]!
  const dietType = DIETS[publicId % DIETS.length]!
  const restrictions = RESTRICTIONS[publicId % RESTRICTIONS.length]!
  const health = HEALTH[publicId % HEALTH.length]!
  const stressEating = STRESS[publicId % STRESS.length]!
  const dietExperience = EXPERIENCE[publicId % EXPERIENCE.length]!
  const meals = `${2 + (publicId % 3)} / день`
  const water = `${(1 + (publicId % 3) * 0.5).toString().replace('.', ',')} л / день`
  const sleep = `${6 + (publicId % 3)}–${7 + (publicId % 3)} часов`
  const timeline = `${2 + (publicId % 4)} месяца`

  return questionnaireAnswersSchema.parse({
    sexLabel,
    ageLabel: `${age} лет`,
    height: `${height} см`,
    weight: `${weight} кг`,
    goal,
    goalPace: 'Умеренно',
    goalDetail:
      publicId % 3 === 0
        ? `Хочу стабильный прогресс по цели «${goal.toLowerCase()}» без срывов.`
        : '',
    targetWeight: `${targetWeight} кг`,
    timeline,
    activity,
    activityDetail: '',
    meals,
    water,
    sleep,
    cooking,
    dietType,
    routineDetail: '',
    restrictions,
    health,
    stressEating,
    dietExperience,
    notes:
      publicId % 2 === 0
        ? `Индивидуальные заметки пользователя #${publicId}: учитывайте ограничения (${restrictions.toLowerCase()}).`
        : '',
  })
}

export function parseQuestionnaireAnswers(value: unknown): QuestionnaireAnswers {
  return questionnaireAnswersSchema.parse(value)
}

export { isQuestionnaireAnswersComplete }
