import * as React from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { clearSkippedPlanMealIds, planLibraryQueryKeys, usePlanLibraryQuery } from '@/features/diary'
import { useAuth } from '@/features/auth'
import {
  putRequestFromSnapshot,
  putUserPlanLibrary,
  snapshotFromPlanLibrary,
} from '@/platform/account-plan-library'
import {
  readPlanLibrarySnapshot,
  writePlanLibrarySnapshot,
  type PlanLibrarySnapshot,
} from '@/platform/plan-library-local'
import { readSelectedPlanIds } from '@/platform/selected-plan'

export function useSyncedPlanLibrary() {
  const auth = useAuth()
  const queryClient = useQueryClient()
  const savedScope = { userId: auth.user?.id ?? 'guest', email: auth.user?.email }
  const query = usePlanLibraryQuery(Boolean(auth.user))
  const snapshot = query.data
    ? snapshotFromPlanLibrary(query.data)
    : readPlanLibrarySnapshot(savedScope)

  const persist = React.useCallback(
    (next: PlanLibrarySnapshot) => {
      const previous = readSelectedPlanIds(savedScope)
      writePlanLibrarySnapshot(savedScope, next)
      if (next.selectedPlanIds.some((id) => !previous.has(id))) {
        clearSkippedPlanMealIds(savedScope)
      }
      if (!auth.user) return
      const userId = auth.user.id
      try {
        const request = putRequestFromSnapshot(next)
        queryClient.setQueryData(planLibraryQueryKeys.forUser(userId), {
          ...request,
          updatedAt: query.data?.updatedAt ?? new Date().toISOString(),
        })
        void putUserPlanLibrary(auth.transport, request)
          .then((remote) => {
            queryClient.setQueryData(planLibraryQueryKeys.forUser(userId), remote)
            writePlanLibrarySnapshot(
              { userId, email: auth.user?.email },
              snapshotFromPlanLibrary(remote),
            )
          })
          .catch(() => {
            toast.error('Не удалось сохранить планы в аккаунт')
          })
      } catch {
        toast.error('Не удалось сохранить планы в аккаунт')
      }
    },
    [auth.transport, auth.user, query.data?.updatedAt, queryClient, savedScope.email, savedScope.userId],
  )

  return { snapshot, persist, savedScope }
}
