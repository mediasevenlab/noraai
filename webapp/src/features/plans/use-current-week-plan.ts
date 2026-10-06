import * as React from 'react'

import { useAuth } from '@/features/auth'
import {
  mealDtoToEntry,
  readCompletedRationMealIds,
  readDetachedPlanMealIds,
  useMealsQuery,
  writeDetachedPlanMealIds,
} from '@/features/diary'
import {
  mentorRationToEntry,
  usePlanAssignmentQuery,
} from '@/features/mentor'

import { applyPlanOutline, readPlanOutline, WEEK_PLAN_OUTLINE_KEY } from './plan-outline'
import { buildCurrentWeekPlan } from './week-plan'

export function useCurrentWeekPlan() {
  const auth = useAuth()
  const userId = auth.user?.id
  const mealsQuery = useMealsQuery(auth.user?.role === 'user' ? userId : undefined)
  const assignment = usePlanAssignmentQuery(userId ?? '', false, Boolean(userId))
  const rations = React.useMemo(
    () => (assignment.data?.authoredPlans ?? []).map(mentorRationToEntry),
    [assignment.data?.authoredPlans],
  )
  const meals = React.useMemo(
    () => (mealsQuery.data?.items ?? []).map(mealDtoToEntry),
    [mealsQuery.data?.items],
  )
  const completedIds = React.useMemo(
    () =>
      readCompletedRationMealIds({
        userId: userId ?? 'guest',
        email: auth.user?.email,
      }),
    [auth.user?.email, mealsQuery.dataUpdatedAt, userId],
  )
  const savedScope = { userId: userId ?? 'guest', email: auth.user?.email }
  const [detachedIds, setDetachedIds] = React.useState(() => readDetachedPlanMealIds(savedScope))
  const detachedIdentity = `${savedScope.userId}:${savedScope.email ?? ''}`
  const [loadedDetachedIdentity, setLoadedDetachedIdentity] = React.useState(detachedIdentity)
  if (loadedDetachedIdentity !== detachedIdentity) {
    setLoadedDetachedIdentity(detachedIdentity)
    setDetachedIds(readDetachedPlanMealIds(savedScope))
  }
  const [weekOutline, setWeekOutline] = React.useState(() =>
    readPlanOutline(savedScope, WEEK_PLAN_OUTLINE_KEY),
  )
  const [loadedOutlineIdentity, setLoadedOutlineIdentity] = React.useState(detachedIdentity)
  if (loadedOutlineIdentity !== detachedIdentity) {
    setLoadedOutlineIdentity(detachedIdentity)
    setWeekOutline(readPlanOutline(savedScope, WEEK_PLAN_OUTLINE_KEY))
  }

  const plan = React.useMemo(
    () =>
      applyPlanOutline(
        buildCurrentWeekPlan({ completedIds, detachedIds, meals, rations }),
        weekOutline,
      ),
    [completedIds, detachedIds, meals, rations, weekOutline],
  )

  function detachPlanMeal(mealId: string) {
    const next = new Set(detachedIds)
    next.add(mealId)
    writeDetachedPlanMealIds(savedScope, next)
    setDetachedIds(next)
  }

  function applyWeekOutline(next: { title: string; description: string } | null) {
    setWeekOutline(next)
  }

  return {
    plan,
    meals,
    rations,
    completedIds,
    detachedIds,
    detachPlanMeal,
    applyWeekOutline,
    isPending: mealsQuery.isLoading,
    isError: mealsQuery.isError,
  }
}
