import { expect, test } from 'bun:test'

import type { AuthenticatedPrincipal } from '../../auth'
import { UsersFailure } from '../domain/errors'
import { UsersService } from './users-service'

test('profile updates project the updated user without a post-write read', async () => {
  const principal: AuthenticatedPrincipal = {
    id: 'user-1',
    publicId: 101,
    email: 'profile@example.com',
    displayName: null,
    nickname: null,
    telegramUsername: null,
    telegramPhone: null,
    role: 'user',
    questionnaireCompleted: true,
    createdAt: '2026-07-20T00:00:00.000Z',
    sessionId: 'session-1',
  }
  const service = new UsersService({
    adminDashboardReader: { dashboard: async () => ({
      totalUsers: 0,
      totalAdmins: 0,
      newUsersLast7Days: 0,
    }) },
    adminUsersReader: { listUsers: async () => ({
      items: [],
      page: 1,
      pageSize: 20,
      total: 0,
      hasNext: false,
    }) },
    clock: { now: () => new Date('2026-07-20T00:00:00.000Z') },
    currentUserMentorReader: { getCurrentUserMentor: async () => null },
    mentorUsersManager: {} as never,
    userMentorConnector: {} as never,
    userReferralsReader: { listUserReferrals: async () => ({
      items: [], page: 1, pageSize: 20, total: 0, hasNext: false,
    }) },
    profileWriter: {
      updateProfile: async (_userId, input) => ({
        id: principal.id,
        publicId: principal.publicId,
        email: principal.email,
        displayName: input.displayName === undefined ? principal.displayName : input.displayName,
        nickname: input.nickname === undefined ? principal.nickname : input.nickname,
        telegramUsername:
          input.telegramUsername === undefined
            ? principal.telegramUsername
            : input.telegramUsername,
        telegramPhone:
          input.telegramPhone === undefined
            ? principal.telegramPhone
            : input.telegramPhone,
        role: principal.role,
        createdAt: new Date(principal.createdAt),
      }),
    },
    questionnaireStore: {
      getQuestionnaire: async () => null,
      upsertQuestionnaire: async () => {
        throw new Error('not used')
      },
      hasCompletedQuestionnaire: async () => true,
    },
    userDeleter: { deleteUser: async () => {
      throw new Error('not used')
    } },
    userRoleUpdater: { updateRole: async () => {
      throw new Error('not used')
    } },
  })

  await expect(service.updateProfile(principal, { displayName: 'Updated Name' })).resolves.toEqual({
    user: {
      id: principal.id,
      publicId: principal.publicId,
      email: principal.email,
      displayName: 'Updated Name',
      nickname: null,
      telegramUsername: null,
    telegramPhone: null,
      role: principal.role,
      questionnaireCompleted: true,
      createdAt: principal.createdAt,
    },
  })
})

test('user deletion delegates actor and target identities to the repository', async () => {
  const principal: AuthenticatedPrincipal = {
    id: 'admin-1',
    publicId: 1,
    email: 'admin@example.com',
    displayName: 'Admin',
    nickname: null,
    telegramUsername: null,
    telegramPhone: null,
    role: 'admin',
    questionnaireCompleted: true,
    createdAt: '2026-07-20T00:00:00.000Z',
    sessionId: 'session-1',
  }
  let received: { actorUserId: string; targetUserId: string } | undefined
  const deletedUser = {
    id: 'user-1',
    publicId: 101,
    email: 'user@example.com',
    displayName: 'User',
    nickname: null,
    telegramUsername: null,
    telegramPhone: null,
    role: 'user' as const,
    createdAt: '2026-07-20T00:00:00.000Z',
  }
  const service = new UsersService({
    adminDashboardReader: { dashboard: async () => ({
      totalUsers: 0,
      totalAdmins: 0,
      newUsersLast7Days: 0,
    }) },
    adminUsersReader: { listUsers: async () => ({
      items: [],
      page: 1,
      pageSize: 20,
      total: 0,
      hasNext: false,
    }) },
    clock: { now: () => new Date('2026-07-20T00:00:00.000Z') },
    currentUserMentorReader: { getCurrentUserMentor: async () => null },
    mentorUsersManager: {} as never,
    userMentorConnector: {} as never,
    userReferralsReader: { listUserReferrals: async () => ({
      items: [], page: 1, pageSize: 20, total: 0, hasNext: false,
    }) },
    profileWriter: { updateProfile: async () => {
      throw new Error('not used')
    } },
    questionnaireStore: {
      getQuestionnaire: async () => null,
      upsertQuestionnaire: async () => {
        throw new Error('not used')
      },
      hasCompletedQuestionnaire: async () => true,
    },
    userDeleter: {
      deleteUser: async (input) => {
        received = input
        return deletedUser
      },
    },
    userRoleUpdater: { updateRole: async () => {
      throw new Error('not used')
    } },
  })

  await expect(service.deleteUser(principal, deletedUser.id)).resolves.toEqual({
    user: deletedUser,
  })
  expect(received).toEqual({
    actorUserId: principal.id,
    targetUserId: deletedUser.id,
  })
})

test('favorites return empty lists until the account saves them', async () => {
  const principal: AuthenticatedPrincipal = {
    id: 'user-1',
    publicId: 101,
    email: 'saved@example.com',
    displayName: null,
    nickname: null,
    telegramUsername: null,
    telegramPhone: null,
    role: 'user',
    questionnaireCompleted: true,
    createdAt: '2026-07-20T00:00:00.000Z',
    sessionId: 'session-1',
  }
  let stored = {
    mealIds: [] as string[],
    updatedAt: new Date('2026-08-22T00:00:00.000Z'),
  }
  const service = new UsersService({
    adminDashboardReader: { dashboard: async () => ({
      totalUsers: 0,
      totalAdmins: 0,
      newUsersLast7Days: 0,
    }) },
    adminUsersReader: { listUsers: async () => ({
      items: [],
      page: 1,
      pageSize: 20,
      total: 0,
      hasNext: false,
    }) },
    clock: { now: () => new Date('2026-08-22T00:00:00.000Z') },
    currentUserMentorReader: { getCurrentUserMentor: async () => null },
    mentorUsersManager: {} as never,
    userMentorConnector: {} as never,
    userReferralsReader: { listUserReferrals: async () => ({
      items: [], page: 1, pageSize: 20, total: 0, hasNext: false,
    }) },
    profileWriter: { updateProfile: async () => {
      throw new Error('not used')
    } },
    questionnaireStore: {
      getQuestionnaire: async () => null,
      upsertQuestionnaire: async () => {
        throw new Error('not used')
      },
      hasCompletedQuestionnaire: async () => true,
    },
    userFavoritesStore: {
      getFavorites: async () => (stored.mealIds.length ? stored : null),
      filterOwnedMealIds: async (_userId, mealIds) => mealIds,
      putFavorites: async (input) => {
        stored = {
          mealIds: input.mealIds,
          updatedAt: new Date('2026-08-22T01:00:00.000Z'),
        }
        return stored
      },
    },
    userDeleter: { deleteUser: async () => {
      throw new Error('not used')
    } },
    userRoleUpdater: { updateRole: async () => {
      throw new Error('not used')
    } },
  })

  await expect(service.getCurrentUserFavorites(principal)).resolves.toEqual({
    mealIds: [],
    updatedAt: null,
  })
  await expect(service.putCurrentUserFavorites(principal, {
    mealIds: ['meal-01', 'meal-01', 'meal-02'],
  })).resolves.toEqual({
    mealIds: ['meal-01', 'meal-02'],
    updatedAt: '2026-08-22T01:00:00.000Z',
  })
})

test('profile updates reject unverified Telegram identity', async () => {
  const principal: AuthenticatedPrincipal = {
    id: 'user-1',
    publicId: 101,
    email: 'profile@example.com',
    displayName: null,
    nickname: null,
    telegramUsername: null,
    telegramPhone: null,
    role: 'user',
    questionnaireCompleted: true,
    createdAt: '2026-07-20T00:00:00.000Z',
    sessionId: 'session-1',
  }
  const service = new UsersService({
    adminDashboardReader: { dashboard: async () => ({
      totalUsers: 0, totalAdmins: 0, newUsersLast7Days: 0,
    }) },
    adminUsersReader: { listUsers: async () => ({
      items: [], page: 1, pageSize: 20, total: 0, hasNext: false,
    }) },
    clock: { now: () => new Date('2026-07-20T12:00:00.000Z') },
    currentUserMentorReader: { getCurrentUserMentor: async () => null },
    mentorUsersManager: {} as never,
    userMentorConnector: {} as never,
    userReferralsReader: { listUserReferrals: async () => ({
      items: [], page: 1, pageSize: 20, total: 0, hasNext: false,
    }) },
    profileWriter: {
      updateProfile: async () => {
        throw new Error('must not persist unverified telegram identity')
      },
    },
    questionnaireStore: {
      getQuestionnaire: async () => null,
      upsertQuestionnaire: async () => {
        throw new Error('not used')
      },
      hasCompletedQuestionnaire: async () => true,
    },
    userDeleter: { deleteUser: async () => {
      throw new Error('not used')
    } },
    userRoleUpdater: { updateRole: async () => {
      throw new Error('not used')
    } },
  })

  await expect(
    service.updateProfile(principal, { telegramUsername: 'food_user' }),
  ).rejects.toMatchObject({ kind: 'invalid' })
})

test('favorites keep only meal ids owned by the current user', async () => {
  const principal: AuthenticatedPrincipal = {
    id: 'user-1',
    publicId: 101,
    email: 'profile@example.com',
    displayName: null,
    nickname: null,
    telegramUsername: null,
    telegramPhone: null,
    role: 'user',
    questionnaireCompleted: true,
    createdAt: '2026-07-20T00:00:00.000Z',
    sessionId: 'session-1',
  }
  const ownedId = '11111111-1111-4111-8111-111111111111'
  const service = new UsersService({
    adminDashboardReader: { dashboard: async () => ({
      totalUsers: 0, totalAdmins: 0, newUsersLast7Days: 0,
    }) },
    adminUsersReader: { listUsers: async () => ({
      items: [], page: 1, pageSize: 20, total: 0, hasNext: false,
    }) },
    clock: { now: () => new Date('2026-08-22T00:00:00.000Z') },
    currentUserMentorReader: { getCurrentUserMentor: async () => null },
    mentorUsersManager: {} as never,
    userMentorConnector: {} as never,
    userReferralsReader: { listUserReferrals: async () => ({
      items: [], page: 1, pageSize: 20, total: 0, hasNext: false,
    }) },
    profileWriter: { updateProfile: async () => {
      throw new Error('not used')
    } },
    questionnaireStore: {
      getQuestionnaire: async () => null,
      upsertQuestionnaire: async () => {
        throw new Error('not used')
      },
      hasCompletedQuestionnaire: async () => true,
    },
    userFavoritesStore: {
      getFavorites: async () => null,
      filterOwnedMealIds: async (_userId, mealIds) => mealIds.filter((id) => id === ownedId),
      putFavorites: async (input) => ({
        mealIds: input.mealIds,
        updatedAt: new Date('2026-08-22T01:00:00.000Z'),
      }),
    },
    userDeleter: { deleteUser: async () => {
      throw new Error('not used')
    } },
    userRoleUpdater: { updateRole: async () => {
      throw new Error('not used')
    } },
  })

  await expect(service.putCurrentUserFavorites(principal, {
    mealIds: [ownedId, '22222222-2222-4222-8222-222222222222'],
  })).resolves.toMatchObject({
    mealIds: [ownedId],
  })
})

test('mentor can assign own plans to a connected user', async () => {
  const mentor: AuthenticatedPrincipal = {
    id: '3f1c0a1e-6b2d-4c8a-9e11-bbbbbbbbbbbb',
    publicId: 2,
    email: 'mentor@example.com',
    displayName: 'Mentor',
    nickname: 'mentor',
    telegramUsername: null,
    telegramPhone: null,
    role: 'mentor',
    questionnaireCompleted: true,
    createdAt: '2026-07-20T00:00:00.000Z',
    sessionId: 'session-mentor',
  }
  const menteeId = '3f1c0a1e-6b2d-4c8a-9e11-cccccccccccccccc'
  const planId = '3f1c0a1e-6b2d-4c8a-9e11-aaaaaaaaaaaa'
  const meal = {
    slot: 'Обед' as const,
    title: 'Омлет',
    ingredients: '',
    steps: [] as string[],
    image: '',
    kcal: 300,
    protein: 20,
    fat: 18,
    carbs: 8,
  }
  const planRow = {
    id: planId,
    mentorId: mentor.id,
    title: 'Офис',
    description: '',
    goal: 'Похудение',
    source: 'План наставника',
    image: '',
    days: 7,
    mealsPerDay: 1,
    meals: [meal],
    kcal: 300,
    protein: 20,
    fat: 18,
    carbs: 8,
    createdAt: new Date('2026-09-02T00:00:00.000Z'),
    updatedAt: new Date('2026-09-02T00:00:00.000Z'),
  }
  let assigned: { userId: string; planIds: string[] } | null = null
  const unused = async () => {
    throw new Error('not used')
  }
  const service = new UsersService({
    adminDashboardReader: { dashboard: async () => ({
      totalUsers: 0, totalAdmins: 0, newUsersLast7Days: 0,
    }) },
    adminUsersReader: { listUsers: async () => ({
      items: [], page: 1, pageSize: 20, total: 0, hasNext: false,
    }) },
    clock: { now: () => new Date('2026-09-02T00:00:00.000Z') },
    currentUserMentorReader: { getCurrentUserMentor: async () => null },
    mentorUsersManager: {
      requireAssignedMentee: async (mentorId: string, userId: string) => {
        if (mentorId !== mentor.id || userId !== menteeId) {
          throw new UsersFailure('not_found', 'Connected user not found')
        }
      },
    } as never,
    userMentorConnector: {} as never,
    userReferralsReader: { listUserReferrals: async () => ({
      items: [], page: 1, pageSize: 20, total: 0, hasNext: false,
    }) },
    profileWriter: { updateProfile: unused },
    questionnaireStore: {
      getQuestionnaire: async () => null,
      upsertQuestionnaire: unused,
      hasCompletedQuestionnaire: async () => true,
    },
    mentorPlansStore: {
      listMentorPlans: async () => [planRow],
      getMentorPlan: async () => planRow,
      listPlansByIds: async (ids) => ids.includes(planId) ? [planRow] : [],
      createMentorPlan: unused,
      updateMentorPlan: unused,
      deleteMentorPlan: unused,
    },
    planAssignmentsStore: {
      getPlanAssignment: async (userId) =>
        assigned && assigned.userId === userId
          ? { planIds: assigned.planIds, updatedAt: new Date('2026-09-02T01:00:00.000Z') }
          : null,
      putPlanAssignment: async (input) => {
        assigned = { userId: input.userId, planIds: input.planIds }
        return { planIds: input.planIds, updatedAt: new Date('2026-09-02T01:00:00.000Z') }
      },
    },
    userDeleter: { deleteUser: unused },
    userRoleUpdater: { updateRole: unused },
  })

  await expect(service.putMentorUserPlans(mentor, menteeId, [planId, planId])).resolves.toMatchObject({
    planIds: [planId],
    authoredPlans: [{ id: planId, title: 'Офис', goal: 'Похудение' }],
    updatedAt: '2026-09-02T01:00:00.000Z',
  })
  await expect(service.putMentorUserPlans(mentor, menteeId, ['plan_local'])).rejects.toMatchObject({
    kind: 'invalid',
  })
})
