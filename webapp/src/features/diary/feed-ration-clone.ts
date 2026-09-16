import type { CreateUserMealRequest, SharedRation } from '@web-app-demo/contracts'

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
