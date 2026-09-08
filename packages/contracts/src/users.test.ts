import { describe, expect, test } from 'bun:test'

import {
  adminDashboardResponseSchema,
  adminUserParamsSchema,
  adminUserSummarySchema,
  deleteAdminUserResponseSchema,
  defaultNicknameForEmail,
  defaultRoleForEmail,
  adminUsersQuerySchema,
  adminUsersResponseSchema,
  nicknameSchema,
  isDefaultUserEmail,
  connectCurrentUserToMentorRequestSchema,
  currentUserMentorResponseSchema,
  mentorUsersResponseSchema,
  telegramUsernameSchema,
  updateProfileRequestSchema,
  updateUserRoleRequestSchema,
  putUserFavoritesRequestSchema,
  putUserPlanLibraryRequestSchema,
  userFavoritesSchema,
  userPlanLibrarySchema,
  userSchema,
  userReferralsResponseSchema,
} from './index'

const user = {
  id: '019c0000-0000-7000-8000-000000000001',
  publicId: 101,
  email: 'user@example.com',
  displayName: 'User',
  nickname: null,
  telegramUsername: null,
  telegramPhone: null,
  role: 'user',
  questionnaireCompleted: true,
  createdAt: '2026-07-20T00:00:00.000Z',
} as const

describe('user and admin contracts', () => {
  test('requires one of the supported roles on every user DTO', () => {
    expect(userSchema.parse(user)).toEqual(user)
    expect(userSchema.parse({ ...user, role: 'admin' })).toEqual({ ...user, role: 'admin' })
    expect(userSchema.parse({ ...user, role: 'mentor' })).toEqual({ ...user, role: 'mentor' })
    expect(() => userSchema.parse({ ...user, role: undefined })).toThrow()
    expect(() => userSchema.parse({ ...user, role: 'owner' })).toThrow()
  })

  test('normalizes profile updates and allows explicitly clearing the display name', () => {
    expect(updateProfileRequestSchema.parse({ displayName: '  Jane Doe  ' })).toEqual({
      displayName: 'Jane Doe',
    })
    expect(updateProfileRequestSchema.parse({ displayName: null })).toEqual({ displayName: null })
    expect(updateProfileRequestSchema.parse({ nickname: '  Mentor_01  ' })).toEqual({
      nickname: 'mentor_01',
    })
    expect(updateProfileRequestSchema.parse({ nickname: null })).toEqual({ nickname: null })
    expect(nicknameSchema.parse('ALEX_01')).toBe('alex_01')
    expect(updateProfileRequestSchema.parse({ telegramUsername: '  @Food_User  ' })).toEqual({
      telegramUsername: 'food_user',
    })
    expect(updateProfileRequestSchema.parse({ telegramUsername: null })).toEqual({
      telegramUsername: null,
    })
    expect(updateProfileRequestSchema.parse({ telegramPhone: '+7 (900) 123-45-67' })).toEqual({
      telegramPhone: '79001234567',
    })
    expect(updateProfileRequestSchema.parse({ telegramPhone: null })).toEqual({
      telegramPhone: null,
    })
    expect(telegramUsernameSchema.parse('@MealBot')).toBe('mealbot')
    for (const nickname of ['admin', 'mentor', 'user']) {
      expect(() => updateProfileRequestSchema.parse({ nickname })).toThrow()
    }
    for (const nickname of ['ab', '1mentor', '_mentor', 'mentor-name', 'ментор']) {
      expect(() => nicknameSchema.parse(nickname)).toThrow()
    }
    for (const username of ['ab', 'abcd', '1food', '_food', 'food-name', 'еда']) {
      expect(() => telegramUsernameSchema.parse(username)).toThrow()
    }
    expect(() => updateProfileRequestSchema.parse({})).toThrow()
    expect(() => updateProfileRequestSchema.parse({ displayName: 'A' })).toThrow()
    expect(() => updateProfileRequestSchema.parse({ displayName: '' })).toThrow()
    expect(() =>
      updateProfileRequestSchema.parse({ displayName: 'Jane', role: 'admin' }),
    ).toThrow()
  })

  test('identifies default accounts and their reserved nicknames', () => {
    expect(defaultNicknameForEmail('ADMIN@NORA.COM')).toBe('admin')
    expect(defaultNicknameForEmail('mentor@nora.com')).toBe('mentor')
    expect(defaultRoleForEmail('mentor@nora.com')).toBe('mentor')
    expect(defaultRoleForEmail('new@nora.com')).toBe('user')
    expect(isDefaultUserEmail('user@nora.com')).toBe(true)
    expect(isDefaultUserEmail('new@nora.com')).toBe(false)
  })

  test('accepts account meal favorites', () => {
    expect(
      userFavoritesSchema.parse({
        mealIds: ['meal-01', '  meal-02  '],
        updatedAt: '2026-08-22T00:00:00.000Z',
      }),
    ).toEqual({
      mealIds: ['meal-01', 'meal-02'],
      updatedAt: '2026-08-22T00:00:00.000Z',
    })
    expect(putUserFavoritesRequestSchema.parse({ mealIds: ['meal-01'] })).toEqual({
      mealIds: ['meal-01'],
    })
    expect(() => putUserFavoritesRequestSchema.parse({})).toThrow()
    expect(() => putUserFavoritesRequestSchema.parse({ rationIds: [] })).toThrow()
    expect(() =>
      putUserFavoritesRequestSchema.parse({ mealIds: ['meal-01'], extra: true }),
    ).toThrow()
  })

  test('accepts the current-user plan library', () => {
    const authored = {
      id: 'plan_11111111-1111-4111-8111-111111111111',
      title: 'Офис',
      description: 'День в офисе',
      coverImage: '/catalog/office.jpg',
      createdAt: '2026-09-07T00:00:00.000Z',
      goal: 'Похудение' as const,
      sourceCatalogId: 'catalog_office',
    }
    expect(
      userPlanLibrarySchema.parse({
        authoredPlans: [authored],
        savedPlanIds: ['catalog_loss', authored.id],
        selectedPlanIds: [authored.id],
        planStarts: [{ planId: authored.id, dayKey: '2026-09-01' }],
        updatedAt: '2026-09-07T12:00:00.000Z',
      }),
    ).toEqual({
      authoredPlans: [authored],
      savedPlanIds: ['catalog_loss', authored.id],
      selectedPlanIds: [authored.id],
      planStarts: [{ planId: authored.id, dayKey: '2026-09-01' }],
      updatedAt: '2026-09-07T12:00:00.000Z',
    })
    expect(
      putUserPlanLibraryRequestSchema.parse({
        authoredPlans: [{ ...authored, description: '  ' }],
        savedPlanIds: ['  catalog_loss  '],
        selectedPlanIds: [],
        planStarts: [],
      }),
    ).toMatchObject({
      authoredPlans: [{ ...authored, description: '' }],
      savedPlanIds: ['catalog_loss'],
      selectedPlanIds: [],
      planStarts: [],
    })
    expect(() =>
      putUserPlanLibraryRequestSchema.parse({
        authoredPlans: [{ ...authored, id: 'catalog_loss' }],
        savedPlanIds: [],
        selectedPlanIds: [],
        planStarts: [],
      }),
    ).toThrow()
    expect(() =>
      putUserPlanLibraryRequestSchema.parse({
        authoredPlans: [],
        savedPlanIds: [],
        selectedPlanIds: [],
        planStarts: [{ planId: authored.id, dayKey: '07-09-2026' }],
      }),
    ).toThrow()
  })

  test('validates current-user mentor connection and list contracts', () => {
    const summary = {
      id: user.id,
      publicId: user.publicId,
      email: user.email,
      displayName: user.displayName,
      nickname: user.nickname,
      role: user.role,
      createdAt: user.createdAt,
    }
    expect(connectCurrentUserToMentorRequestSchema.parse({ identifier: '  101 ' })).toEqual({
      identifier: '101',
    })
    expect(currentUserMentorResponseSchema.parse({ mentor: summary })).toEqual({
      mentor: summary,
    })
    expect(mentorUsersResponseSchema.parse({
      items: [summary],
      page: 1,
      pageSize: 20,
      total: 1,
      hasNext: false,
    }).items).toHaveLength(1)
    expect(userReferralsResponseSchema.parse({
      items: [summary],
      page: 1,
      pageSize: 20,
      total: 1,
      hasNext: false,
    }).items).toHaveLength(1)
  })

  test('normalizes bounded admin list queries', () => {
    expect(adminUsersQuerySchema.parse({})).toEqual({
      page: 1,
      pageSize: 20,
    })
    expect(
      adminUsersQuerySchema.parse({ q: '  USER@EXAMPLE.COM  ', page: '2', pageSize: '100' }),
    ).toEqual({
      q: 'USER@EXAMPLE.COM',
      page: 2,
      pageSize: 100,
    })
    expect(() => adminUsersQuerySchema.parse({ page: '0' })).toThrow()
    expect(adminUsersQuerySchema.parse({ page: '100' }).page).toBe(100)
    expect(() => adminUsersQuerySchema.parse({ page: '101' })).toThrow()
    expect(() => adminUsersQuerySchema.parse({ pageSize: '101' })).toThrow()
  })

  test('exposes only the safe admin user summary and validates role changes', () => {
    const summary = {
      id: user.id,
      publicId: user.publicId,
      email: user.email,
      displayName: user.displayName,
      nickname: user.nickname,
      role: user.role,
      createdAt: user.createdAt,
    }
    expect(adminUserSummarySchema.parse(summary)).toEqual(summary)
    expect(() =>
      adminUserSummarySchema.parse({ ...summary, passwordHash: 'must-not-leak' }),
    ).toThrow()
    expect(updateUserRoleRequestSchema.parse({ role: 'admin' })).toEqual({ role: 'admin' })
    expect(deleteAdminUserResponseSchema.parse({ user: summary })).toEqual({ user: summary })
    expect(() =>
      deleteAdminUserResponseSchema.parse({ user: { ...summary, passwordHash: 'must-not-leak' } }),
    ).toThrow()
    expect(() => updateUserRoleRequestSchema.parse({ role: 'owner' })).toThrow()
    expect(adminUserParamsSchema.parse({ userId: user.id })).toEqual({ userId: user.id })
    expect(() => adminUserParamsSchema.parse({ userId: 'not-a-uuid' })).toThrow()
  })

  test('validates dashboard and paginated user responses', () => {
    expect(
      adminDashboardResponseSchema.parse({
        totalUsers: 10,
        totalAdmins: 2,
        newUsersLast7Days: 3,
      }),
    ).toEqual({
      totalUsers: 10,
      totalAdmins: 2,
      newUsersLast7Days: 3,
    })
    expect(
      adminUsersResponseSchema.parse({
        items: [
          {
            id: user.id,
            publicId: user.publicId,
            email: user.email,
            displayName: user.displayName,
            nickname: user.nickname,
            role: user.role,
            createdAt: user.createdAt,
          },
        ],
        page: 1,
        pageSize: 20,
        total: 1,
        hasNext: false,
      }),
    ).toMatchObject({ page: 1, pageSize: 20, total: 1, hasNext: false })
  })
})
