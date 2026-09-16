/** Hidden stamp on diary meals copied from a ration day. */
export const RATION_DIARY_SOURCE_MARK = 'Добавлено из рациона'
export const RATION_PLAN_ID_PREFIX = 'Рацион:'
/** Hidden stamp so a ration day belongs to a named week plan. */
export const WEEK_PLAN_ID_PREFIX = 'План:'
/** Hidden stamp after the user marks a planned meal as eaten. */
export const RATION_DIARY_DONE_MARK = 'Выполнено по плану'
/** Hidden stamp on diary meals copied from the public feed. */
export const FEED_DIARY_SOURCE_MARK = 'Добавлено из ленты'
export const FEED_SOURCE_ID_PREFIX = 'Лента:'
/** Hidden stamp on diary meals copied from a catalog plan favorite. */
export const CATALOG_FAVORITE_SOURCE_MARK = 'Добавлено из каталога'
export const CATALOG_FAVORITE_ID_PREFIX = 'Каталог:'
/** Hidden stamp after the owner attached their own photo to a derived card. */
export const MEAL_AUTHOR_PHOTO_MARK = 'Добавлено своё фото'

export function mealAssumptionsArePlanCopy(assumptions: readonly string[]) {
  return (
    assumptions.includes(RATION_DIARY_SOURCE_MARK)
    || assumptions.includes(FEED_DIARY_SOURCE_MARK)
    || assumptions.some((item) => item.startsWith(RATION_PLAN_ID_PREFIX))
    || assumptions.some((item) => item.startsWith(WEEK_PLAN_ID_PREFIX))
    || assumptions.some((item) => item.startsWith(FEED_SOURCE_ID_PREFIX))
  )
}

export function mealAssumptionsAreCatalogCopy(assumptions: readonly string[]) {
  return (
    assumptions.includes(CATALOG_FAVORITE_SOURCE_MARK)
    || assumptions.some((item) => item.startsWith(CATALOG_FAVORITE_ID_PREFIX))
  )
}

export function mealAssumptionsAreDerivedCopy(assumptions: readonly string[]) {
  return mealAssumptionsArePlanCopy(assumptions) || mealAssumptionsAreCatalogCopy(assumptions)
}

export function isMealShareProvenanceStamp(line: string) {
  const value = line.trim()
  if (!value) return false
  return (
    value === RATION_DIARY_SOURCE_MARK
    || value === RATION_DIARY_DONE_MARK
    || value === FEED_DIARY_SOURCE_MARK
    || value === CATALOG_FAVORITE_SOURCE_MARK
    || value === MEAL_AUTHOR_PHOTO_MARK
    || value.startsWith(RATION_PLAN_ID_PREFIX)
    || value.startsWith(WEEK_PLAN_ID_PREFIX)
    || value.startsWith(FEED_SOURCE_ID_PREFIX)
    || value.startsWith(CATALOG_FAVORITE_ID_PREFIX)
  )
}

export function preserveMealShareAssumptions(
  previous: readonly string[],
  next: readonly string[],
): string[] {
  const merged: string[] = []
  const seen = new Set<string>()
  for (const line of [...previous.filter(isMealShareProvenanceStamp), ...next]) {
    const value = line.trim()
    if (!value || seen.has(value)) continue
    seen.add(value)
    merged.push(value)
  }
  return merged
}

export function withAuthorPhotoMark(assumptions: readonly string[]): string[] {
  if (assumptions.includes(MEAL_AUTHOR_PHOTO_MARK)) return [...assumptions]
  return [...assumptions, MEAL_AUTHOR_PHOTO_MARK]
}

export function mealHasAuthorPhoto(input: {
  assumptions?: readonly string[]
  extraImageKeys?: readonly string[]
}): boolean {
  if (input.assumptions?.includes(MEAL_AUTHOR_PHOTO_MARK)) return true
  return (input.extraImageKeys ?? []).some((key) => key.trim().length > 0)
}

/** Derived copies need an owner photo; scratch meals can be published as-is. */
export function mealCanPublishToFeed(input: {
  assumptions: readonly string[]
  extraImageKeys?: readonly string[]
}): boolean {
  if (!mealAssumptionsAreDerivedCopy(input.assumptions)) return true
  return mealHasAuthorPhoto(input)
}

export function mealAssumptionsBlockShare(assumptions: readonly string[]) {
  return !mealCanPublishToFeed({ assumptions })
}
