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

export function mealAssumptionsBlockShare(assumptions: readonly string[]) {
  return mealAssumptionsArePlanCopy(assumptions) || mealAssumptionsAreCatalogCopy(assumptions)
}
