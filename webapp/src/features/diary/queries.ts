import { useQuery } from '@tanstack/react-query'

import { useAuth } from '@/features/auth'
import { getUserFavorites } from '@/platform/account-favorites'
import {
  getUserPlanLibrary,
  isEmptyPlanLibrary,
  putRequestFromSnapshot,
  putUserPlanLibrary,
  snapshotFromPlanLibrary,
} from '@/platform/account-plan-library'
import {
  isEmptyPlanLibrarySnapshot,
  readPlanLibrarySnapshot,
  writePlanLibrarySnapshot,
} from '@/platform/plan-library-local'

import { deleteMyMeal, listMentorUserMeals, listMyMeals, listSharedMeals } from './api'
import { readCompletedRationMealIds } from './ration-done'
import { purgeExpiredPendingRationMeals } from './ration-plan-expiry'

export const mealsQueryKeys = {
  all: ['session', 'meals'] as const,
  forSubject: (subjectUserId: string | undefined) =>
    [...mealsQueryKeys.all, subjectUserId ?? 'none'] as const,
  shared: () => [...mealsQueryKeys.all, 'shared'] as const,
}

export const favoritesQueryKeys = {
  forUser: (userId: string | undefined) => ['session', 'favorites', userId ?? 'none'] as const,
}

export const planLibraryQueryKeys = {
  forUser: (userId: string | undefined) =>
    ['session', 'plan-library', userId ?? 'none'] as const,
}

export function useMealsQuery(subjectUserId: string | undefined) {
  const auth = useAuth()
  const isOwnDiary = Boolean(auth.user && subjectUserId && auth.user.id === subjectUserId)
  const isMentorView = Boolean(
    auth.user?.role === 'mentor' && subjectUserId && auth.user.id !== subjectUserId,
  )

  return useQuery({
    queryKey: mealsQueryKeys.forSubject(subjectUserId),
    enabled: Boolean(subjectUserId) && (isOwnDiary || isMentorView),
    queryFn: async () => {
      if (!subjectUserId) return { items: [] }
      if (!isOwnDiary || !auth.user) return listMentorUserMeals(auth.transport, subjectUserId)
      const listed = await listMyMeals(auth.transport)
      const items = await purgeExpiredPendingRationMeals(
        listed.items,
        (mealId) => deleteMyMeal(auth.transport, mealId),
        {
          completedIds: readCompletedRationMealIds({
            userId: auth.user.id,
            email: auth.user.email,
          }),
        },
      )
      return items === listed.items ? listed : { items }
    },
  })
}

export function useSharedMealsQuery() {
  const auth = useAuth()

  return useQuery({
    queryKey: mealsQueryKeys.shared(),
    enabled: Boolean(auth.user),
    queryFn: async () => listSharedMeals(auth.transport),
  })
}

export function useUserFavoritesQuery(enabled: boolean) {
  const auth = useAuth()
  return useQuery({
    queryKey: favoritesQueryKeys.forUser(auth.user?.id),
    enabled: enabled && Boolean(auth.user),
    staleTime: 5 * 60_000,
    retry: false,
    queryFn: () => getUserFavorites(auth.transport),
  })
}

export function usePlanLibraryQuery(enabled = true) {
  const auth = useAuth()
  return useQuery({
    enabled: enabled && Boolean(auth.user),
    queryKey: planLibraryQueryKeys.forUser(auth.user?.id),
    staleTime: 5 * 60_000,
    retry: false,
    queryFn: async () => {
      const user = auth.user
      if (!user) throw new Error('Not authenticated')
      const scope = { userId: user.id, email: user.email }
      const remote = await getUserPlanLibrary(auth.transport)
      const local = readPlanLibrarySnapshot(scope)
      if (isEmptyPlanLibrary(remote) && !isEmptyPlanLibrarySnapshot(local)) {
        const migrated = await putUserPlanLibrary(auth.transport, putRequestFromSnapshot(local))
        writePlanLibrarySnapshot(scope, snapshotFromPlanLibrary(migrated))
        return migrated
      }
      writePlanLibrarySnapshot(scope, snapshotFromPlanLibrary(remote))
      return remote
    },
  })
}
