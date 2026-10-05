import { useSyncExternalStore } from 'react'

export const CALORIE_PREFERENCE_KEY_PREFIX = 'nora:calorie-preference:'

export const CUSTOM_CALORIE_MIN = 500
export const CUSTOM_CALORIE_MAX = 8000

export type CaloriePreference = {
  useRecommendation: boolean
  customKcal: number | null
}

export const DEFAULT_CALORIE_PREFERENCE: CaloriePreference = {
  useRecommendation: true,
  customKcal: null,
}

const calorieFormat = new Intl.NumberFormat('ru-RU')

export function formatCalorieKcal(value: number): string {
  return calorieFormat.format(value)
}

export function parseCustomCalorieKcal(raw: string): number | null {
  const trimmed = raw.trim().replace(/\s/g, '')
  if (!/^\d+$/.test(trimmed)) return null
  const value = Number(trimmed)
  if (value < CUSTOM_CALORIE_MIN || value > CUSTOM_CALORIE_MAX) return null
  return value
}

export function parseCaloriePreference(raw: string | null): CaloriePreference {
  if (!raw) return DEFAULT_CALORIE_PREFERENCE
  try {
    const parsed: unknown = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return DEFAULT_CALORIE_PREFERENCE
    const record = parsed as Record<string, unknown>
    const customKcal = typeof record.customKcal === 'number'
      && Number.isInteger(record.customKcal)
      && record.customKcal >= CUSTOM_CALORIE_MIN
      && record.customKcal <= CUSTOM_CALORIE_MAX
      ? record.customKcal
      : null
    return {
      useRecommendation: record.useRecommendation !== false,
      customKcal,
    }
  } catch {
    return DEFAULT_CALORIE_PREFERENCE
  }
}

/** Left number stays the questionnaire maintenance. Right number is the goal or the typed value. */
export function profileCalorieValue(input: {
  maintenance: number | null
  goalTarget: number | null
  preference: CaloriePreference
}): string | null {
  const goal = input.preference.useRecommendation
    ? input.goalTarget
    : input.preference.customKcal
  if (input.maintenance != null && goal != null) {
    return `${formatCalorieKcal(input.maintenance)} / ${formatCalorieKcal(goal)} ккал`
  }
  if (!input.preference.useRecommendation && input.preference.customKcal != null) {
    return `${formatCalorieKcal(input.preference.customKcal)} ккал`
  }
  if (input.maintenance != null) return `${formatCalorieKcal(input.maintenance)} ккал`
  return null
}

/** Calories the diary follows: an explicit target, otherwise the custom value, otherwise the goal. */
export function followedDailyCalories(input: {
  calorieTarget?: number | null
  goalTarget: number | null
  preference: CaloriePreference
  fallback?: number | null
}): number | null {
  if (input.calorieTarget != null) return input.calorieTarget
  if (!input.preference.useRecommendation && input.preference.customKcal != null) {
    return input.preference.customKcal
  }
  return input.goalTarget ?? input.fallback ?? null
}

function storageKey(userId: string) {
  return `${CALORIE_PREFERENCE_KEY_PREFIX}${userId}`
}

const cache = new Map<string, CaloriePreference>()
const listeners = new Set<() => void>()

function readStored(userId: string): CaloriePreference {
  if (typeof window === 'undefined') return DEFAULT_CALORIE_PREFERENCE
  return parseCaloriePreference(window.localStorage.getItem(storageKey(userId)))
}

function cachedPreference(userId: string): CaloriePreference {
  const existing = cache.get(userId)
  if (existing) return existing
  const parsed = readStored(userId)
  cache.set(userId, parsed)
  return parsed
}

function emit() {
  for (const listener of listeners) listener()
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function writeCaloriePreference(userId: string, next: CaloriePreference) {
  const stored: CaloriePreference = {
    useRecommendation: next.useRecommendation,
    customKcal: next.customKcal,
  }
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(storageKey(userId), JSON.stringify(stored))
  }
  cache.set(userId, stored)
  emit()
}

export function useCaloriePreference(userId: string | null | undefined): CaloriePreference {
  return useSyncExternalStore(
    subscribe,
    () => (userId ? cachedPreference(userId) : DEFAULT_CALORIE_PREFERENCE),
    () => DEFAULT_CALORIE_PREFERENCE,
  )
}
