import { clearSkippedPlanMealIds } from '@/features/diary'
import { readSavedPlanIds, writeSavedPlanIds } from '@/platform/saved-plan-ids'
import type { SavedAccountScope } from '@/platform/saved-ids'
import {
  readSelectedPlanId,
  readSelectedPlanIds,
  writeSelectedPlanIds as writeStoredSelectedPlanIds,
} from '@/platform/selected-plan'

export { readSavedPlanIds, writeSavedPlanIds }
export { readSelectedPlanId, readSelectedPlanIds }

export function writeSelectedPlanIds(
  scope: SavedAccountScope | string,
  ids: ReadonlySet<string>,
) {
  const previous = readSelectedPlanIds(scope)
  writeStoredSelectedPlanIds(scope, ids)
  if ([...ids].some((id) => !previous.has(id))) clearSkippedPlanMealIds(scope)
}

export function writeSelectedPlanId(
  scope: SavedAccountScope | string,
  planId: string | null,
) {
  writeSelectedPlanIds(scope, planId ? new Set([planId]) : new Set())
}
