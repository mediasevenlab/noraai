import { groceryShoppingLines, mergeGroceryShoppingLines } from '@/platform/grocery-lines'
import { readSavedIdSet, writeSavedIdSet, type SavedAccountScope } from '@/platform/saved-ids'

import { activityDayKey } from './day-activity-rings'
import { isRationImportedMeal } from './ration-import'

const STORAGE_PREFIX = 'nora:day-shopping:v1:'

export type DayShoppingMeal = {
  id: string
  title: string
  ingredients: string
  assumptions?: string[]
  fromApi?: boolean
}

export type DayShoppingItem = {
  key: string
  label: string
}

export function shoppingDayKey(iso: string) {
  return activityDayKey(iso)
}

export function shoppingItemKey(label: string) {
  return label.trim().toLowerCase()
}

export function splitShoppingLabels(ingredients: string): string[] {
  return groceryShoppingLines(ingredients)
}

/** Grocery lines from ration-imported meals on a diary day, with amounts summed. */
export function dayShoppingItems(
  meals: readonly DayShoppingMeal[],
  limit?: number,
): DayShoppingItem[] {
  const labels: string[] = []
  for (const meal of meals) {
    if (!isRationImportedMeal(meal)) continue
    labels.push(...splitShoppingLabels(meal.ingredients))
  }
  const items = mergeGroceryShoppingLines(labels).map((label) => ({
    key: shoppingItemKey(label),
    label,
  }))
  if (limit != null && limit >= 0) return items.slice(0, limit)
  return items
}

function storagePrefix(dayKey: string) {
  return `${STORAGE_PREFIX}${dayKey}:`
}

export function readBoughtShoppingKeys(
  scope: SavedAccountScope | string,
  dayKey: string,
): Set<string> {
  return readSavedIdSet(storagePrefix(dayKey), scope)
}

export function writeBoughtShoppingKeys(
  scope: SavedAccountScope | string,
  dayKey: string,
  keys: ReadonlySet<string>,
) {
  writeSavedIdSet(storagePrefix(dayKey), scope, keys)
}

export function toggleBoughtShoppingKey(keys: ReadonlySet<string>, itemKey: string): Set<string> {
  const next = new Set(keys)
  if (next.has(itemKey)) next.delete(itemKey)
  else next.add(itemKey)
  return next
}

export function isDayShoppingComplete(
  items: readonly DayShoppingItem[],
  bought: ReadonlySet<string>,
) {
  return items.length > 0 && items.every((item) => bought.has(item.key))
}
