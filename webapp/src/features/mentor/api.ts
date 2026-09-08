import {
  deleteMentorPlanResponseSchema,
  mentorPlanMutationResponseSchema,
  mentorPlanParamsSchema,
  mentorPlansResponseSchema,
  mentorUserMutationResponseSchema,
  mentorUsersQuerySchema,
  mentorUsersResponseSchema,
  mentorUnreadMealsResponseSchema,
  markMentorMealsViewedRequestSchema,
  markMentorMealsViewedResponseSchema,
  putPlanAssignmentRequestSchema,
  putQuestionnaireRequestSchema,
  questionnaireResponseSchema,
  planAssignmentSchema,
  upsertMentorPlanRequestSchema,
  type MentorUsersQuery,
  type PutPlanAssignmentRequest,
  type PutQuestionnaireRequest,
  type UpsertMentorPlanRequest,
} from '@web-app-demo/contracts'

import type { AuthenticatedTransport } from '@/platform/api'

export function getMentorUsers(
  transport: AuthenticatedTransport,
  input: MentorUsersQuery,
) {
  const query = mentorUsersQuerySchema.parse(input)
  const search = new URLSearchParams({
    page: String(query.page),
    pageSize: String(query.pageSize),
  })
  if (query.q) search.set('q', query.q)
  return transport.request(`/api/mentor/users?${search}`, mentorUsersResponseSchema)
}

export function getMentorUnreadMeals(transport: AuthenticatedTransport) {
  return transport.request('/api/mentor/unread-meals', mentorUnreadMealsResponseSchema)
}

export function markMentorMealsViewed(
  transport: AuthenticatedTransport,
  userId: string,
  mealIds: string[],
) {
  return transport.request(
    `/api/mentor/users/${encodeURIComponent(userId)}/meals-viewed`,
    markMentorMealsViewedResponseSchema,
    {
      method: 'POST',
      body: markMentorMealsViewedRequestSchema.parse({ mealIds }),
    },
  )
}

export function detachMentorUser(
  transport: AuthenticatedTransport,
  userId: string,
) {
  return transport.request(
    `/api/mentor/users/${encodeURIComponent(userId)}`,
    mentorUserMutationResponseSchema,
    { method: 'DELETE' },
  )
}

export function getMentorUserQuestionnaire(
  transport: AuthenticatedTransport,
  userId: string,
) {
  return transport.request(
    `/api/mentor/users/${encodeURIComponent(userId)}/questionnaire`,
    questionnaireResponseSchema,
  )
}

export function putMentorUserQuestionnaire(
  transport: AuthenticatedTransport,
  userId: string,
  input: PutQuestionnaireRequest,
) {
  return transport.request(
    `/api/mentor/users/${encodeURIComponent(userId)}/questionnaire`,
    questionnaireResponseSchema,
    {
      method: 'PUT',
      body: putQuestionnaireRequestSchema.parse(input),
    },
  )
}

export function listMentorPlans(transport: AuthenticatedTransport) {
  return transport.request('/api/mentor/plans', mentorPlansResponseSchema)
}

export function createMentorPlan(
  transport: AuthenticatedTransport,
  input: UpsertMentorPlanRequest,
) {
  return transport.request(
    '/api/mentor/plans',
    mentorPlanMutationResponseSchema,
    {
      method: 'POST',
      body: upsertMentorPlanRequestSchema.parse(input),
    },
  )
}

export function updateMentorPlan(
  transport: AuthenticatedTransport,
  planId: string,
  input: UpsertMentorPlanRequest,
) {
  const params = mentorPlanParamsSchema.parse({ planId })
  return transport.request(
    `/api/mentor/plans/${encodeURIComponent(params.planId)}`,
    mentorPlanMutationResponseSchema,
    {
      method: 'PUT',
      body: upsertMentorPlanRequestSchema.parse(input),
    },
  )
}

export function deleteMentorPlan(
  transport: AuthenticatedTransport,
  planId: string,
) {
  const params = mentorPlanParamsSchema.parse({ planId })
  return transport.request(
    `/api/mentor/plans/${encodeURIComponent(params.planId)}`,
    deleteMentorPlanResponseSchema,
    { method: 'DELETE' },
  )
}

export function getCurrentUserPlans(transport: AuthenticatedTransport) {
  return transport.request('/api/users/me/plans', planAssignmentSchema)
}

export function getMentorUserPlans(
  transport: AuthenticatedTransport,
  userId: string,
) {
  return transport.request(
    `/api/mentor/users/${encodeURIComponent(userId)}/plans`,
    planAssignmentSchema,
  )
}

export function putMentorUserPlans(
  transport: AuthenticatedTransport,
  userId: string,
  input: PutPlanAssignmentRequest,
) {
  return transport.request(
    `/api/mentor/users/${encodeURIComponent(userId)}/plans`,
    planAssignmentSchema,
    {
      method: 'PUT',
      body: putPlanAssignmentRequestSchema.parse(input),
    },
  )
}
