import { expect, test } from 'bun:test'

import type { AuthenticatedPrincipal } from '../../auth'
import { UsersFailure } from '../domain/errors'
import { UsersService } from './users-service'

const principal: AuthenticatedPrincipal = {
  id: 'user-1',
  publicId: 101,
  email: 'plans@example.com',
  displayName: null,
  nickname: null,
  telegramUsername: null,
  telegramPhone: null,
  role: 'user',
  questionnaireCompleted: true,
  createdAt: '2026-09-07T00:00:00.000Z',
  sessionId: 'session-1',
}

const unused = {
  adminDashboardReader: { dashboard: async () => ({
    totalUsers: 0, totalAdmins: 0, newUsersLast7Days: 0,
  }) },
  adminUsersReader: { listUsers: async () => ({
    items: [], page: 1, pageSize: 20, total: 0, hasNext: false,
  }) },
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
  userDeleter: { deleteUser: async () => {
    throw new Error('not used')
  } },
  userRoleUpdater: { updateRole: async () => {
    throw new Error('not used')
  } },
}

test('plan library starts empty and persists authored plans with selection', async () => {
  const authored = {
    id: 'plan_11111111-1111-4111-8111-111111111111',
    title: 'Офис',
    description: 'День в офисе',
    coverImage: '/catalog/office.jpg',
    createdAt: '2026-09-01T00:00:00.000Z',
    goal: 'Похудение' as const,
    sourceCatalogId: 'catalog_office',
    dayCount: 4,
  }
  let stored: {
    authoredPlans: unknown
    savedPlanIds: unknown
    selectedPlanIds: unknown
    planStarts: unknown
    updatedAt: Date
  } | null = null
  const service = new UsersService({
    ...unused,
    clock: { now: () => new Date('2026-09-07T12:00:00.000Z') },
    userPlanLibraryStore: {
      getPlanLibrary: async () => stored,
      putPlanLibrary: async (input) => {
        stored = {
          authoredPlans: input.authoredPlans,
          savedPlanIds: input.savedPlanIds,
          selectedPlanIds: input.selectedPlanIds,
          planStarts: input.planStarts,
          updatedAt: new Date('2026-09-07T12:00:00.000Z'),
        }
        return stored
      },
    },
  })

  await expect(service.getCurrentUserPlanLibrary(principal)).resolves.toEqual({
    authoredPlans: [],
    savedPlanIds: [],
    selectedPlanIds: [],
    planStarts: [],
    updatedAt: null,
  })

  await expect(service.putCurrentUserPlanLibrary(principal, {
    authoredPlans: [authored, authored],
    savedPlanIds: ['catalog_loss', 'catalog_loss'],
    selectedPlanIds: [authored.id],
    planStarts: [{ planId: authored.id, dayKey: '2026-09-01' }],
  })).resolves.toEqual({
    authoredPlans: [authored],
    savedPlanIds: ['catalog_loss'],
    selectedPlanIds: [authored.id],
    planStarts: [{ planId: authored.id, dayKey: '2026-09-01' }],
    updatedAt: '2026-09-07T12:00:00.000Z',
  })

  await expect(service.getCurrentUserPlanLibrary(principal)).resolves.toMatchObject({
    authoredPlans: [authored],
    selectedPlanIds: [authored.id],
  })
})

test('mentor reads the plan library of a connected user', async () => {
  const authored = {
    id: 'plan_11111111-1111-4111-8111-111111111111',
    title: 'Офис',
    description: 'День в офисе',
    coverImage: '/catalog/office.jpg',
    createdAt: '2026-09-01T00:00:00.000Z',
    goal: 'Похудение' as const,
    sourceCatalogId: 'catalog_office',
    dayCount: 4,
  }
  const mentor: AuthenticatedPrincipal = {
    ...principal,
    id: 'mentor-1',
    role: 'mentor',
  }
  const service = new UsersService({
    ...unused,
    clock: { now: () => new Date('2026-09-07T12:00:00.000Z') },
    mentorUsersManager: {
      requireAssignedMentee: async (_mentorId: string, userId: string) => {
        if (userId !== principal.id) {
          throw new UsersFailure('not_found', 'Connected user not found')
        }
      },
    } as never,
    userPlanLibraryStore: {
      getPlanLibrary: async (userId) =>
        userId === principal.id
          ? {
              authoredPlans: [authored],
              savedPlanIds: [],
              selectedPlanIds: [authored.id],
              planStarts: [{ planId: authored.id, dayKey: '2026-09-01' }],
              updatedAt: new Date('2026-09-07T12:00:00.000Z'),
            }
          : null,
      putPlanLibrary: async () => {
        throw new Error('not used')
      },
    },
  })

  await expect(service.getMentorUserPlanLibrary(mentor, principal.id)).resolves.toMatchObject({
    selectedPlanIds: [authored.id],
    planStarts: [{ planId: authored.id, dayKey: '2026-09-01' }],
  })
  await expect(service.getMentorUserPlanLibrary(mentor, 'other-user')).rejects.toBeInstanceOf(
    UsersFailure,
  )
})

test('mentor reads favorites of a connected user and cannot see someone else', async () => {
  const mentor: AuthenticatedPrincipal = {
    ...principal,
    id: 'mentor-1',
    role: 'mentor',
  }
  const service = new UsersService({
    ...unused,
    clock: { now: () => new Date('2026-09-07T12:00:00.000Z') },
    mentorUsersManager: {
      requireAssignedMentee: async (_mentorId: string, userId: string) => {
        if (userId !== principal.id) {
          throw new UsersFailure('not_found', 'Connected user not found')
        }
      },
    } as never,
    userFavoritesStore: {
      getFavorites: async (userId) =>
        userId === principal.id
          ? {
              mealIds: ['11111111-1111-4111-8111-111111111111'],
              updatedAt: new Date('2026-09-07T12:00:00.000Z'),
            }
          : null,
      putFavorites: async () => {
        throw new Error('not used')
      },
      filterOwnedMealIds: async (_userId, mealIds) => mealIds,
    },
  })

  await expect(service.getMentorUserFavorites(mentor, principal.id)).resolves.toEqual({
    mealIds: ['11111111-1111-4111-8111-111111111111'],
    updatedAt: '2026-09-07T12:00:00.000Z',
  })
  await expect(service.getMentorUserFavorites(mentor, 'other-user')).rejects.toBeInstanceOf(
    UsersFailure,
  )
})
