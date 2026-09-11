import { type SavedAccountScope } from './saved-ids'

export type PlanMealLayout = Record<string, string[]>

const LAYOUT_PREFIX = 'nora:plan-meal-layout:v1:'

function layoutStorageKey(planId: string, accountKey: string) {
  return `${LAYOUT_PREFIX}${planId}:${accountKey}`
}

export function extraPlanSlotTime(previous: string | undefined) {
  const base = previous ? new Date(previous) : new Date(2026, 0, 1, 8, 30, 0)
  const next = new Date(base)
  next.setMinutes(next.getMinutes() + 30)
  return next.toISOString()
}

export function planSlotTimesForCount(existing: string[], count: number) {
  const times = existing.slice(0, count)
  while (times.length < count) times.push(extraPlanSlotTime(times.at(-1)))
  return times
}

export function readPlanMealLayout(
  scope: SavedAccountScope | string,
  planId: string,
): PlanMealLayout | null {
  if (typeof localStorage === 'undefined' || !planId) return null
  const keys = typeof scope === 'string' ? [scope] : [scope.email?.trim().toLowerCase(), scope.userId]
  for (const key of keys) {
    if (!key) continue
    const raw = localStorage.getItem(layoutStorageKey(planId, key))
    if (!raw) continue
    try {
      const parsed: unknown = JSON.parse(raw)
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) continue
      const layout: PlanMealLayout = {}
      for (const [dayKey, ids] of Object.entries(parsed as Record<string, unknown>)) {
        if (!Array.isArray(ids)) continue
        layout[dayKey] = ids.filter((id): id is string => typeof id === 'string' && id.length > 0)
      }
      return layout
    } catch {
      continue
    }
  }
  return null
}

export function writePlanMealLayout(
  scope: SavedAccountScope | string,
  planId: string,
  layout: PlanMealLayout,
) {
  if (typeof localStorage === 'undefined' || !planId) return
  const payload = JSON.stringify(layout)
  const keys = typeof scope === 'string' ? [scope] : [scope.email?.trim().toLowerCase(), scope.userId]
  for (const key of keys) {
    if (!key) continue
    localStorage.setItem(layoutStorageKey(planId, key), payload)
  }
}
