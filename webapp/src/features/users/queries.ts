import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type {
  MeResponse,
  PutQuestionnaireRequest,
  TelegramLinkRequest,
  UpdateProfileRequest,
  UserReferralsQuery,
} from '@web-app-demo/contracts'

import { authQueryKeys, useAuth } from '@/features/auth'
import {
  connectCurrentUserToMentor,
  getCurrentUserMentor,
  getQuestionnaire,
  getUserReferrals,
  putQuestionnaire,
  startTelegramLink,
  updateProfile,
} from './api'

const userQueryKeys = {
  currentMentor: () => ['session', 'users', 'current-mentor'] as const,
  questionnaire: () => ['session', 'users', 'questionnaire'] as const,
  referrals: (query: UserReferralsQuery) => ['session', 'users', 'referrals', query] as const,
}

export function useUpdateProfileMutation() {
  const auth = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: UpdateProfileRequest) =>
      updateProfile(auth.transport, input),
    onSuccess: (response) => {
      queryClient.setQueryData(
        authQueryKeys.me(),
        { user: response.user } satisfies MeResponse,
      )
    },
  })
}

export function useConnectCurrentUserToMentorMutation() {
  const auth = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (identifier: string) =>
      connectCurrentUserToMentor(auth.transport, { identifier }),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: userQueryKeys.currentMentor() }),
  })
}

export function useCurrentUserMentorQuery(enabled = true) {
  const auth = useAuth()
  return useQuery({
    enabled: enabled && auth.user?.role === 'user',
    queryKey: userQueryKeys.currentMentor(),
    queryFn: () => getCurrentUserMentor(auth.transport),
  })
}

export function useUserReferralsQuery(query: UserReferralsQuery) {
  const auth = useAuth()
  return useQuery({
    queryKey: userQueryKeys.referrals(query),
    queryFn: () => getUserReferrals(auth.transport, query),
  })
}

export function useQuestionnaireQuery(enabled = true) {
  const auth = useAuth()
  return useQuery({
    enabled,
    queryKey: userQueryKeys.questionnaire(),
    queryFn: () => getQuestionnaire(auth.transport),
  })
}

export function usePutQuestionnaireMutation() {
  const auth = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: PutQuestionnaireRequest) =>
      putQuestionnaire(auth.transport, input),
    onSuccess: (response) => {
      queryClient.setQueryData(userQueryKeys.questionnaire(), response)
      queryClient.setQueryData<MeResponse>(authQueryKeys.me(), (current) => {
        if (!current) return current
        return {
          user: {
            ...current.user,
            questionnaireCompleted: response.completed,
          },
        }
      })
    },
  })
}

export function useStartTelegramLinkMutation() {
  const auth = useAuth()
  return useMutation({
    mutationFn: (input: TelegramLinkRequest) =>
      startTelegramLink(auth.transport, input),
  })
}
