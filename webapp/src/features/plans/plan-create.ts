import {
  createMyMeal,
  mealImageFromUrl,
  PLAN_COVER_PLACEHOLDER_SRC,
  durablePlanCoverSrc,
  preferredMealPhotoSrc,
} from '@/features/diary'
import { rationMealCreateDrafts, rationPlanDaySlots, type RationEntry } from '@/features/mentor'
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
