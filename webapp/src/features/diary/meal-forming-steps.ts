export function isComposerAnalyzingPlaceholder(text: string) {
  return (
    text.startsWith('⏳ Распознаю еду')
    || text.startsWith('⏳ Обрабатываю')
  )
}

export function mealFormingSteps(photoCount: number) {
  const photos = photoCount > 1 ? `${photoCount} фото` : 'фото'
  return [
    `⏳ Смотрю ${photos} и определяю блюда…`,
    '⏳ Уточняю состав и размер порций…',
    '⏳ Считаю калории, белки, жиры и углеводы…',
    '⏳ Проверяю нутриенты…',
    '⏳ Собираю карточку приёма…',
  ]
}

export function mealRefiningSteps(hasPhoto: boolean) {
  if (hasPhoto) return mealFormingSteps(1)
  return [
    '⏳ Уточняю состав и размер порций…',
    '⏳ Считаю калории, белки, жиры и углеводы…',
    '⏳ Проверяю нутриенты…',
    '⏳ Собираю карточку приёма…',
  ]
}

export const MEAL_FORMING_STEP_GAP_MS = 1750
