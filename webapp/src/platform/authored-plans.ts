import { rationGoalSchema } from '@web-app-demo/contracts'

import type { SavedAccountScope } from '@/platform/saved-ids'

export const AUTHORED_PLAN_ID_PREFIX = 'plan_'
const AUTHORED_STORAGE_PREFIX = 'nora:plans-authored:v1:'
const ASSIGNED_STORAGE_PREFIX = 'nora:plans-assigned:v1:'

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export type PlanGoal = 'Похудение' | 'Набор' | 'Поддержание' | 'Здоровье'

export type AuthoredPlan = {
  id: string
  title: string
  description: string
  coverImage: string
  createdAt: string
  goal: PlanGoal | null
  sourceCatalogId?: string
}

export function isAuthoredPlanId(planId: string) {
  return planId.startsWith(AUTHORED_PLAN_ID_PREFIX)
}

export function isAssignedPlanId(planId: string) {
  return UUID_RE.test(planId)
}

export function parsePlanGoal(value: unknown): PlanGoal | null {
  const parsed = rationGoalSchema.safeParse(value)
  return parsed.success ? parsed.data : null
}

export function createAuthoredPlan(input: {
  title: string
  coverImage: string
  description?: string
  id?: string
  goal?: PlanGoal | null
  sourceCatalogId?: string
}): AuthoredPlan | null {
  const title = input.title.trim()
  if (!title) return null
  const requestedId = input.id?.trim() ?? ''
  const sourceCatalogId = input.sourceCatalogId?.trim() || undefined
  return {
    id: requestedId && isAuthoredPlanId(requestedId)
      ? requestedId
      : `${AUTHORED_PLAN_ID_PREFIX}${crypto.randomUUID()}`,
    title,
    description: input.description?.trim() ?? '',
    coverImage: input.coverImage.trim(),
    createdAt: new Date().toISOString(),
    goal: input.goal ?? null,
    ...(sourceCatalogId ? { sourceCatalogId } : {}),
  }
}

function accountKeys(scope: SavedAccountScope | string): string[] {
  if (typeof scope === 'string') return [scope]
  const keys: string[] = []
  const email = scope.email?.trim().toLowerCase()
  if (email) keys.push(email)
  if (scope.userId) keys.push(scope.userId)
  return [...new Set(keys)]
}

function parsePlanDescription(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

function parseAuthoredPlans(raw: string | null): AuthoredPlan[] {
  if (!raw) return []
  try {
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    const plans: AuthoredPlan[] = []
    const seen = new Set<string>()
    for (const item of parsed) {
      if (!item || typeof item !== 'object') continue
      const record = item as Record<string, unknown>
      const id = typeof record.id === 'string' ? record.id.trim() : ''
      const title = typeof record.title === 'string' ? record.title.trim() : ''
      if (!id || !title || seen.has(id) || !isAuthoredPlanId(id)) continue
      seen.add(id)
      const sourceCatalogId =
        typeof record.sourceCatalogId === 'string' ? record.sourceCatalogId.trim() : ''
      plans.push({
        id,
        title,
        description: parsePlanDescription(record.description),
        coverImage: typeof record.coverImage === 'string' ? record.coverImage : '',
        createdAt: typeof record.createdAt === 'string' ? record.createdAt : '',
        goal: parsePlanGoal(record.goal),
        ...(sourceCatalogId.startsWith('catalog_') ? { sourceCatalogId } : {}),
      })
    }
    return plans
  } catch {
    return []
  }
}

function parseAssignedPlans(raw: string | null): AuthoredPlan[] {
  if (!raw) return []
  try {
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    const plans: AuthoredPlan[] = []
    const seen = new Set<string>()
    for (const item of parsed) {
      if (!item || typeof item !== 'object') continue
      const record = item as Record<string, unknown>
      const id = typeof record.id === 'string' ? record.id.trim() : ''
      const title = typeof record.title === 'string' ? record.title.trim() : ''
      if (!id || !title || seen.has(id) || !isAssignedPlanId(id)) continue
      seen.add(id)
      plans.push({
        id,
        title,
        description: parsePlanDescription(record.description),
        coverImage: typeof record.coverImage === 'string' ? record.coverImage : '',
        createdAt: typeof record.createdAt === 'string' ? record.createdAt : '',
        goal: parsePlanGoal(record.goal),
      })
    }
    return plans
  } catch {
    return []
  }
}

function readScopedPlans(
  scope: SavedAccountScope | string,
  prefix: string,
  parse: (raw: string | null) => AuthoredPlan[],
): AuthoredPlan[] {
  if (typeof localStorage === 'undefined') return []
  const byId = new Map<string, AuthoredPlan>()
  for (const key of accountKeys(scope)) {
    for (const plan of parse(localStorage.getItem(`${prefix}${key}`))) {
      byId.set(plan.id, plan)
    }
  }
  return [...byId.values()].sort((left, right) => right.createdAt.localeCompare(left.createdAt))
}

function writeScopedPlans(
  scope: SavedAccountScope | string,
  prefix: string,
  plans: readonly AuthoredPlan[],
) {
  if (typeof localStorage === 'undefined') return
  const payload = JSON.stringify(plans)
  for (const key of accountKeys(scope)) {
    localStorage.setItem(`${prefix}${key}`, payload)
  }
}

export function readAuthoredPlans(scope: SavedAccountScope | string): AuthoredPlan[] {
  return readScopedPlans(scope, AUTHORED_STORAGE_PREFIX, parseAuthoredPlans)
}

export function writeAuthoredPlans(
  scope: SavedAccountScope | string,
  plans: readonly AuthoredPlan[],
) {
  writeScopedPlans(scope, AUTHORED_STORAGE_PREFIX, plans)
}

export function appendAuthoredPlan(
  scope: SavedAccountScope | string,
  plan: AuthoredPlan,
): AuthoredPlan[] {
  const next = [plan, ...readAuthoredPlans(scope).filter((item) => item.id !== plan.id)]
  writeAuthoredPlans(scope, next)
  return next
}

export function removeAuthoredPlan(
  scope: SavedAccountScope | string,
  planId: string,
): AuthoredPlan[] {
  const next = readAuthoredPlans(scope).filter((item) => item.id !== planId)
  writeAuthoredPlans(scope, next)
  return next
}

export function readAssignedPlans(scope: SavedAccountScope | string): AuthoredPlan[] {
  return readScopedPlans(scope, ASSIGNED_STORAGE_PREFIX, parseAssignedPlans)
}

export function writeAssignedPlans(
  scope: SavedAccountScope | string,
  plans: readonly AuthoredPlan[],
) {
  writeScopedPlans(scope, ASSIGNED_STORAGE_PREFIX, plans)
}
