import { readSavedIdSet, writeSavedIdSet, type SavedAccountScope } from '@/platform/saved-ids'

const SELECTED_STORAGE_PREFIX = 'nora:plans-selected:v1:'

export function readSelectedPlanIds(scope: SavedAccountScope | string): Set<string> {
  return readSavedIdSet(SELECTED_STORAGE_PREFIX, scope)
}

export function writeSelectedPlanIds(
  scope: SavedAccountScope | string,
  ids: ReadonlySet<string>,
) {
  writeSavedIdSet(SELECTED_STORAGE_PREFIX, scope, ids)
}

export function readSelectedPlanId(scope: SavedAccountScope | string): string | null {
  return [...readSelectedPlanIds(scope)][0] ?? null
}

export function writeSelectedPlanId(
  scope: SavedAccountScope | string,
  planId: string | null,
) {
  writeSelectedPlanIds(scope, planId ? new Set([planId]) : new Set())
}
