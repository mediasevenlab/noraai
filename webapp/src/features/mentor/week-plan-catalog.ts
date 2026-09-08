import type { SavedAccountScope } from '@/platform/saved-ids'
import { readAssignedPlans, readAuthoredPlans } from '@/platform/authored-plans'

import { weekPlanOptions, type WeekPlanOption } from './ration-assignments'

export {
  AUTHORED_PLAN_ID_PREFIX,
  appendAuthoredPlan,
  createAuthoredPlan,
  isAuthoredPlanId,
  readAuthoredPlans,
  removeAuthoredPlan,
  writeAuthoredPlans,
  type AuthoredPlan,
} from '@/platform/authored-plans'

export { readSelectedPlanId, writeSelectedPlanId } from '@/platform/selected-plan'

export function allPlanOptions(
  scope: SavedAccountScope | string,
  now = new Date(),
): WeekPlanOption[] {
  const authored = readAuthoredPlans(scope).map((plan) => ({
    id: plan.id,
    title: plan.title,
  }))
  const assigned = readAssignedPlans(scope).map((plan) => ({
    id: plan.id,
    title: plan.title,
  }))
  return [...weekPlanOptions(now), ...authored, ...assigned]
}

export function defaultPlanId(
  options: readonly WeekPlanOption[],
  selectedPlanId: string | null,
) {
  if (selectedPlanId && options.some((plan) => plan.id === selectedPlanId)) return selectedPlanId
  return options[0]?.id ?? ''
}
