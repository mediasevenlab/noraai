import {
  adminDashboardResponseSchema,
  adminUserParamsSchema,
  adminUsersQuerySchema,
  adminUsersResponseSchema,
  apiErrorSchema,
  deleteAdminUserResponseSchema,
  connectCurrentUserToMentorRequestSchema,
  currentUserMentorResponseSchema,
  deleteMentorPlanResponseSchema,
  forgetRationParamsSchema,
  mentorPlanMutationResponseSchema,
  mentorPlanParamsSchema,
  mentorPlansResponseSchema,
  mentorUserMutationResponseSchema,
  mentorUsersQuerySchema,
  mentorUsersResponseSchema,
  planAssignmentSchema,
  putPlanAssignmentRequestSchema,
  putQuestionnaireRequestSchema,
  payoutAccrualResponseSchema,
  putUserFavoritesRequestSchema,
  putUserPlanLibraryRequestSchema,
  questionnaireResponseSchema,
  shareRationParamsSchema,
  shareRationRequestSchema,
  sharedRationMutationResponseSchema,
  sharedRationParamsSchema,
  likeRationRequestSchema,
  listSharedRationsResponseSchema,
  telegramLinkRequestSchema,
  telegramLinkResponseSchema,
  upsertMentorPlanRequestSchema,
  userFavoritesSchema,
  userPlanLibrarySchema,
  updateProfileRequestSchema,
  updateProfileResponseSchema,
  updateUserRoleRequestSchema,
  updateUserRoleResponseSchema,
  userReferralsQuerySchema,
  userReferralsResponseSchema,
} from '@web-app-demo/contracts'
import { createRoute, OpenAPIHono } from '@hono/zod-openapi'
import type { MiddlewareHandler } from 'hono'

import { validationErrorHook } from '../../../http/errors'
import type { AuthHttpEnv } from '../../auth'
import type { UsersService } from '../application/users-service'
import { executeUsers } from './errors'

const errorContent = {
  'application/json': {
    schema: apiErrorSchema,
  },
}

const bearerSecurity = [{ BearerAuth: [] }]

const updateProfileRoute = createRoute({
  method: 'patch',
  path: '/me',
  security: bearerSecurity,
  request: {
    body: {
      content: {
        'application/json': {
          schema: updateProfileRequestSchema,
        },
      },
    },
  },
  responses: {
    200: {
      content: { 'application/json': { schema: updateProfileResponseSchema } },
      description: 'Updated current user profile',
    },
    400: { content: errorContent, description: 'Invalid payload' },
    401: { content: errorContent, description: 'Authentication required' },
    409: { content: errorContent, description: 'Nickname already taken' },
    413: { content: errorContent, description: 'Request body is too large' },
    429: { content: errorContent, description: 'Too many requests' },
  },
})

const getQuestionnaireRoute = createRoute({
  method: 'get',
  path: '/me/questionnaire',
  security: bearerSecurity,
  responses: {
    200: {
      content: { 'application/json': { schema: questionnaireResponseSchema } },
      description: 'Current user questionnaire',
    },
    401: { content: errorContent, description: 'Authentication required' },
    403: { content: errorContent, description: 'User access required' },
  },
})

const putQuestionnaireRoute = createRoute({
  method: 'put',
  path: '/me/questionnaire',
  security: bearerSecurity,
  request: {
    body: {
      content: {
        'application/json': {
          schema: putQuestionnaireRequestSchema,
        },
      },
    },
  },
  responses: {
    200: {
      content: { 'application/json': { schema: questionnaireResponseSchema } },
      description: 'Saved current user questionnaire',
    },
    400: { content: errorContent, description: 'Invalid payload' },
    401: { content: errorContent, description: 'Authentication required' },
    403: { content: errorContent, description: 'User access required' },
    413: { content: errorContent, description: 'Request body is too large' },
    429: { content: errorContent, description: 'Too many requests' },
  },
})

const connectCurrentUserToMentorRoute = createRoute({
  method: 'post',
  path: '/me/mentor',
  security: bearerSecurity,
  request: {
    body: {
      content: {
        'application/json': {
          schema: connectCurrentUserToMentorRequestSchema,
        },
      },
    },
  },
  responses: {
    200: {
      content: { 'application/json': { schema: mentorUserMutationResponseSchema } },
      description: 'Connected current user to mentor',
    },
    400: { content: errorContent, description: 'Invalid identifier' },
    401: { content: errorContent, description: 'Authentication required' },
    403: { content: errorContent, description: 'User access required' },
    404: { content: errorContent, description: 'Mentor not found' },
    409: { content: errorContent, description: 'User is already connected' },
    413: { content: errorContent, description: 'Request body is too large' },
    429: { content: errorContent, description: 'Too many requests' },
  },
})

const currentUserMentorRoute = createRoute({
  method: 'get',
  path: '/me/mentor',
  security: bearerSecurity,
  responses: {
    200: {
      content: { 'application/json': { schema: currentUserMentorResponseSchema } },
      description: 'Current user mentor',
    },
    401: { content: errorContent, description: 'Authentication required' },
    403: { content: errorContent, description: 'User access required' },
  },
})

const getCurrentUserFavoritesRoute = createRoute({
  method: 'get',
  path: '/me/favorites',
  security: bearerSecurity,
  responses: {
    200: {
      content: { 'application/json': { schema: userFavoritesSchema } },
      description: 'Current user saved meals',
    },
    401: { content: errorContent, description: 'Authentication required' },
  },
})

const putCurrentUserFavoritesRoute = createRoute({
  method: 'put',
  path: '/me/favorites',
  security: bearerSecurity,
  request: {
    body: {
      content: {
        'application/json': {
          schema: putUserFavoritesRequestSchema,
        },
      },
    },
  },
  responses: {
    200: {
      content: { 'application/json': { schema: userFavoritesSchema } },
      description: 'Saved current user favorites',
    },
    400: { content: errorContent, description: 'Invalid payload' },
    401: { content: errorContent, description: 'Authentication required' },
    404: { content: errorContent, description: 'Favorites are unavailable' },
    413: { content: errorContent, description: 'Request body is too large' },
    429: { content: errorContent, description: 'Too many requests' },
  },
})

const getCurrentUserPlanLibraryRoute = createRoute({
  method: 'get',
  path: '/me/plan-library',
  security: bearerSecurity,
  responses: {
    200: {
      content: { 'application/json': { schema: userPlanLibrarySchema } },
      description: 'Current user authored plans, plan favorites and selection',
    },
    401: { content: errorContent, description: 'Authentication required' },
  },
})

const putCurrentUserPlanLibraryRoute = createRoute({
  method: 'put',
  path: '/me/plan-library',
  security: bearerSecurity,
  request: {
    body: {
      content: {
        'application/json': {
          schema: putUserPlanLibraryRequestSchema,
        },
      },
    },
  },
  responses: {
    200: {
      content: { 'application/json': { schema: userPlanLibrarySchema } },
      description: 'Saved current user plan library',
    },
    400: { content: errorContent, description: 'Invalid payload' },
    401: { content: errorContent, description: 'Authentication required' },
    404: { content: errorContent, description: 'Plan library is unavailable' },
    413: { content: errorContent, description: 'Request body is too large' },
    429: { content: errorContent, description: 'Too many requests' },
  },
})

const shareMyRationRoute = createRoute({
  method: 'patch',
  path: '/me/plans/{planId}/share',
  security: bearerSecurity,
  request: {
    params: shareRationParamsSchema,
    body: {
      content: {
        'application/json': {
          schema: shareRationRequestSchema,
        },
      },
    },
  },
  responses: {
    200: {
      content: { 'application/json': { schema: sharedRationMutationResponseSchema } },
      description: 'Ration share updated',
    },
    400: { content: errorContent, description: 'Invalid payload' },
    401: { content: errorContent, description: 'Authentication required' },
    403: { content: errorContent, description: 'Forbidden' },
    404: { content: errorContent, description: 'Plan not found' },
  },
})

const listSharedRationsRoute = createRoute({
  method: 'get',
  path: '/shared',
  security: bearerSecurity,
  responses: {
    200: {
      content: { 'application/json': { schema: listSharedRationsResponseSchema } },
      description: 'Public shared rations',
    },
    401: { content: errorContent, description: 'Authentication required' },
  },
})

const likeSharedRationRoute = createRoute({
  method: 'patch',
  path: '/{rationId}/like',
  security: bearerSecurity,
  request: {
    params: sharedRationParamsSchema,
    body: {
      content: {
        'application/json': {
          schema: likeRationRequestSchema,
        },
      },
    },
  },
  responses: {
    200: {
      content: { 'application/json': { schema: sharedRationMutationResponseSchema } },
      description: 'Ration like updated',
    },
    401: { content: errorContent, description: 'Authentication required' },
    403: { content: errorContent, description: 'Forbidden' },
    404: { content: errorContent, description: 'Ration not found' },
  },
})

const telegramLinkRoute = createRoute({
  method: 'post',
  path: '/me/telegram-link',
  security: bearerSecurity,
  request: {
    body: {
      content: {
        'application/json': {
          schema: telegramLinkRequestSchema,
        },
      },
    },
  },
  responses: {
    200: {
      content: { 'application/json': { schema: telegramLinkResponseSchema } },
      description: 'Started Telegram identity challenge',
    },
    400: { content: errorContent, description: 'Invalid payload' },
    401: { content: errorContent, description: 'Authentication required' },
    409: { content: errorContent, description: 'Telegram identity already taken' },
    413: { content: errorContent, description: 'Request body is too large' },
    429: { content: errorContent, description: 'Too many requests' },
  },
})

const getCurrentUserPlansRoute = createRoute({
  method: 'get',
  path: '/me/plans',
  security: bearerSecurity,
  responses: {
    200: {
      content: { 'application/json': { schema: planAssignmentSchema } },
      description: 'Assigned plans for the current user',
    },
    401: { content: errorContent, description: 'Authentication required' },
  },
})

const userReferralsRoute = createRoute({
  method: 'get',
  path: '/me/referrals',
  security: bearerSecurity,
  request: { query: userReferralsQuerySchema },
  responses: {
    200: {
      content: { 'application/json': { schema: userReferralsResponseSchema } },
      description: 'Direct referrals of current user',
    },
    400: { content: errorContent, description: 'Invalid query' },
    401: { content: errorContent, description: 'Authentication required' },
    403: { content: errorContent, description: 'User access required' },
  },
})

const payoutAccrualRoute = createRoute({
  method: 'get',
  path: '/me/payout-accrual',
  security: bearerSecurity,
  responses: {
    200: {
      content: { 'application/json': { schema: payoutAccrualResponseSchema } },
      description: 'Bonus accrued from confirmed subscription payments',
    },
    401: { content: errorContent, description: 'Authentication required' },
    403: { content: errorContent, description: 'User or mentor access required' },
  },
})

const dashboardRoute = createRoute({
  method: 'get',
  path: '/dashboard',
  security: bearerSecurity,
  responses: {
    200: {
      content: { 'application/json': { schema: adminDashboardResponseSchema } },
      description: 'Administrator dashboard metrics',
    },
    401: { content: errorContent, description: 'Authentication required' },
    403: { content: errorContent, description: 'Administrator access required' },
  },
})

const listUsersRoute = createRoute({
  method: 'get',
  path: '/users',
  security: bearerSecurity,
  request: {
    query: adminUsersQuerySchema,
  },
  responses: {
    200: {
      content: { 'application/json': { schema: adminUsersResponseSchema } },
      description: 'Paginated users',
    },
    400: { content: errorContent, description: 'Invalid query' },
    401: { content: errorContent, description: 'Authentication required' },
    403: { content: errorContent, description: 'Administrator access required' },
  },
})

const updateRoleRoute = createRoute({
  method: 'patch',
  path: '/users/{userId}/role',
  security: bearerSecurity,
  request: {
    params: adminUserParamsSchema,
    body: {
      content: {
        'application/json': {
          schema: updateUserRoleRequestSchema,
        },
      },
    },
  },
  responses: {
    200: {
      content: { 'application/json': { schema: updateUserRoleResponseSchema } },
      description: 'Updated user role',
    },
    400: { content: errorContent, description: 'Invalid payload' },
    401: { content: errorContent, description: 'Authentication required' },
    403: { content: errorContent, description: 'Administrator access required' },
    404: { content: errorContent, description: 'User not found' },
    409: { content: errorContent, description: 'Role update conflict' },
    413: { content: errorContent, description: 'Request body is too large' },
    429: { content: errorContent, description: 'Too many requests' },
  },
})

const deleteUserRoute = createRoute({
  method: 'delete',
  path: '/users/{userId}',
  security: bearerSecurity,
  request: {
    params: adminUserParamsSchema,
  },
  responses: {
    200: {
      content: { 'application/json': { schema: deleteAdminUserResponseSchema } },
      description: 'Deleted user',
    },
    400: { content: errorContent, description: 'Invalid user id' },
    401: { content: errorContent, description: 'Authentication required' },
    403: { content: errorContent, description: 'Administrator access required' },
    404: { content: errorContent, description: 'User not found' },
    409: { content: errorContent, description: 'User deletion conflict' },
    429: { content: errorContent, description: 'Too many requests' },
  },
})

const listMentorUsersRoute = createRoute({
  method: 'get',
  path: '/users',
  security: bearerSecurity,
  request: { query: mentorUsersQuerySchema },
  responses: {
    200: {
      content: { 'application/json': { schema: mentorUsersResponseSchema } },
      description: 'Users connected to the current mentor',
    },
    400: { content: errorContent, description: 'Invalid query' },
    401: { content: errorContent, description: 'Authentication required' },
    403: { content: errorContent, description: 'Mentor access required' },
  },
})

const detachMentorUserRoute = createRoute({
  method: 'delete',
  path: '/users/{userId}',
  security: bearerSecurity,
  request: { params: adminUserParamsSchema },
  responses: {
    200: {
      content: { 'application/json': { schema: mentorUserMutationResponseSchema } },
      description: 'Disconnected user from current mentor',
    },
    400: { content: errorContent, description: 'Invalid user id' },
    401: { content: errorContent, description: 'Authentication required' },
    403: { content: errorContent, description: 'Mentor access required' },
    404: { content: errorContent, description: 'Connected user not found' },
    429: { content: errorContent, description: 'Too many requests' },
  },
})

const getMentorUserQuestionnaireRoute = createRoute({
  method: 'get',
  path: '/users/{userId}/questionnaire',
  security: bearerSecurity,
  request: { params: adminUserParamsSchema },
  responses: {
    200: {
      content: { 'application/json': { schema: questionnaireResponseSchema } },
      description: 'Questionnaire for a connected mentee',
    },
    400: { content: errorContent, description: 'Invalid user id' },
    401: { content: errorContent, description: 'Authentication required' },
    403: { content: errorContent, description: 'Mentor access required' },
    404: { content: errorContent, description: 'Connected user not found' },
  },
})

const putMentorUserQuestionnaireRoute = createRoute({
  method: 'put',
  path: '/users/{userId}/questionnaire',
  security: bearerSecurity,
  request: {
    params: adminUserParamsSchema,
    body: {
      content: {
        'application/json': {
          schema: putQuestionnaireRequestSchema,
        },
      },
    },
  },
  responses: {
    200: {
      content: { 'application/json': { schema: questionnaireResponseSchema } },
      description: 'Saved questionnaire for a connected mentee',
    },
    400: { content: errorContent, description: 'Invalid payload' },
    401: { content: errorContent, description: 'Authentication required' },
    403: { content: errorContent, description: 'Mentor access required' },
    404: { content: errorContent, description: 'Connected user not found' },
    413: { content: errorContent, description: 'Request body is too large' },
  },
})

const listMentorPlansRoute = createRoute({
  method: 'get',
  path: '/plans',
  security: bearerSecurity,
  responses: {
    200: {
      content: { 'application/json': { schema: mentorPlansResponseSchema } },
      description: 'Authored plans of the current mentor',
    },
    401: { content: errorContent, description: 'Authentication required' },
    403: { content: errorContent, description: 'Mentor access required' },
  },
})

const createMentorPlanRoute = createRoute({
  method: 'post',
  path: '/plans',
  security: bearerSecurity,
  request: {
    body: {
      content: {
        'application/json': {
          schema: upsertMentorPlanRequestSchema,
        },
      },
    },
  },
  responses: {
    200: {
      content: { 'application/json': { schema: mentorPlanMutationResponseSchema } },
      description: 'Created authored plan',
    },
    400: { content: errorContent, description: 'Invalid payload' },
    401: { content: errorContent, description: 'Authentication required' },
    403: { content: errorContent, description: 'Mentor access required' },
    413: { content: errorContent, description: 'Request body is too large' },
  },
})

const updateMentorPlanRoute = createRoute({
  method: 'put',
  path: '/plans/{planId}',
  security: bearerSecurity,
  request: {
    params: mentorPlanParamsSchema,
    body: {
      content: {
        'application/json': {
          schema: upsertMentorPlanRequestSchema,
        },
      },
    },
  },
  responses: {
    200: {
      content: { 'application/json': { schema: mentorPlanMutationResponseSchema } },
      description: 'Updated authored plan',
    },
    400: { content: errorContent, description: 'Invalid payload' },
    401: { content: errorContent, description: 'Authentication required' },
    403: { content: errorContent, description: 'Mentor access required' },
    404: { content: errorContent, description: 'Plan not found' },
    413: { content: errorContent, description: 'Request body is too large' },
  },
})

const forgetCurrentUserRationRoute = createRoute({
  method: 'delete',
  path: '/me/plans/{planId}',
  security: bearerSecurity,
  request: { params: forgetRationParamsSchema },
  responses: {
    200: {
      content: { 'application/json': { schema: deleteMentorPlanResponseSchema } },
      description: 'Removed the ration from the current user',
    },
    400: { content: errorContent, description: 'Invalid plan id' },
    401: { content: errorContent, description: 'Authentication required' },
  },
})

const deleteMentorPlanRoute = createRoute({
  method: 'delete',
  path: '/plans/{planId}',
  security: bearerSecurity,
  request: { params: mentorPlanParamsSchema },
  responses: {
    200: {
      content: { 'application/json': { schema: deleteMentorPlanResponseSchema } },
      description: 'Deleted authored plan',
    },
    400: { content: errorContent, description: 'Invalid plan id' },
    401: { content: errorContent, description: 'Authentication required' },
    403: { content: errorContent, description: 'Mentor access required' },
    404: { content: errorContent, description: 'Plan not found' },
  },
})

const getMentorUserFavoritesRoute = createRoute({
  method: 'get',
  path: '/users/{userId}/favorites',
  security: bearerSecurity,
  request: { params: adminUserParamsSchema },
  responses: {
    200: {
      content: { 'application/json': { schema: userFavoritesSchema } },
      description: 'Saved meals of a connected mentee',
    },
    400: { content: errorContent, description: 'Invalid user id' },
    401: { content: errorContent, description: 'Authentication required' },
    403: { content: errorContent, description: 'Mentor access required' },
    404: { content: errorContent, description: 'Connected user not found' },
  },
})

const getMentorUserPlanLibraryRoute = createRoute({
  method: 'get',
  path: '/users/{userId}/plan-library',
  security: bearerSecurity,
  request: { params: adminUserParamsSchema },
  responses: {
    200: {
      content: { 'application/json': { schema: userPlanLibrarySchema } },
      description: 'Plan library of a connected mentee',
    },
    400: { content: errorContent, description: 'Invalid user id' },
    401: { content: errorContent, description: 'Authentication required' },
    403: { content: errorContent, description: 'Mentor access required' },
    404: { content: errorContent, description: 'Connected user not found' },
  },
})

const getMentorUserPlansRoute = createRoute({
  method: 'get',
  path: '/users/{userId}/plans',
  security: bearerSecurity,
  request: { params: adminUserParamsSchema },
  responses: {
    200: {
      content: { 'application/json': { schema: planAssignmentSchema } },
      description: 'Assigned plans for a connected mentee',
    },
    400: { content: errorContent, description: 'Invalid user id' },
    401: { content: errorContent, description: 'Authentication required' },
    403: { content: errorContent, description: 'Mentor access required' },
    404: { content: errorContent, description: 'Connected user not found' },
  },
})

const putMentorUserPlansRoute = createRoute({
  method: 'put',
  path: '/users/{userId}/plans',
  security: bearerSecurity,
  request: {
    params: adminUserParamsSchema,
    body: {
      content: {
        'application/json': {
          schema: putPlanAssignmentRequestSchema,
        },
      },
    },
  },
  responses: {
    200: {
      content: { 'application/json': { schema: planAssignmentSchema } },
      description: 'Saved assigned plans for a connected mentee',
    },
    400: { content: errorContent, description: 'Invalid payload' },
    401: { content: errorContent, description: 'Authentication required' },
    403: { content: errorContent, description: 'Mentor access required' },
    404: { content: errorContent, description: 'Connected user not found' },
    413: { content: errorContent, description: 'Request body is too large' },
  },
})

type CreateUsersRoutesOptions = {
  requireAdmin: MiddlewareHandler<AuthHttpEnv>
  requireAuth: MiddlewareHandler<AuthHttpEnv>
  requireMentor: MiddlewareHandler<AuthHttpEnv>
  service: UsersService
}

export function createUsersRoutes({
  requireAdmin,
  requireAuth,
  requireMentor,
  service,
}: CreateUsersRoutesOptions) {
  const userRoutes = new OpenAPIHono<AuthHttpEnv>({ defaultHook: validationErrorHook })
  const adminRoutes = new OpenAPIHono<AuthHttpEnv>({ defaultHook: validationErrorHook })
  const mentorRoutes = new OpenAPIHono<AuthHttpEnv>({ defaultHook: validationErrorHook })
  const planRoutes = new OpenAPIHono<AuthHttpEnv>({ defaultHook: validationErrorHook })

  userRoutes.use('*', requireAuth)
  userRoutes.openapi(updateProfileRoute, async (c) => {
    const result = await executeUsers(() =>
      service.updateProfile(c.var.user, c.req.valid('json')),
    )
    return c.json(result, 200)
  })
  userRoutes.openapi(telegramLinkRoute, async (c) => {
    return c.json(
      await executeUsers(() =>
        service.startTelegramLink(c.var.user, c.req.valid('json')),
      ),
      200,
    )
  })
  userRoutes.openapi(getQuestionnaireRoute, async (c) => {
    return c.json(
      await executeUsers(() => service.getQuestionnaire(c.var.user)),
      200,
    )
  })
  userRoutes.openapi(putQuestionnaireRoute, async (c) => {
    return c.json(
      await executeUsers(() =>
        service.putQuestionnaire(c.var.user, c.req.valid('json')),
      ),
      200,
    )
  })
  userRoutes.openapi(connectCurrentUserToMentorRoute, async (c) => {
    const result = await executeUsers(() =>
      service.connectCurrentUserToMentor(c.var.user, c.req.valid('json')),
    )
    return c.json(result, 200)
  })
  userRoutes.openapi(currentUserMentorRoute, async (c) => {
    return c.json(
      await executeUsers(() => service.getCurrentUserMentor(c.var.user)),
      200,
    )
  })
  userRoutes.openapi(userReferralsRoute, async (c) => {
    return c.json(
      await executeUsers(() =>
        service.listUserReferrals(c.var.user, c.req.valid('query')),
      ),
      200,
    )
  })
  userRoutes.openapi(payoutAccrualRoute, async (c) => {
    return c.json(
      await executeUsers(() => service.readPayoutAccrual(c.var.user)),
      200,
    )
  })
  userRoutes.openapi(getCurrentUserFavoritesRoute, async (c) => {
    return c.json(
      await executeUsers(() => service.getCurrentUserFavorites(c.var.user)),
      200,
    )
  })
  userRoutes.openapi(putCurrentUserFavoritesRoute, async (c) => {
    return c.json(
      await executeUsers(() =>
        service.putCurrentUserFavorites(c.var.user, c.req.valid('json')),
      ),
      200,
    )
  })
  userRoutes.openapi(getCurrentUserPlanLibraryRoute, async (c) => {
    return c.json(
      await executeUsers(() => service.getCurrentUserPlanLibrary(c.var.user)),
      200,
    )
  })
  userRoutes.openapi(putCurrentUserPlanLibraryRoute, async (c) => {
    return c.json(
      await executeUsers(() =>
        service.putCurrentUserPlanLibrary(c.var.user, c.req.valid('json')),
      ),
      200,
    )
  })
  userRoutes.openapi(forgetCurrentUserRationRoute, async (c) =>
    c.json(
      await executeUsers(() =>
        service.forgetCurrentUserRation(c.var.user, c.req.valid('param').planId),
      ),
      200,
    ),
  )
  userRoutes.openapi(shareMyRationRoute, async (c) => {
    return c.json(
      await executeUsers(() =>
        service.setRationShared(
          c.var.user,
          c.req.valid('param').planId,
          c.req.valid('json'),
        ),
      ),
      200,
    )
  })
  userRoutes.openapi(getCurrentUserPlansRoute, async (c) =>
    c.json(await executeUsers(() => service.getCurrentUserPlans(c.var.user)), 200),
  )

  adminRoutes.use('*', requireAuth)
  adminRoutes.use('*', requireAdmin)
  adminRoutes.openapi(dashboardRoute, async (c) => c.json(await service.dashboard(), 200))
  adminRoutes.openapi(listUsersRoute, async (c) => {
    return c.json(await service.listUsers(c.req.valid('query')), 200)
  })
  adminRoutes.openapi(updateRoleRoute, async (c) => {
    const result = await executeUsers(() =>
      service.updateRole(
        c.var.user,
        c.req.valid('param').userId,
        c.req.valid('json'),
      ),
    )
    return c.json(result, 200)
  })
  adminRoutes.openapi(deleteUserRoute, async (c) => {
    const result = await executeUsers(() =>
      service.deleteUser(c.var.user, c.req.valid('param').userId),
    )
    return c.json(result, 200)
  })

  mentorRoutes.use('*', requireAuth)
  mentorRoutes.use('*', requireMentor)
  mentorRoutes.openapi(listMentorUsersRoute, async (c) => {
    return c.json(
      await executeUsers(() =>
        service.listMentorUsers(c.var.user, c.req.valid('query')),
      ),
      200,
    )
  })
  mentorRoutes.openapi(detachMentorUserRoute, async (c) => {
    return c.json(
      await executeUsers(() =>
        service.detachMentorUser(c.var.user, c.req.valid('param').userId),
      ),
      200,
    )
  })
  mentorRoutes.openapi(getMentorUserQuestionnaireRoute, async (c) => {
    return c.json(
      await executeUsers(() =>
        service.getMentorUserQuestionnaire(
          c.var.user,
          c.req.valid('param').userId,
        ),
      ),
      200,
    )
  })
  mentorRoutes.openapi(putMentorUserQuestionnaireRoute, async (c) => {
    return c.json(
      await executeUsers(() =>
        service.putMentorUserQuestionnaire(
          c.var.user,
          c.req.valid('param').userId,
          c.req.valid('json'),
        ),
      ),
      200,
    )
  })
  mentorRoutes.openapi(listMentorPlansRoute, async (c) =>
    c.json(await executeUsers(() => service.listMentorPlans(c.var.user)), 200),
  )
  mentorRoutes.openapi(createMentorPlanRoute, async (c) =>
    c.json(
      await executeUsers(() => service.createMentorPlan(c.var.user, c.req.valid('json'))),
      200,
    ),
  )
  mentorRoutes.openapi(updateMentorPlanRoute, async (c) =>
    c.json(
      await executeUsers(() =>
        service.updateMentorPlan(
          c.var.user,
          c.req.valid('param').planId,
          c.req.valid('json'),
        ),
      ),
      200,
    ),
  )
  mentorRoutes.openapi(deleteMentorPlanRoute, async (c) =>
    c.json(
      await executeUsers(() =>
        service.deleteMentorPlan(c.var.user, c.req.valid('param').planId),
      ),
      200,
    ),
  )
  mentorRoutes.openapi(getMentorUserFavoritesRoute, async (c) =>
    c.json(
      await executeUsers(() =>
        service.getMentorUserFavorites(c.var.user, c.req.valid('param').userId),
      ),
      200,
    ),
  )
  mentorRoutes.openapi(getMentorUserPlanLibraryRoute, async (c) =>
    c.json(
      await executeUsers(() =>
        service.getMentorUserPlanLibrary(c.var.user, c.req.valid('param').userId),
      ),
      200,
    ),
  )
  mentorRoutes.openapi(getMentorUserPlansRoute, async (c) =>
    c.json(
      await executeUsers(() =>
        service.getMentorUserPlans(c.var.user, c.req.valid('param').userId),
      ),
      200,
    ),
  )
  mentorRoutes.openapi(putMentorUserPlansRoute, async (c) =>
    c.json(
      await executeUsers(() =>
        service.putMentorUserPlans(
          c.var.user,
          c.req.valid('param').userId,
          c.req.valid('json').planIds,
        ),
      ),
      200,
    ),
  )

  planRoutes.use('*', requireAuth)
  planRoutes.openapi(listSharedRationsRoute, async (c) =>
    c.json(await executeUsers(() => service.listSharedRations(c.var.user)), 200),
  )
  planRoutes.openapi(likeSharedRationRoute, async (c) =>
    c.json(
      await executeUsers(() =>
        service.setRationLiked(
          c.var.user,
          c.req.valid('param').rationId,
          c.req.valid('json').liked,
        ),
      ),
      200,
    ),
  )

  return { adminRoutes, mentorRoutes, planRoutes, userRoutes }
}
