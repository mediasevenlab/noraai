import {
  createMyMeal,
  mealImageFromUrl,
  PLAN_COVER_PLACEHOLDER_SRC,
  durablePlanCoverSrc,
  preferredMealPhotoSrc,
  rewriteMyMeal,
  type MealEntry,
} from '@/features/diary'
import { rationMealCreateDrafts, rationPlanDaySlots, type RationEntry, type RationMealDraft } from '@/features/mentor'

import { planMealRewriteRequest } from './plan-outline-editor'
import { ApiRequestError, type AuthenticatedTransport } from '@/platform/api'

const DATA_IMAGE = /^data:(image\/(?:jpeg|png|webp));base64,([a-z0-9+/=\s]+)$/i

export function mealCreateImageFields(src: string): {
  imageBase64: string
  imageMime: 'image/jpeg' | 'image/png' | 'image/webp'
} | null {
  const match = DATA_IMAGE.exec(src.trim())
  if (!match) return null
  return {
    imageBase64: match[2]!.replace(/\s+/g, ''),
    imageMime: match[1]!.toLowerCase() as 'image/jpeg' | 'image/png' | 'image/webp',
  }
}

export function resolvePublicMealImageUrl(src: string) {
  const trimmed = src.trim()
  if (!trimmed) return ''
  if (trimmed.startsWith('/') && typeof window !== 'undefined' && window.location?.origin) {
    return `${window.location.origin}${trimmed}`
  }
  return trimmed
}

export function catalogCloneErrorMessage(error: unknown) {
  if (
    error instanceof ApiRequestError &&
    (error.status === 429 || error.code === 'RATE_LIMITED')
  ) {
    return 'Слишком много запросов. Подождите минуту и попробуйте снова.'
  }
  if (error instanceof Error) {
    if (/too many (authentication|meal) requests/i.test(error.message)) {
      return 'Слишком много запросов. Подождите минуту и попробуйте снова.'
    }
    return error.message
  }
  return 'Не удалось добавить план'
}

export function firstDurablePlanCover(
  authored: string | undefined,
  meals: readonly { imageUrl?: string }[],
) {
  const picked = authored?.startsWith('data:') ? '' : durablePlanCoverSrc(authored)
  if (picked) return picked
  return meals.map((meal) => durablePlanCoverSrc(meal.imageUrl)).find(Boolean) ?? PLAN_COVER_PLACEHOLDER_SRC
}

/** Calendar date for plan day N. Day 8 is the next week, never day 1 again. */
export function rationDayStampDate(dayIndex: number, dayCount: number, now = new Date()) {
  if (!Number.isFinite(dayIndex) || dayIndex < 0) return null
  const count = Number.isFinite(dayCount) ? Math.max(0, Math.trunc(dayCount)) : 0
  return rationPlanDaySlots(count, now)[dayIndex]?.date ?? null
}

export async function stampRationDaysOntoPlan(
  transport: AuthenticatedTransport,
  days: readonly RationEntry[],
  planId: string,
) {
  const now = new Date()
  return Promise.all(
    days.flatMap((ration, dayIndex) => {
      const date = rationDayStampDate(dayIndex, days.length, now)
      if (!date) return []
      return rationMealCreateDrafts(ration, date, planId).map(async (body, mealIndex) => {
        const meal = ration.meals[mealIndex]
        const photo = preferredMealPhotoSrc({ image: meal?.image })
        const src = photo ? resolvePublicMealImageUrl(photo) : ''
        const inline = src ? mealCreateImageFields(src) : null
        const fetched = inline || !src ? null : await mealImageFromUrl(src)
        const image = inline
          ? { imageBase64: inline.imageBase64, imageMime: inline.imageMime }
          : fetched
            ? { imageBase64: fetched.base64, imageMime: fetched.mime }
            : null
        const steps = (meal?.steps ?? []).filter((step) => step.trim()).join('\n')
        return createMyMeal(transport, {
          ...body,
          clientComment: steps || body.clientComment,
          ...(image ?? {}),
        })
      })
    }),
  )
}

const MEAL_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

/** Writes editor changes onto existing ration meals. Chat history is not kept. */
export async function rewriteEditedPlanMeals(
  transport: AuthenticatedTransport,
  days: readonly { meals: readonly MealEntry[] }[],
  drafts: readonly (readonly RationMealDraft[])[],
) {
  const byId = new Map(days.flatMap((day) => day.meals).map((meal) => [meal.id, meal]))
  const jobs = drafts.flat().flatMap((draft) => {
    const meal = byId.get(draft.key)
    if (!meal || !MEAL_ID.test(meal.id)) return []
    const body = planMealRewriteRequest(meal, draft)
    if (!body) return []
    const image = draft.image.trim()
    const imageChanged = image.length > 0 && image !== meal.image.trim()
    return [
      (async () => {
        if (!imageChanged) return rewriteMyMeal(transport, meal.id, body)
        const inline = mealCreateImageFields(image)
        const fetched = inline ? null : await mealImageFromUrl(image)
        const photo = inline
          ? { imageBase64: inline.imageBase64, imageMime: inline.imageMime }
          : fetched
            ? { imageBase64: fetched.base64, imageMime: fetched.mime }
            : null
        return rewriteMyMeal(transport, meal.id, photo ? { ...body, ...photo } : body)
      })(),
    ]
  })
  return Promise.all(jobs)
}
