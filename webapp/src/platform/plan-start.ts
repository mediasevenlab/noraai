import {
  dateFromDayKey,
  dayKeyFromDate,
  startOfLocalDay,
} from './plan-slots'
import type { SavedAccountScope } from './saved-ids'

const START_PREFIX = 'nora:plans-start:v1:'
const ASSIGN_PREFIX = 'nora:plans-assign:v1:'

function accountKeys(scope: SavedAccountScope | string): string[] {
  if (typeof scope === 'string') return [scope]
  const keys: string[] = []
  const email = scope.email?.trim().toLowerCase()
  if (email) keys.push(email)
  if (scope.userId) keys.push(scope.userId)
  return [...new Set(keys)]
}

function parseStartMap(raw: string | null): Record<string, string> {
  if (!raw) return {}
  try {
    const parsed: unknown = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {}
    const out: Record<string, string> = {}
    for (const [planId, dayKey] of Object.entries(parsed as Record<string, unknown>)) {
      if (typeof dayKey === 'string' && dateFromDayKey(dayKey)) out[planId] = dayKey
    }
    return out
  } catch {
    return {}
  }
}

/**
 * A new choice starts today. An already selected plan keeps its start when
 * that start is today or later; a leftover start from a previous month does not.
 */
export function suggestedPlanStartDate(
  stored: Date | null,
  selected: boolean,
  now = new Date(),
): Date {
  const today = startOfLocalDay(now)
  if (!selected || !stored) return today
  const start = startOfLocalDay(stored)
  return start.getTime() < today.getTime() ? today : start
}

function readStartMap(scope: SavedAccountScope | string): Record<string, string> {
  if (typeof localStorage === 'undefined') return {}
  const merged: Record<string, string> = {}
  for (const key of accountKeys(scope)) {
    Object.assign(merged, parseStartMap(localStorage.getItem(`${START_PREFIX}${key}`)))
  }
  return merged
}

function writeStartMap(scope: SavedAccountScope | string, map: Record<string, string>) {
  if (typeof localStorage === 'undefined') return
  const payload = JSON.stringify(map)
  for (const key of accountKeys(scope)) {
    localStorage.setItem(`${START_PREFIX}${key}`, payload)
  }
}

function parseAssignmentMap(raw: string | null): Record<string, number> {
  if (!raw) return {}
  try {
    const parsed: unknown = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {}
    const out: Record<string, number> = {}
    for (const [planId, generation] of Object.entries(parsed as Record<string, unknown>)) {
      if (typeof generation === 'number' && Number.isInteger(generation) && generation >= 1 && generation <= 10_000) {
        out[planId] = generation
      }
    }
    return out
  } catch {
    return {}
  }
}

export function readPlanAssignmentMap(scope: SavedAccountScope | string): Record<string, number> {
  if (typeof localStorage === 'undefined') return {}
  const merged: Record<string, number> = {}
  for (const key of accountKeys(scope)) {
    Object.assign(merged, parseAssignmentMap(localStorage.getItem(`${ASSIGN_PREFIX}${key}`)))
  }
  return merged
}

export function writePlanAssignmentMap(
  scope: SavedAccountScope | string,
  map: Record<string, number>,
) {
  if (typeof localStorage === 'undefined') return
  const payload = JSON.stringify(map)
  for (const key of accountKeys(scope)) {
    localStorage.setItem(`${ASSIGN_PREFIX}${key}`, payload)
  }
}

export function readPlanStartMap(scope: SavedAccountScope | string): Record<string, string> {
  return readStartMap(scope)
}

export function writePlanStartMap(
  scope: SavedAccountScope | string,
  map: Record<string, string>,
) {
  writeStartMap(scope, map)
}

export function readPlanStartDayKey(
  scope: SavedAccountScope | string,
  planId: string,
): string | null {
  return readStartMap(scope)[planId] ?? null
}

export function writePlanStartDayKey(
  scope: SavedAccountScope | string,
  planId: string,
  dayKey: string | null,
) {
  const next = { ...readStartMap(scope) }
  if (dayKey && dateFromDayKey(dayKey)) next[planId] = dayKey
  else delete next[planId]
  writeStartMap(scope, next)
}

export function writePlanStartDate(
  scope: SavedAccountScope | string,
  planId: string,
  date: Date,
) {
  writePlanStartDayKey(scope, planId, dayKeyFromDate(startOfLocalDay(date)))
}

export function readPlanStartDate(
  scope: SavedAccountScope | string,
  planId: string | null,
): Date | null {
  if (!planId) return null
  const key = readPlanStartDayKey(scope, planId)
  return key ? dateFromDayKey(key) : null
}
