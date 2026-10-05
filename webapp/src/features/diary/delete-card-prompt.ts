export type CardDeletePrompt = {
  title: string
  description: string
  confirmLabel: string
}

function cardName(title: string, fallback: string) {
  const name = title.trim()
  return name.length > 0 ? name : fallback
}

/** Diary trash either destroys the card or only hides a plan meal from the diary. */
export function mealCardDeletePrompt(
  meal: { title: string },
  keepsInPlan: boolean,
): CardDeletePrompt {
  const name = cardName(meal.title, 'этот приём')
  if (keepsInPlan) {
    return {
      title: 'Убрать из дневника?',
      description: `Карточка «${name}» исчезнет из дневника и останется в плане.`,
      confirmLabel: 'Убрать',
    }
  }
  return {
    title: 'Удалить карточку?',
    description: `Карточка «${name}» будет удалена. Вернуть её не получится.`,
    confirmLabel: 'Удалить',
  }
}

/** Plan-board trash either detaches a finished meal or deletes the card. */
export function planMealDeletePrompt(
  meal: { title: string },
  detachOnly: boolean,
): CardDeletePrompt {
  const name = cardName(meal.title, 'этот приём')
  if (detachOnly) {
    return {
      title: 'Убрать из плана?',
      description: `Карточка «${name}» исчезнет из этого плана.`,
      confirmLabel: 'Убрать',
    }
  }
  return {
    title: 'Удалить карточку?',
    description: `Карточка «${name}» будет удалена. Вернуть её не получится.`,
    confirmLabel: 'Удалить',
  }
}

export function planCardDeletePrompt(title: string): CardDeletePrompt {
  const name = cardName(title, 'этот план')
  return {
    title: 'Удалить план?',
    description: `План «${name}» будет удалён. Вернуть его не получится.`,
    confirmLabel: 'Удалить',
  }
}
