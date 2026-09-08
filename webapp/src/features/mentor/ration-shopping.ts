import { readSavedIdSet, writeSavedIdSet, type SavedAccountScope } from '@/platform/saved-ids'

import { rationShoppingItems, type RationMeal } from './rations-catalog'

const STORAGE_PREFIX = 'nora:ration-shopping:v1:'

export type RationShoppingItem = {
  key: string
  label: string
}

export function rationShoppingList(meals: readonly RationMeal[]): RationShoppingItem[] {
  return rationShoppingItems(meals).map((label) => ({
    key: label.trim().toLowerCase(),
    label,
  }))
}

function storagePrefix(rationId: string) {
  return `${STORAGE_PREFIX}${rationId}:`
}

export function readBoughtRationShoppingKeys(
  scope: SavedAccountScope | string,
  rationId: string,
): Set<string> {
  return readSavedIdSet(storagePrefix(rationId), scope)
}

export function writeBoughtRationShoppingKeys(
  scope: SavedAccountScope | string,
  rationId: string,
  keys: ReadonlySet<string>,
) {
  writeSavedIdSet(storagePrefix(rationId), scope, keys)
}

export function toggleBoughtRationShoppingKey(
  keys: ReadonlySet<string>,
  itemKey: string,
): Set<string> {
  const next = new Set(keys)
  if (next.has(itemKey)) next.delete(itemKey)
  else next.add(itemKey)
  return next
}
