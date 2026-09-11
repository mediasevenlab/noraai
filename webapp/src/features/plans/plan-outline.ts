import type { SavedAccountScope } from '@/platform/saved-ids'

export const WEEK_PLAN_OUTLINE_KEY = 'week'

export type PlanOutline = {
  title: string
  description: string
}

const OUTLINE_PREFIX = 'nora:plan-outline:v1:'

function accountKeys(scope: SavedAccountScope | string): string[] {
  if (typeof scope === 'string') return [scope]
  const keys: string[] = []
  const email = scope.email?.trim().toLowerCase()
  if (email) keys.push(email)
  if (scope.userId) keys.push(scope.userId)
  return [...new Set(keys)]
}

function storageKey(planId: string, accountKey: string) {
  return `${OUTLINE_PREFIX}${planId}:${accountKey}`
}

export function readPlanOutline(
  scope: SavedAccountScope | string,
  planId: string,
): PlanOutline | null {
  if (typeof localStorage === 'undefined' || !planId) return null
  for (const key of accountKeys(scope)) {
    const raw = localStorage.getItem(storageKey(planId, key))
    if (!raw) continue
    try {
      const parsed: unknown = JSON.parse(raw)
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) continue
      const record = parsed as Record<string, unknown>
      const title = typeof record.title === 'string' ? record.title : ''
      const description = typeof record.description === 'string' ? record.description : ''
      return { title, description }
    } catch {
      continue
    }
  }
  return null
}

export function writePlanOutline(
  scope: SavedAccountScope | string,
  planId: string,
  outline: PlanOutline,
) {
  if (typeof localStorage === 'undefined' || !planId) return
  const payload = JSON.stringify({
    title: outline.title,
    description: outline.description,
  })
  for (const key of accountKeys(scope)) {
    localStorage.setItem(storageKey(planId, key), payload)
  }
}

export function applyPlanOutline<T extends { title: string; description: string }>(
  plan: T,
  outline: PlanOutline | null,
): T {
  if (!outline) return plan
  const title = outline.title.trim()
  return {
    ...plan,
    title: title || plan.title,
    description: outline.description,
  }
}
