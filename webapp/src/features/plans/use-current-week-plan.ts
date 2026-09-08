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

  const plan = React.useMemo(
    () => buildCurrentWeekPlan({ completedIds, detachedIds, meals, rations }),
    [completedIds, detachedIds, meals, rations],
  )

  function detachPlanMeal(mealId: string) {
    const next = new Set(detachedIds)
    next.add(mealId)
    writeDetachedPlanMealIds(savedScope, next)
    setDetachedIds(next)
  }

  return {
    plan,
    meals,
    rations,
    completedIds,
    detachedIds,
    detachPlanMeal,
    isPending: mealsQuery.isPending,
    isError: mealsQuery.isError,
  }
}
