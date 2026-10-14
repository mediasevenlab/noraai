import { expect, test } from 'bun:test'

import type { AuthenticatedPrincipal } from '../../auth'
import { UsersService } from './users-service'

function principal(role: AuthenticatedPrincipal['role']): AuthenticatedPrincipal {
  return {
    id: 'user-1',
    publicId: 101,
    email: role === 'mentor' ? 'mentor@example.com' : 'user@example.com',
    displayName: null,
    nickname: null,
    telegramUsername: null,
    telegramPhone: null,
    role,
    questionnaireCompleted: true,
    createdAt: '2026-07-20T00:00:00.000Z',
    sessionId: 'session-1',
  }
}

function serviceWithBots() {
  return new UsersService({
    adminDashboardReader: { dashboard: async () => ({
      totalUsers: 0,
      totalAdmins: 0,
      newUsersLast7Days: 0,
    }) },
    adminUsersReader: { listUsers: async () => ({
      items: [], page: 1, pageSize: 20, total: 0, hasNext: false,
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
    userDeleter: { deleteUser: async () => {
      throw new Error('not used')
    } },
    userRoleUpdater: { updateRole: async () => {
      throw new Error('not used')
    } },
    telegramLinks: {
      start: async () => ({
        code: '123456',
        expiresAt: new Date('2026-07-20T00:15:00.000Z'),
      }),
      complete: async () => ({ ok: true as const, userId: 'user-1' }),
    },
    botUsername: 'nutrition_meals_bot',
    notifyBotUsername: 'meal_notifications_bot',
  })
}

test('a user cannot start a Telegram link', async () => {
  await expect(
    serviceWithBots().startTelegramLink(principal('user'), { telegramUsername: 'food_user' }),
  ).rejects.toMatchObject({ kind: 'forbidden' })
})

test('mentor Telegram link opens the notifications bot', async () => {
  const result = await serviceWithBots().startTelegramLink(principal('mentor'), {
    telegramUsername: 'food_mentor',
  })
  expect(result.botUrl).toBe('https://t.me/meal_notifications_bot?start=123456')
})
