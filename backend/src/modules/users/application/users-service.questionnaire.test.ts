import { expect, test } from 'bun:test'
import { uniqueQuestionnaireAnswers } from '../domain/questionnaire'
import type { AuthenticatedPrincipal } from '../../auth'
import { UsersFailure } from '../domain/errors'
import { UsersService } from './users-service'

const userPrincipal: AuthenticatedPrincipal = {
  id: 'user-1',
  publicId: 101,
  email: 'profile@example.com',
  displayName: null,
  nickname: null,
  telegramUsername: null,
    telegramPhone: null,
  role: 'user',
  questionnaireCompleted: false,
  createdAt: '2026-07-20T00:00:00.000Z',
  sessionId: 'session-1',
}

const mentorPrincipal: AuthenticatedPrincipal = {
  ...userPrincipal,
  id: 'mentor-1',
  role: 'mentor',
  questionnaireCompleted: true,
}

function createService(overrides?: {
  getQuestionnaire?: (userId: string) => Promise<null | {
    answers: ReturnType<typeof uniqueQuestionnaireAnswers>
    version: number
    completedAt: Date | null
  }>
  upsertQuestionnaire?: (
    userId: string,
    answers: ReturnType<typeof uniqueQuestionnaireAnswers>,
    completedAt: Date,
  ) => Promise<{
    answers: ReturnType<typeof uniqueQuestionnaireAnswers>
    version: number
    completedAt: Date | null
  }>
  requireAssignedMentee?: (
    mentorUserId: string,
    menteeUserId: string,
  ) => Promise<void>
}) {
  return new UsersService({
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
    clock: { now: () => new Date('2026-07-20T12:00:00.000Z') },
    currentUserMentorReader: { getCurrentUserMentor: async () => null },
    mentorUsersManager: {
      listMentorUsers: async () => ({
        items: [], page: 1, pageSize: 20, total: 0, hasNext: false,
      }),
      detachMentorUser: async () => {
        throw new Error('not used')
      },
      requireAssignedMentee: overrides?.requireAssignedMentee
        ?? (async () => undefined),
    },
    userMentorConnector: {} as never,
    userReferralsReader: { listUserReferrals: async () => ({
      items: [], page: 1, pageSize: 20, total: 0, hasNext: false,
    }) },
    profileWriter: {
      updateProfile: async () => {
        throw new Error('not used')
      },
    },
    questionnaireStore: {
      getQuestionnaire: overrides?.getQuestionnaire
        ?? (async () => null),
      upsertQuestionnaire: overrides?.upsertQuestionnaire
        ?? (async (_userId, answers, completedAt) => ({
          answers,
          version: 1,
          completedAt,
        })),
      hasCompletedQuestionnaire: async () => false,
    },
    userDeleter: {
      deleteUser: async () => {
        throw new Error('not used')
      },
    },
    userRoleUpdater: {
      updateRole: async () => {
        throw new Error('not used')
      },
    },
  })
}

test('questionnaire get returns empty state for users without a profile', async () => {
  const service = createService()
  await expect(service.getQuestionnaire(userPrincipal)).resolves.toEqual({
    answers: null,
    completed: false,
    completedAt: null,
    version: 1,
  })
})

test('questionnaire put saves completed answers for users', async () => {
  const answers = uniqueQuestionnaireAnswers(101)
  const service = createService()
  await expect(
    service.putQuestionnaire(userPrincipal, { answers }),
  ).resolves.toEqual({
    answers,
    completed: true,
    completedAt: '2026-07-20T12:00:00.000Z',
    version: 1,
  })
})

test('questionnaire endpoints reject mentors', async () => {
  const service = createService()
  await expect(service.getQuestionnaire(mentorPrincipal)).rejects.toBeInstanceOf(
    UsersFailure,
  )
  await expect(
    service.putQuestionnaire(mentorPrincipal, {
      answers: uniqueQuestionnaireAnswers(7),
    }),
  ).rejects.toBeInstanceOf(UsersFailure)
})

test('mentor can read and write assigned mentee questionnaire', async () => {
  const answers = uniqueQuestionnaireAnswers(42)
  const calls: string[] = []
  const service = createService({
    requireAssignedMentee: async (mentorId, menteeId) => {
      calls.push(`assign:${mentorId}:${menteeId}`)
    },
    getQuestionnaire: async (userId) => {
      calls.push(`get:${userId}`)
      return { answers, version: 2, completedAt: new Date('2026-07-20T12:00:00.000Z') }
    },
    upsertQuestionnaire: async (userId, next, completedAt) => {
      calls.push(`put:${userId}`)
      return { answers: next, version: 3, completedAt }
    },
  })

  await expect(
    service.getMentorUserQuestionnaire(mentorPrincipal, 'mentee-1'),
  ).resolves.toEqual({
    answers,
    completed: true,
    completedAt: '2026-07-20T12:00:00.000Z',
    version: 2,
  })
  await expect(
    service.putMentorUserQuestionnaire(mentorPrincipal, 'mentee-1', { answers }),
  ).resolves.toMatchObject({
    answers,
    completed: true,
    version: 3,
  })
  expect(calls).toEqual([
    'assign:mentor-1:mentee-1',
    'get:mentee-1',
    'assign:mentor-1:mentee-1',
    'put:mentee-1',
  ])
})

test('mentor questionnaire rejects unassigned mentee', async () => {
  const service = createService({
    requireAssignedMentee: async () => {
      throw new UsersFailure('not_found', 'Connected user not found')
    },
  })
  await expect(
    service.getMentorUserQuestionnaire(mentorPrincipal, 'stranger'),
  ).rejects.toBeInstanceOf(UsersFailure)
})
