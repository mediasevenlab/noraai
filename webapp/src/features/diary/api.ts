import {
  createUserMealResponseSchema,
  deleteMealResponseSchema,
  likeRationRequestSchema,
  listMealsResponseSchema,
  listSharedRationsResponseSchema,
  mealComposerTurnResponseSchema,
  mealMutationResponseSchema,
  mealsTranscribeResponseSchema,
  setMealPlanDoneRequestSchema,
  shareRationRequestSchema,
  sharedRationMutationResponseSchema,
  type CreateUserMealRequest,
  type CreateUserMealResponse,
  type DeleteMealResponse,
  type LikeRationRequest,
  type ListMealsResponse,
  type ListSharedRationsResponse,
  type MealComposerTurnRequest,
  type MealComposerTurnResponse,
  type MealMutationResponse,
  type MealsTranscribeResponse,
  type RefineMealRequest,
  type SelectMealVersionRequest,
  type SetMealPlanDoneRequest,
  type ShareMealRequest,
  type ShareRationRequest,
  type SharedRationMutationResponse,
  type LikeMealRequest,
  type UserFavorites,
  userFavoritesSchema,
} from '@web-app-demo/contracts'

import type { AuthenticatedTransport } from '@/platform/api'

export function listMyMeals(transport: AuthenticatedTransport): Promise<ListMealsResponse> {
  return transport.request('/api/users/me/meals', listMealsResponseSchema)
}

export function listMentorUserFavorites(
  transport: AuthenticatedTransport,
  userId: string,
): Promise<UserFavorites> {
  return transport.request(
    `/api/mentor/users/${encodeURIComponent(userId)}/favorites`,
    userFavoritesSchema,
  )
}

export function listMentorUserMeals(
  transport: AuthenticatedTransport,
  userId: string,
): Promise<ListMealsResponse> {
  return transport.request(
    `/api/mentor/users/${encodeURIComponent(userId)}/meals`,
    listMealsResponseSchema,
  )
}

export function createMyMeal(
  transport: AuthenticatedTransport,
  body: CreateUserMealRequest,
): Promise<CreateUserMealResponse> {
  return transport.request('/api/users/me/meals', createUserMealResponseSchema, {
    method: 'POST',
    body,
  })
}

export function createMentorUserMeal(
  transport: AuthenticatedTransport,
  userId: string,
  body: CreateUserMealRequest,
): Promise<CreateUserMealResponse> {
  return transport.request(
    `/api/mentor/users/${encodeURIComponent(userId)}/meals`,
    createUserMealResponseSchema,
    { method: 'POST', body },
  )
}

export function refineMyMeal(
  transport: AuthenticatedTransport,
  mealId: string,
  body: RefineMealRequest,
): Promise<MealMutationResponse> {
  return transport.request(
    `/api/users/me/meals/${encodeURIComponent(mealId)}/refine`,
    mealMutationResponseSchema,
    { method: 'POST', body },
  )
}

export function refineMentorUserMeal(
  transport: AuthenticatedTransport,
  userId: string,
  mealId: string,
  body: RefineMealRequest,
): Promise<MealMutationResponse> {
  return transport.request(
    `/api/mentor/users/${encodeURIComponent(userId)}/meals/${encodeURIComponent(mealId)}/refine`,
    mealMutationResponseSchema,
    { method: 'POST', body },
  )
}

export function transcribeMyVoice(
  transport: AuthenticatedTransport,
  body: { audioBase64: string; audioMime?: string },
): Promise<MealsTranscribeResponse> {
  return transport.request('/api/users/me/meals/transcribe', mealsTranscribeResponseSchema, {
    method: 'POST',
    body,
  })
}

export function getMealComposerSnapshot(
  transport: AuthenticatedTransport,
): Promise<MealComposerTurnResponse> {
  return transport.request('/api/users/me/meals/composer', mealComposerTurnResponseSchema)
}

export function postMealComposerTurn(
  transport: AuthenticatedTransport,
  body: MealComposerTurnRequest,
): Promise<MealComposerTurnResponse> {
  return transport.request('/api/users/me/meals/composer', mealComposerTurnResponseSchema, {
    method: 'POST',
    body,
  })
}

export function selectMyMealVersion(
  transport: AuthenticatedTransport,
  mealId: string,
  body: SelectMealVersionRequest,
): Promise<MealMutationResponse> {
  return transport.request(
    `/api/users/me/meals/${encodeURIComponent(mealId)}/select-version`,
    mealMutationResponseSchema,
    { method: 'POST', body },
  )
}

export function selectMentorUserMealVersion(
  transport: AuthenticatedTransport,
  userId: string,
  mealId: string,
  body: SelectMealVersionRequest,
): Promise<MealMutationResponse> {
  return transport.request(
    `/api/mentor/users/${encodeURIComponent(userId)}/meals/${encodeURIComponent(mealId)}/select-version`,
    mealMutationResponseSchema,
    { method: 'POST', body },
  )
}

export function listSharedMeals(transport: AuthenticatedTransport): Promise<ListMealsResponse> {
  return transport.request('/api/meals/shared', listMealsResponseSchema)
}

export function shareMyMeal(
  transport: AuthenticatedTransport,
  mealId: string,
  body: ShareMealRequest,
): Promise<MealMutationResponse> {
  return transport.request(
    `/api/users/me/meals/${encodeURIComponent(mealId)}/share`,
    mealMutationResponseSchema,
    { method: 'PATCH', body },
  )
}

export function setMyMealPlanDone(
  transport: AuthenticatedTransport,
  mealId: string,
  body: SetMealPlanDoneRequest,
): Promise<MealMutationResponse> {
  return transport.request(
    `/api/users/me/meals/${encodeURIComponent(mealId)}/plan-done`,
    mealMutationResponseSchema,
    { method: 'PATCH', body: setMealPlanDoneRequestSchema.parse(body) },
  )
}

export function likeSharedMeal(
  transport: AuthenticatedTransport,
  mealId: string,
  body: LikeMealRequest,
): Promise<MealMutationResponse> {
  return transport.request(
    `/api/meals/${encodeURIComponent(mealId)}/like`,
    mealMutationResponseSchema,
    { method: 'PATCH', body },
  )
}

export function listSharedRations(
  transport: AuthenticatedTransport,
): Promise<ListSharedRationsResponse> {
  return transport.request('/api/plans/shared', listSharedRationsResponseSchema)
}

export function shareMyRation(
  transport: AuthenticatedTransport,
  planId: string,
  body: ShareRationRequest,
): Promise<SharedRationMutationResponse> {
  return transport.request(
    `/api/users/me/plans/${encodeURIComponent(planId)}/share`,
    sharedRationMutationResponseSchema,
    { method: 'PATCH', body: shareRationRequestSchema.parse(body) },
  )
}

export function likeSharedRation(
  transport: AuthenticatedTransport,
  rationId: string,
  body: LikeRationRequest,
): Promise<SharedRationMutationResponse> {
  return transport.request(
    `/api/plans/${encodeURIComponent(rationId)}/like`,
    sharedRationMutationResponseSchema,
    { method: 'PATCH', body: likeRationRequestSchema.parse(body) },
  )
}

export function deleteMyMeal(
  transport: AuthenticatedTransport,
  mealId: string,
): Promise<DeleteMealResponse> {
  return transport.request(
    `/api/users/me/meals/${encodeURIComponent(mealId)}`,
    deleteMealResponseSchema,
    { method: 'DELETE' },
  )
}
