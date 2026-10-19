import type { AuthoredPlan } from '@/platform/authored-plans'
import { readAuthoredPlans, writeAuthoredPlans } from '@/platform/authored-plans'
import {
  readPlanAssignmentMap,
  readPlanStartMap,
  writePlanAssignmentMap,
  writePlanStartMap,
} from '@/platform/plan-start'
import { readSavedPlanIds, writeSavedPlanIds } from '@/platform/saved-plan-ids'
import type { SavedAccountScope } from '@/platform/saved-ids'
import { readSelectedPlanIds, writeSelectedPlanIds } from '@/platform/selected-plan'

export type PlanLibrarySnapshot = {
  authoredPlans: AuthoredPlan[]
  savedPlanIds: string[]
  selectedPlanIds: string[]
  planStarts: Record<string, string>
  planGenerations?: Record<string, number>
}

export function emptyPlanLibrarySnapshot(): PlanLibrarySnapshot {
  return {
    authoredPlans: [],
    savedPlanIds: [],
    selectedPlanIds: [],
    planStarts: {},
  }
}

export function isEmptyPlanLibrarySnapshot(snapshot: PlanLibrarySnapshot) {
  return (
    snapshot.authoredPlans.length === 0 &&
    snapshot.savedPlanIds.length === 0 &&
    snapshot.selectedPlanIds.length === 0 &&
    Object.keys(snapshot.planStarts).length === 0
  )
}

export function readPlanLibrarySnapshot(scope: SavedAccountScope | string): PlanLibrarySnapshot {
  return {
    authoredPlans: readAuthoredPlans(scope),
    savedPlanIds: [...readSavedPlanIds(scope)],
    selectedPlanIds: [...readSelectedPlanIds(scope)],
    planStarts: readPlanStartMap(scope),
    planGenerations: readPlanAssignmentMap(scope),
  }
}

export function writePlanLibrarySnapshot(
  scope: SavedAccountScope | string,
  snapshot: PlanLibrarySnapshot,
) {
  writeAuthoredPlans(scope, snapshot.authoredPlans)
  writeSavedPlanIds(scope, new Set(snapshot.savedPlanIds))
  writeSelectedPlanIds(scope, new Set(snapshot.selectedPlanIds))
  writePlanStartMap(scope, snapshot.planStarts)
  writePlanAssignmentMap(scope, snapshot.planGenerations ?? {})
}

export function withAuthoredPlan(
  snapshot: PlanLibrarySnapshot,
  plan: AuthoredPlan,
): PlanLibrarySnapshot {
  return {
    ...snapshot,
    authoredPlans: [plan, ...snapshot.authoredPlans.filter((item) => item.id !== plan.id)],
  }
}

export function withoutAuthoredPlan(
  snapshot: PlanLibrarySnapshot,
  planId: string,
): PlanLibrarySnapshot {
  const planStarts = { ...snapshot.planStarts }
  delete planStarts[planId]
  const planGenerations = snapshot.planGenerations ? { ...snapshot.planGenerations } : undefined
  if (planGenerations) delete planGenerations[planId]
  return {
    authoredPlans: snapshot.authoredPlans.filter((item) => item.id !== planId),
    savedPlanIds: snapshot.savedPlanIds.filter((id) => id !== planId),
    selectedPlanIds: snapshot.selectedPlanIds.filter((id) => id !== planId),
    planStarts,
    ...(planGenerations ? { planGenerations } : {}),
  }
}
