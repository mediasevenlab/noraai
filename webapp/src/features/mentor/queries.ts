import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useRef } from 'react'
import type {
  MentorUnreadMealsResponse,
  MentorUsersQuery,
  PutQuestionnaireRequest,
  UpsertMentorPlanRequest,
} from '@web-app-demo/contracts'

import { useAuth } from '@/features/auth'
import {
  createMentorPlan,
  deleteMentorPlan,
  detachMentorUser,
  getCurrentUserPlans,
  getMentorUserPlanLibrary,
  getMentorUserPlans,
  getMentorUserQuestionnaire,
  getMentorUsers,
  getMentorUnreadMeals,
  listMentorPlans,
  markMentorMealsViewed,
  putMentorUserQuestionnaire,
  updateMentorPlan,
} from './api'

export const mentorQueryKeys = {
  all: ['session', 'mentor'] as const,
  users: (query: MentorUsersQuery) =>
    [...mentorQueryKeys.all, 'users', query] as const,
  unreadMeals: () => [...mentorQueryKeys.all, 'unread-meals'] as const,
  questionnaire: (userId: string) =>
    [...mentorQueryKeys.all, 'questionnaire', userId] as const,
  planLibrary: (userId: string) =>
    [...mentorQueryKeys.all, 'plan-library', userId] as const,
  plans: () => [...mentorQueryKeys.all, 'plans'] as const,
}

export const planAssignmentQueryKey = (
  scope: 'mentor' | 'user',
  userId: string,
) => ['session', 'plans', scope, userId] as const

export function useMentorUsersQuery(query: MentorUsersQuery, enabled = true) {
  const auth = useAuth()
  return useQuery({
    enabled,
    queryKey: mentorQueryKeys.users(query),
    queryFn: () => getMentorUsers(auth.transport, query),
  })
}

export function useMentorUnreadMealsQuery(enabled = true) {
  const auth = useAuth()
  return useQuery({
    enabled: enabled && auth.user?.role === 'mentor',
    queryKey: mentorQueryKeys.unreadMeals(),
    queryFn: () => getMentorUnreadMeals(auth.transport),
    refetchInterval: 15_000,
    refetchOnWindowFocus: true,
  })
}

const MENTOR_VIEWED_CHUNK = 40

export function useMarkMentorMealsViewedMutation() {
  const auth = useAuth()
  const queryClient = useQueryClient()
  const sentByUserRef = useRef(new Map<string, Set<string>>())
  const inflightRef = useRef(new Set<string>())
  return useMutation({
    mutationFn: async ({ userId, mealIds }: { userId: string; mealIds: string[] }) => {
      const sent = sentByUserRef.current.get(userId) ?? new Set<string>()
      const unique = [...new Set(mealIds)].filter((id) => {
        const key = `${userId}:${id}`
        return !sent.has(id) && !inflightRef.current.has(key)
      })
      if (unique.length === 0) {
        const cached = queryClient.getQueryData<MentorUnreadMealsResponse>(
          mentorQueryKeys.unreadMeals(),
        )
        return {
          ok: true as const,
          viewedMealIds: [] as string[],
          unreadCount: cached?.items.find((item) => item.userId === userId)?.unreadCount ?? 0,
        }
      }
      for (const id of unique) inflightRef.current.add(`${userId}:${id}`)
      try {
        let viewedMealIds: string[] = []
        let unreadCount = 0
        for (let index = 0; index < unique.length; index += MENTOR_VIEWED_CHUNK) {
          const chunk = unique.slice(index, index + MENTOR_VIEWED_CHUNK)
          const result = await markMentorMealsViewed(auth.transport, userId, chunk)
          viewedMealIds = viewedMealIds.concat(result.viewedMealIds)
          unreadCount = result.unreadCount
        }
        for (const id of viewedMealIds) sent.add(id)
        sentByUserRef.current.set(userId, sent)
        return { ok: true as const, viewedMealIds, unreadCount }
      } finally {
        for (const id of unique) inflightRef.current.delete(`${userId}:${id}`)
      }
    },
    onSuccess: (data, variables) => {
      queryClient.setQueryData<MentorUnreadMealsResponse>(
        mentorQueryKeys.unreadMeals(),
        (current) => {
          if (!current) return current
          return {
            items: current.items.map((item) =>
              item.userId === variables.userId
                ? { ...item, unreadCount: data.unreadCount }
                : item,
            ),
          }
        },
      )
    },
  })
}

export function useDetachMentorUserMutation() {
  const auth = useAuth()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (userId: string) => detachMentorUser(auth.transport, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [...mentorQueryKeys.all, 'users'],
      })
      queryClient.invalidateQueries({ queryKey: mentorQueryKeys.unreadMeals() })
    },
  })
}

export function useMentorUserPlanLibraryQuery(userId: string, enabled = true) {
  const auth = useAuth()
  return useQuery({
    enabled: enabled && Boolean(userId),
    queryKey: mentorQueryKeys.planLibrary(userId),
    queryFn: () => getMentorUserPlanLibrary(auth.transport, userId),
  })
}

export function useMentorUserQuestionnaireQuery(userId: string, enabled = true) {
  const auth = useAuth()
  return useQuery({
    enabled,
    queryKey: mentorQueryKeys.questionnaire(userId),
    queryFn: () => getMentorUserQuestionnaire(auth.transport, userId),
  })
}

export function usePutMentorUserQuestionnaireMutation(userId: string) {
  const auth = useAuth()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: PutQuestionnaireRequest) =>
      putMentorUserQuestionnaire(auth.transport, userId, input),
    onSuccess: (response) => {
      queryClient.setQueryData(mentorQueryKeys.questionnaire(userId), response)
    },
  })
}

export function useMentorPlansQuery(enabled = true) {
  const auth = useAuth()
  return useQuery({
    enabled: enabled && auth.user?.role === 'mentor',
    queryKey: mentorQueryKeys.plans(),
    queryFn: () => listMentorPlans(auth.transport),
  })
}

export function useCreateMentorPlanMutation() {
  const auth = useAuth()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: UpsertMentorPlanRequest) =>
      createMentorPlan(auth.transport, input),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: mentorQueryKeys.plans() }),
  })
}

export function useUpdateMentorPlanMutation() {
  const auth = useAuth()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: { planId: string; body: UpsertMentorPlanRequest }) =>
      updateMentorPlan(auth.transport, input.planId, input.body),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: mentorQueryKeys.plans() }),
  })
}

export function useDeleteMentorPlanMutation() {
  const auth = useAuth()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (planId: string) => deleteMentorPlan(auth.transport, planId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: mentorQueryKeys.plans() })
      await queryClient.invalidateQueries({ queryKey: ['session', 'plans'] })
      await queryClient.invalidateQueries({ queryKey: ['session', 'meals'] })
      await queryClient.invalidateQueries({ queryKey: ['session', 'plan-library'] })
    },
  })
}

export function usePlanAssignmentQuery(
  userId: string,
  mentorView: boolean,
  enabled = true,
) {
  const auth = useAuth()
  return useQuery({
    enabled: enabled && Boolean(userId),
    queryKey: planAssignmentQueryKey(mentorView ? 'mentor' : 'user', userId),
    queryFn: () =>
      mentorView
        ? getMentorUserPlans(auth.transport, userId)
        : getCurrentUserPlans(auth.transport),
  })
}
