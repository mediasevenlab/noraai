import { readSavedIdSet, writeSavedIdSet, type SavedAccountScope } from '@/platform/saved-ids'

const SAVED_STORAGE_PREFIX = 'nora:plans-saved:v1:'

export function readSavedPlanIds(scope: SavedAccountScope | string): Set<string> {
  return readSavedIdSet(SAVED_STORAGE_PREFIX, scope)
}

export function writeSavedPlanIds(
  scope: SavedAccountScope | string,
  ids: ReadonlySet<string>,
) {
  writeSavedIdSet(SAVED_STORAGE_PREFIX, scope, ids)
}
