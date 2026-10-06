import type {
  CreateUserMealRequest,
  SharedRation,
  UpsertMentorPlanRequest,
} from '@web-app-demo/contracts'

import { createAuthoredPlan, type AuthoredPlan } from '@/platform/authored-plans'
import { addLocalDays, startOfLocalDay } from '@/platform/plan-slots'

import { RATION_DIARY_SOURCE_MARK, rationPlanAssumption, weekPlanAssumption } from './ration-import'

const SLOT_CLOCK = {
  Завтрак: [8, 30],
  Обед: [13, 0],
  Перекус: [16, 30],
  Ужин: [19, 30],
} as const

function categoryForSlot(
  slot: SharedRation['meals'][number]['slot'],
): CreateUserMealRequest['category'] {
  if (slot === 'Завтрак' || slot === 'Перекус') return slot
  return 'Мясо'
}

function mondayOfTemplateWeek(now = new Date()) {
  const start = startOfLocalDay(now)
  const weekday = start.getDay()
  return addLocalDays(start, weekday === 0 ? -6 : 1 - weekday)
}

export function authoredCloneOfSharedRation(
  plans: readonly AuthoredPlan[],
  rationId: string,
) {
  return plans.find((plan) => plan.sourceSharedRationId === rationId) ?? null
}

export function canAddSharedRationToMine(
  ration: Pick<SharedRation, 'own' | 'id'>,
  authored: readonly AuthoredPlan[],
) {
  if (ration.own) return false
  return authoredCloneOfSharedRation(authored, ration.id) == null
}

export function sharedRationAddLabel(
  ration: Pick<SharedRation, 'own' | 'id'>,
  authored: readonly AuthoredPlan[],
) {
  if (ration.own) return 'Это ваш рацион'
  if (authoredCloneOfSharedRation(authored, ration.id)) return 'Уже в «Мои»'
  return 'В мои'
}

export function createAuthoredPlanFromSharedRation(ration: SharedRation) {
  return createAuthoredPlan({
    title: ration.title,
    coverImage: ration.coverImage,
    description: ration.description,
    goal: ration.goal,
    dayCount: ration.days,
    sourceSharedRationId: ration.id,
  })
}

export const MENTOR_FEED_PLAN_CAP = 20

/** A shared ration becomes one of the mentor's own plans. */
export function mentorPlanRequestFromSharedRation(
  ration: SharedRation,
): UpsertMentorPlanRequest | null {
  if (ration.meals.length === 0) return null
  const image = ration.coverImage.trim()
  return {
    title: ration.title.trim().slice(0, 120),
    description: ration.description,
    goal: ration.goal ?? 'Поддержание',
    ...(image ? { image } : {}),
    meals: ration.meals.map((meal) => ({
      slot: meal.slot,
      title: meal.title,
      ingredients: meal.ingredients,
      steps: [],
      image: meal.image,
      kcal: meal.kcal,
      protein: meal.protein,
      fat: meal.fat,
      carbs: meal.carbs,
      dayIndex: meal.dayIndex,
    })),
  }
}

export function matchingMentorPlanByTitle<T extends { title: string }>(
  title: string,
  plans: readonly T[],
) {
  const wanted = title.trim()
  return plans.find((plan) => plan.title.trim() === wanted) ?? null
}

/** Monday is 0, matching mentor plan dayIndex. */
export function mentorWeekdayIndex(date: Date) {
  const weekday = date.getDay()
  return weekday === 0 ? 6 : weekday - 1
}

export function appendFeedMealToMentorPlan(
  plan: {
    title: string
    description: string
    goal: UpsertMentorPlanRequest['goal']
    image: string
    meals: UpsertMentorPlanRequest['meals']
  },
  meal: {
    title: string
    ingredients: string
    meal: UpsertMentorPlanRequest['meals'][number]['slot']
    kcal: number
    protein: number
    fat: number
    carbs: number
    image?: string
  },
  dayIndex: number,
):
  | { ok: true; body: UpsertMentorPlanRequest }
  | { ok: false; reason: 'duplicate' | 'full' } {
  const index = Math.min(6, Math.max(0, dayIndex))
  const title = meal.title.trim()
  if (
    plan.meals.some(
      (item) =>
        (item.dayIndex ?? 0) === index
        && item.slot === meal.meal
        && item.title.trim() === title,
    )
  ) {
    return { ok: false, reason: 'duplicate' }
  }
  if (plan.meals.length >= 80) return { ok: false, reason: 'full' }
  const image = plan.image.trim()
  return {
    ok: true,
    body: {
      title: plan.title,
      description: plan.description,
      goal: plan.goal,
      ...(image ? { image } : {}),
      meals: [
        ...plan.meals,
        {
          slot: meal.meal,
          title,
          ingredients: meal.ingredients,
          steps: [],
          image: meal.image?.trim() ?? '',
          kcal: meal.kcal,
          protein: meal.protein,
          fat: meal.fat,
          carbs: meal.carbs,
          dayIndex: index,
        },
      ],
    },
  }
}

export function sharedRationMealCreateDrafts(
  ration: SharedRation,
  planId: string,
  now = new Date(),
): CreateUserMealRequest[] {
  const weekStart = mondayOfTemplateWeek(now)
  return ration.meals.map((meal) => {
    const recorded = addLocalDays(weekStart, meal.dayIndex)
    const [hours, minutes] = SLOT_CLOCK[meal.slot]
    recorded.setHours(hours, minutes, 0, 0)
    return {
      title: meal.title,
      ingredients: meal.ingredients,
      category: categoryForSlot(meal.slot),
      meal: meal.slot,
      recordedAt: recorded.toISOString(),
      kcal: meal.kcal,
      protein: meal.protein,
      fat: meal.fat,
      carbs: meal.carbs,
      portionItems: [],
      clientComment: '',
      assumptions: [
        RATION_DIARY_SOURCE_MARK,
        rationPlanAssumption(planId),
        weekPlanAssumption(planId),
      ],
      micronutrients: [],
      source: 'manual' as const,
      clientKey: `fr:${ration.id.replace(/-/g, '').slice(0, 20)}:${meal.dayIndex}:${meal.slot}`.slice(
        0,
        64,
      ),
    }
  })
}
