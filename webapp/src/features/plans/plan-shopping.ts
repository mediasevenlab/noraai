import { mealGroceryLines, type MealEntry } from '@/features/diary'
import { readSavedIdSet, writeSavedIdSet, type SavedAccountScope } from '@/platform/saved-ids'

const STORAGE_PREFIX = 'nora:plan-shopping:v1:'

export const PLAN_SHOPPING_ALL_DAYS = 'all'

export type PlanShoppingItem = {
  key: string
  label: string
}

export type PlanShoppingDay = {
  meals: readonly MealEntry[]
}

function shoppingItemKey(label: string) {
  return label.trim().toLowerCase()
}

/** Unique grocery lines from every planned meal, including authored preview cards. */
export function planShoppingItems(meals: readonly MealEntry[]): PlanShoppingItem[] {
  const seen = new Set<string>()
  const items: PlanShoppingItem[] = []
  for (const meal of meals) {
    for (const label of mealGroceryLines(meal)) {
      const key = shoppingItemKey(label)
      if (seen.has(key)) continue
      seen.add(key)
      items.push({ key, label })
    }
  }
  return items
}

export function planShoppingDayOptions(dayCount: number) {
  const days = Math.max(0, dayCount)
  return [
    { value: PLAN_SHOPPING_ALL_DAYS, label: 'Все дни' },
    ...Array.from({ length: days }, (_, index) => {
      const day = index + 1
      return { value: String(day), label: `${day} день` }
    }),
  ]
}

export function planShoppingItemsForDay(
  days: readonly PlanShoppingDay[],
  dayValue: string,
) {
  if (dayValue === PLAN_SHOPPING_ALL_DAYS) {
    return planShoppingItems(days.flatMap((day) => day.meals))
  }
  const index = Number(dayValue) - 1
  if (!Number.isInteger(index) || index < 0) return []
  return planShoppingItems(days[index]?.meals ?? [])
}

function storagePrefix(planId: string) {
  return `${STORAGE_PREFIX}${planId}:`
}

export function readBoughtPlanShoppingKeys(
  scope: SavedAccountScope | string,
  planId: string,
): Set<string> {
  return readSavedIdSet(storagePrefix(planId), scope)
}

export function writeBoughtPlanShoppingKeys(
  scope: SavedAccountScope | string,
  planId: string,
  keys: ReadonlySet<string>,
) {
  writeSavedIdSet(storagePrefix(planId), scope, keys)
}

export function toggleBoughtPlanShoppingKey(
  keys: ReadonlySet<string>,
  itemKey: string,
): Set<string> {
  const next = new Set(keys)
  if (next.has(itemKey)) next.delete(itemKey)
  else next.add(itemKey)
  return next
}
