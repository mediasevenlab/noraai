import {
  connectCurrentUserToMentorRequestSchema,
  currentUserMentorResponseSchema,
  deleteMentorPlanResponseSchema,
  forgetRationParamsSchema,
  mentorUserMutationResponseSchema,
  putQuestionnaireRequestSchema,
  questionnaireResponseSchema,
  telegramLinkRequestSchema,
  telegramLinkResponseSchema,
  updateProfileRequestSchema,
  type ConnectCurrentUserToMentorRequest,
  type PutQuestionnaireRequest,
  type TelegramLinkRequest,
  type UserReferralsQuery,
  userReferralsQuerySchema,
  userReferralsResponseSchema,
  updateProfileResponseSchema,
  type UpdateProfileRequest,
} from '@web-app-demo/contracts'

import { getUserFavorites, putUserFavorites } from '@/platform/account-favorites'
import { getUserPlanLibrary, putUserPlanLibrary } from '@/platform/account-plan-library'
import type { AuthenticatedTransport } from '@/platform/api'

export { getUserFavorites, putUserFavorites, getUserPlanLibrary, putUserPlanLibrary }

export function updateProfile(
  transport: AuthenticatedTransport,
  input: UpdateProfileRequest,
) {
  return transport.request(
    '/api/users/me',
    updateProfileResponseSchema,
    {
      method: 'PATCH',
      body: updateProfileRequestSchema.parse(input),
    },
  )
}

export function connectCurrentUserToMentor(
  transport: AuthenticatedTransport,
  input: ConnectCurrentUserToMentorRequest,
) {
  return transport.request(
    '/api/users/me/mentor',
    mentorUserMutationResponseSchema,
    {
      method: 'POST',
      body: connectCurrentUserToMentorRequestSchema.parse(input),
    },
  )
}

export function getCurrentUserMentor(transport: AuthenticatedTransport) {
  return transport.request('/api/users/me/mentor', currentUserMentorResponseSchema)
}

export function getUserReferrals(
  transport: AuthenticatedTransport,
  input: UserReferralsQuery,
) {
  const query = userReferralsQuerySchema.parse(input)
  const search = new URLSearchParams({
    page: String(query.page),
    pageSize: String(query.pageSize),
  })
  if (query.q) search.set('q', query.q)
  return transport.request(`/api/users/me/referrals?${search}`, userReferralsResponseSchema)
}

export function getQuestionnaire(transport: AuthenticatedTransport) {
  return transport.request('/api/users/me/questionnaire', questionnaireResponseSchema)
}

export function putQuestionnaire(
  transport: AuthenticatedTransport,
  input: PutQuestionnaireRequest,
) {
  return transport.request(
    '/api/users/me/questionnaire',
    questionnaireResponseSchema,
    {
      method: 'PUT',
      body: putQuestionnaireRequestSchema.parse(input),
    },
  )
}

export function startTelegramLink(
  transport: AuthenticatedTransport,
  input: TelegramLinkRequest,
) {
  return transport.request(
    '/api/users/me/telegram-link',
    telegramLinkResponseSchema,
    {
      method: 'POST',
      body: telegramLinkRequestSchema.parse(input),
    },
  )
}

export function forgetMyRation(transport: AuthenticatedTransport, planId: string) {
  const params = forgetRationParamsSchema.parse({ planId })
  return transport.request(
    `/api/users/me/plans/${encodeURIComponent(params.planId)}`,
    deleteMentorPlanResponseSchema,
    { method: 'DELETE' },
  )
}
