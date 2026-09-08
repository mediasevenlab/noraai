import { createHash } from 'node:crypto'
import { afterAll, afterEach, beforeEach, describe, expect, test } from 'bun:test'

import { createApp } from '../../app'
import { createPrisma, type DbClient } from '../../db'
import { testAppEnv } from '../../test-app-env'
import {
  assertLoginCapableAdmin,
  bootstrapAdmin,
  parseAdminSeedConfig,
} from './infrastructure/admin-bootstrap'
import { createTelegramLinkStore } from './infrastructure/telegram-link-store'

const databaseUrl = process.env.TEST_DATABASE_URL
const maybeDescribe = databaseUrl ? describe : describe.skip

maybeDescribe('users and admin API integration', () => {
  const env = testAppEnv({
    DATABASE_URL: databaseUrl!,
    JWT_SECRET: '12345678901234567890123456789012',
  })
  const prisma = createPrisma(databaseUrl!)
  const app = createApp({ env, prisma })
  const pendingGateReleases = new Set<() => void>()

  beforeEach(async () => {
    await prisma.telegramLinkChallenge.deleteMany()
    await prisma.authSession.deleteMany()
    await prisma.user.deleteMany()
  })

  afterEach(() => {
    for (const release of pendingGateReleases) release()
  })

  afterAll(async () => {
    await app.dispose()
    await prisma.$disconnect()
  })

  test('registers users with the user role and persists profile updates', async () => {
    const session = await register('profile@example.com', 'Initial Name')

    expect(session.user.role).toBe('user')
    expect(session.user.questionnaireCompleted).toBe(false)

    const emptyQuestionnaire = await app.request('/api/users/me/questionnaire', {
      headers: authenticatedHeaders(session.accessToken),
    })
    expect(emptyQuestionnaire.status).toBe(200)
    expect(await emptyQuestionnaire.json()).toMatchObject({
      answers: null,
      completed: false,
    })

    const { uniqueQuestionnaireAnswers } = await import('./domain/questionnaire')
    const answers = uniqueQuestionnaireAnswers(session.user.publicId)
    const saveQuestionnaire = await app.request('/api/users/me/questionnaire', {
      method: 'PUT',
      headers: authenticatedJsonHeaders(session.accessToken),
      body: JSON.stringify({ answers }),
    })
    expect(saveQuestionnaire.status).toBe(200)
    expect(await saveQuestionnaire.json()).toMatchObject({
      answers,
      completed: true,
    })

    const meAfterQuestionnaire = await app.request('/api/auth/me', {
      headers: authenticatedHeaders(session.accessToken),
    })
    expect((await meAfterQuestionnaire.json()).user.questionnaireCompleted).toBe(true)

    const update = await app.request('/api/users/me', {
      method: 'PATCH',
      headers: authenticatedJsonHeaders(session.accessToken),
      body: JSON.stringify({ displayName: '  Updated Name  ' }),
    })
    const updateBody = await update.json()

    expect(update.status).toBe(200)
    expect(updateBody.user).toMatchObject({
      displayName: 'Updated Name',
      email: 'profile@example.com',
      role: 'user',
    })

    const me = await app.request('/api/auth/me', {
      headers: authenticatedHeaders(session.accessToken),
    })
    expect((await me.json()).user.displayName).toBe('Updated Name')

    const clear = await app.request('/api/users/me', {
      method: 'PATCH',
      headers: authenticatedJsonHeaders(session.accessToken),
      body: JSON.stringify({ displayName: null }),
    })
    expect((await clear.json()).user.displayName).toBeNull()

    for (const displayName of ['x', 'x'.repeat(81)]) {
      const invalid = await app.request('/api/users/me', {
        method: 'PATCH',
        headers: authenticatedJsonHeaders(session.accessToken),
        body: JSON.stringify({ displayName }),
      })
      expect(invalid.status).toBe(400)
      expect((await invalid.json()).error.code).toBe('VALIDATION_ERROR')
    }
  })

  test('rejects Telegram identity on profile PATCH', async () => {
    const session = await register('telegram-patch@example.com')
    const setUsername = await app.request('/api/users/me', {
      method: 'PATCH',
      headers: authenticatedJsonHeaders(session.accessToken),
      body: JSON.stringify({ telegramUsername: '  @Food_User  ' }),
    })
    expect(setUsername.status).toBe(400)
    const setPhone = await app.request('/api/users/me', {
      method: 'PATCH',
      headers: authenticatedJsonHeaders(session.accessToken),
      body: JSON.stringify({ telegramPhone: '+7 (900) 123-45-67' }),
    })
    expect(setPhone.status).toBe(400)
  })

  test('starts a Telegram username challenge instead of trusting profile PATCH', async () => {
    const first = await register('telegram-first@example.com')
    const second = await register('telegram-second@example.com')
    const links = createTelegramLinkStore(prisma)

    const start = await app.request('/api/users/me/telegram-link', {
      method: 'POST',
      headers: authenticatedJsonHeaders(first.accessToken),
      body: JSON.stringify({ telegramUsername: '  @Food_User  ' }),
    })
    expect(start.status).toBe(200)
    const started = await start.json() as { code: string }
    expect(started.code).toMatch(/^\d{6}$/)

    const completed = await links.complete(started.code, { telegramUsername: 'food_user' })
    expect(completed).toEqual({ ok: true, userId: first.user.id })

    const me = await app.request('/api/auth/me', {
      headers: authenticatedHeaders(first.accessToken),
    })
    expect((await me.json()).user.telegramUsername).toBe('food_user')

    const startSecond = await app.request('/api/users/me/telegram-link', {
      method: 'POST',
      headers: authenticatedJsonHeaders(second.accessToken),
      body: JSON.stringify({ telegramUsername: 'FOOD_USER' }),
    })
    expect(startSecond.status).toBe(200)
    const secondCode = (await startSecond.json() as { code: string }).code
    let takenUsername: unknown
    try {
      await links.complete(secondCode, { telegramUsername: 'food_user' })
    } catch (error) {
      takenUsername = error
    }
    expect(takenUsername).toMatchObject({ kind: 'telegram_username_taken' })

    const clear = await app.request('/api/users/me', {
      method: 'PATCH',
      headers: authenticatedJsonHeaders(first.accessToken),
      body: JSON.stringify({ telegramUsername: null }),
    })
    expect(clear.status).toBe(200)
    expect((await clear.json()).user.telegramUsername).toBeNull()

    for (const telegramUsername of ['ab', 'abcd', '1food', 'food-name']) {
      const invalid = await app.request('/api/users/me/telegram-link', {
        method: 'POST',
        headers: authenticatedJsonHeaders(second.accessToken),
        body: JSON.stringify({ telegramUsername }),
      })
      expect(invalid.status).toBe(400)
      expect((await invalid.json()).error.code).toBe('VALIDATION_ERROR')
    }
  })

  test('starts a Telegram phone challenge instead of trusting profile PATCH', async () => {
    const first = await register('telegram-phone-first@example.com')
    const second = await register('telegram-phone-second@example.com')
    const links = createTelegramLinkStore(prisma)

    const startPhone = await app.request('/api/users/me/telegram-link', {
      method: 'POST',
      headers: authenticatedJsonHeaders(first.accessToken),
      body: JSON.stringify({ telegramPhone: '+7 (900) 123-45-67' }),
    })
    expect(startPhone.status).toBe(200)
    const phoneCode = (await startPhone.json() as { code: string }).code
    const phoneCompleted = await links.complete(phoneCode, { telegramPhone: '79001234567' })
    expect(phoneCompleted).toEqual({ ok: true, userId: first.user.id })

    const startDuplicatePhone = await app.request('/api/users/me/telegram-link', {
      method: 'POST',
      headers: authenticatedJsonHeaders(second.accessToken),
      body: JSON.stringify({ telegramPhone: '89001234567' }),
    })
    expect(startDuplicatePhone.status).toBe(200)
    const duplicatePhoneCode = (await startDuplicatePhone.json() as { code: string }).code
    let takenPhone: unknown
    try {
      await links.complete(duplicatePhoneCode, { telegramPhone: '79001234567' })
    } catch (error) {
      takenPhone = error
    }
    expect(takenPhone).toMatchObject({ kind: 'telegram_phone_taken' })
  })

  test('normalizes unique nicknames for users and administrators', async () => {
    const first = await register('nickname-first@example.com')
    const second = await register('nickname-second@example.com')

    const setNickname = await app.request('/api/users/me', {
      method: 'PATCH',
      headers: authenticatedJsonHeaders(first.accessToken),
      body: JSON.stringify({ nickname: '  Mentor_01  ' }),
    })
    expect(setNickname.status).toBe(200)
    expect((await setNickname.json()).user.nickname).toBe('mentor_01')

    const me = await app.request('/api/auth/me', {
      headers: authenticatedHeaders(first.accessToken),
    })
    expect((await me.json()).user.nickname).toBe('mentor_01')

    const duplicate = await app.request('/api/users/me', {
      method: 'PATCH',
      headers: authenticatedJsonHeaders(second.accessToken),
      body: JSON.stringify({ nickname: 'MENTOR_01' }),
    })
    expect(duplicate.status).toBe(409)
    expect((await duplicate.json()).error.code).toBe('CONFLICT')

    for (const nickname of ['ab', '1mentor', 'mentor-name', 'ментор']) {
      const invalid = await app.request('/api/users/me', {
        method: 'PATCH',
        headers: authenticatedJsonHeaders(second.accessToken),
        body: JSON.stringify({ nickname }),
      })
      expect(invalid.status).toBe(400)
      expect((await invalid.json()).error.code).toBe('VALIDATION_ERROR')
    }
    const emptyPatch = await app.request('/api/users/me', {
      method: 'PATCH',
      headers: authenticatedJsonHeaders(second.accessToken),
      body: JSON.stringify({}),
    })
    expect(emptyPatch.status).toBe(400)

    await prisma.user.update({
      where: { id: second.user.id },
      data: { role: 'admin' },
    })
    const adminNickname = await app.request('/api/users/me', {
      method: 'PATCH',
      headers: authenticatedJsonHeaders(second.accessToken),
      body: JSON.stringify({ nickname: 'admin_nora' }),
    })
    expect(adminNickname.status).toBe(200)
    expect((await adminNickname.json()).user.nickname).toBe('admin_nora')

    const clear = await app.request('/api/users/me', {
      method: 'PATCH',
      headers: authenticatedJsonHeaders(first.accessToken),
      body: JSON.stringify({ nickname: null }),
    })
    expect(clear.status).toBe(200)
    expect((await clear.json()).user.nickname).toBeNull()
  })

  test('reserves default nicknames and protects default users', async () => {
    const protectedUser = await register('user@nora.com')
    expect(protectedUser.user.nickname).toBe('user')

    const rename = await app.request('/api/users/me', {
      method: 'PATCH',
      headers: authenticatedJsonHeaders(protectedUser.accessToken),
      body: JSON.stringify({ nickname: 'renamed_user' }),
    })
    expect(rename.status).toBe(409)
    expect((await rename.json()).error.code).toBe('CONFLICT')

    const regularUser = await register('regular-nickname@example.com')
    const reservedNickname = await app.request('/api/users/me', {
      method: 'PATCH',
      headers: authenticatedJsonHeaders(regularUser.accessToken),
      body: JSON.stringify({ nickname: 'user' }),
    })
    expect(reservedNickname.status).toBe(400)
    expect((await reservedNickname.json()).error.code).toBe('VALIDATION_ERROR')

    const admin = await register('default-protection-admin@example.com')
    await prisma.user.update({
      where: { id: admin.user.id },
      data: { role: 'admin' },
    })
    const deletion = await app.request(`/api/admin/users/${protectedUser.user.id}`, {
      method: 'DELETE',
      headers: authenticatedHeaders(admin.accessToken),
    })
    expect(deletion.status).toBe(409)
    expect(await prisma.user.count({ where: { id: protectedUser.user.id } })).toBe(1)
  })

  test('scopes mentor users while users connect themselves to mentors', async () => {
    const mentor = await register('mentor@nora.com', 'Mentor')
    const defaultUser = await register('user@nora.com', 'User')
    expect(mentor.user.role).toBe('mentor')

    const initialList = await app.request('/api/mentor/users?page=1&pageSize=20', {
      headers: authenticatedHeaders(mentor.accessToken),
    })
    expect(initialList.status).toBe(200)
    expect((await initialList.json()).items).toEqual([
      expect.objectContaining({ id: defaultUser.user.id, nickname: 'user' }),
    ])
    const publicLookup = await app.request(
      '/api/auth/mentor-lookup?identifier=mentor',
    )
    expect(publicLookup.status).toBe(200)
    expect(await publicLookup.json()).toMatchObject({
      found: true,
      mentor: { id: mentor.user.id, nickname: 'mentor' },
    })

    const candidate = await register('mentor-candidate@example.com', 'Candidate')
    await app.request('/api/users/me', {
      method: 'PATCH',
      headers: authenticatedJsonHeaders(candidate.accessToken),
      body: JSON.stringify({ nickname: 'candidate_user' }),
    })

    for (const identifier of [
      'candidate_user',
      String(candidate.user.publicId),
      candidate.user.id,
    ]) {
      const lookup = await app.request(
        `/api/auth/mentor-lookup?identifier=${encodeURIComponent(identifier)}`,
      )
      expect(lookup.status).toBe(200)
      expect(await lookup.json()).toMatchObject({
        found: false,
      })
    }

    const connect = await app.request('/api/users/me/mentor', {
      method: 'POST',
      headers: authenticatedJsonHeaders(candidate.accessToken),
      body: JSON.stringify({ identifier: String(mentor.user.publicId) }),
    })
    expect(connect.status).toBe(200)
    expect(await connect.json()).toMatchObject({
      user: { id: mentor.user.id, role: 'mentor' },
    })

    const secondMentor = await register(
      'second-mentor@example.com',
      'Second Mentor',
      'mentor',
    )
    expect(secondMentor.user.role).toBe('mentor')
    const attachedAtRegistration = await register(
      'registration-attached@example.com',
      'Attached at registration',
      'user',
      String(secondMentor.user.publicId),
    )
    expect(await prisma.mentorAssignment.findUnique({
      where: { menteeId: attachedAtRegistration.user.id },
    })).toMatchObject({ mentorId: secondMentor.user.id })
    const missingMentorRegistration = await app.request('/api/auth/token/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'missing-mentor@example.com',
        password: 'password123',
        role: 'user',
        mentorIdentifier: 'missing_mentor',
      }),
    })
    expect(missingMentorRegistration.status).toBe(409)
    expect(await prisma.user.count({
      where: { email: 'missing-mentor@example.com' },
    })).toBe(0)
    const detach = await app.request(`/api/mentor/users/${candidate.user.id}`, {
      method: 'DELETE',
      headers: authenticatedHeaders(mentor.accessToken),
    })
    expect(detach.status).toBe(200)
    expect(await prisma.mentorAssignment.findUnique({
      where: { menteeId: candidate.user.id },
    })).toBeNull()

    const forbidden = await app.request('/api/mentor/users?page=1&pageSize=20', {
      headers: authenticatedHeaders(candidate.accessToken),
    })
    expect(forbidden.status).toBe(403)
  })

  test('records user referrals and mentor connections; ignores mentor signups from user links', async () => {
    const referrer = await register('ordinary-referrer@example.com', 'Referrer')
    const publicLookup = await app.request(
      `/api/auth/referral-lookup?code=${referrer.user.publicId}`,
    )
    expect(publicLookup.status).toBe(200)
    expect(await publicLookup.json()).toMatchObject({
      found: true,
      referrer: { id: referrer.user.id, publicId: referrer.user.publicId },
    })

    const referredUser = await register(
      'ordinary-referred@example.com',
      'Referred user',
      'user',
      undefined,
      String(referrer.user.publicId),
    )
    expect(await prisma.user.findUnique({
      where: { id: referredUser.user.id },
      select: { referredByUserId: true },
    })).toEqual({ referredByUserId: referrer.user.id })
    expect(await prisma.mentorAssignment.findUnique({
      where: { menteeId: referredUser.user.id },
    })).toBeNull()
    const referrals = await app.request('/api/users/me/referrals?page=1&pageSize=20', {
      headers: authenticatedHeaders(referrer.accessToken),
    })
    expect(referrals.status).toBe(200)
    expect(await referrals.json()).toMatchObject({
      items: [{ id: referredUser.user.id }],
      total: 1,
    })

    const mentor = await register('referral-mentor@example.com', 'Referral Mentor', 'mentor')
    const mentorReferredUser = await register(
      'mentor-referred@example.com',
      'Mentor referred',
      'user',
      undefined,
      String(mentor.user.publicId),
    )
    expect(await prisma.user.findUnique({
      where: { id: mentorReferredUser.user.id },
      select: { referredByUserId: true },
    })).toEqual({ referredByUserId: null })
    expect(await prisma.mentorAssignment.findUnique({
      where: { menteeId: mentorReferredUser.user.id },
    })).toMatchObject({ mentorId: mentor.user.id })
    const mentorReferrals = await app.request('/api/users/me/referrals?page=1&pageSize=20', {
      headers: authenticatedHeaders(mentor.accessToken),
    })
    expect(mentorReferrals.status).toBe(403)

    const mentorAccountFromUserLink = await register(
      'mentor-from-user-referral@example.com',
      'Mentor from user link',
      'mentor',
      undefined,
      String(referrer.user.publicId),
    )
    expect(await prisma.user.findUnique({
      where: { id: mentorAccountFromUserLink.user.id },
      select: { referredByUserId: true },
    })).toEqual({ referredByUserId: null })
    const referralsAfterMentorSignup = await app.request('/api/users/me/referrals?page=1&pageSize=20', {
      headers: authenticatedHeaders(referrer.accessToken),
    })
    expect(referralsAfterMentorSignup.status).toBe(200)
    expect(await referralsAfterMentorSignup.json()).toMatchObject({
      items: [{ id: referredUser.user.id, role: 'user' }],
      total: 1,
    })
  })

  test('cleans mentor assignments when an administrator changes roles', async () => {
    const mentor = await register('mentor@nora.com')
    const mentee = await register('user@nora.com')
    const admin = await register('mentor-role-admin@example.com')
    await prisma.user.update({
      where: { id: admin.user.id },
      data: { role: 'admin' },
    })
    expect(await prisma.mentorAssignment.count({
      where: { mentorId: mentor.user.id, menteeId: mentee.user.id },
    })).toBe(1)

    const demoteMentor = await app.request(
      `/api/admin/users/${mentor.user.id}/role`,
      {
        method: 'PATCH',
        headers: authenticatedJsonHeaders(admin.accessToken),
        body: JSON.stringify({ role: 'user' }),
      },
    )
    expect(demoteMentor.status).toBe(200)
    expect(await prisma.mentorAssignment.count({
      where: { mentorId: mentor.user.id },
    })).toBe(0)
  })

  test('serializes concurrent claims for one nickname', async () => {
    const first = await register('nickname-race-first@example.com')
    const second = await register('nickname-race-second@example.com')
    const responses = await Promise.all([
      app.request('/api/users/me', {
        method: 'PATCH',
        headers: authenticatedJsonHeaders(first.accessToken),
        body: JSON.stringify({ nickname: 'shared_nickname' }),
      }),
      app.request('/api/users/me', {
        method: 'PATCH',
        headers: authenticatedJsonHeaders(second.accessToken),
        body: JSON.stringify({ nickname: 'shared_nickname' }),
      }),
    ])
    expect(responses.map(({ status }) => status).sort()).toEqual([200, 409])
    expect(await prisma.user.count({ where: { nickname: 'shared_nickname' } })).toBe(1)
  })

  test('rejects regular users from every admin endpoint', async () => {
    const session = await register('regular@example.com')

    const dashboard = await app.request('/api/admin/dashboard', {
      headers: authenticatedHeaders(session.accessToken),
    })
    const users = await app.request('/api/admin/users', {
      headers: authenticatedHeaders(session.accessToken),
    })
    const roleChange = await app.request(`/api/admin/users/${session.user.id}/role`, {
      method: 'PATCH',
      headers: authenticatedJsonHeaders(session.accessToken),
      body: JSON.stringify({ role: 'admin' }),
    })
    const deletion = await app.request(`/api/admin/users/${session.user.id}`, {
      method: 'DELETE',
      headers: authenticatedHeaders(session.accessToken),
    })

    for (const response of [dashboard, users, roleChange, deletion]) {
      expect(response.status).toBe(403)
      expect((await response.json()).error.code).toBe('FORBIDDEN')
    }
  })

  test('lets admins inspect users and promote an account while revoking its sessions', async () => {
    const admin = await register('admin@example.com', 'Admin')
    await prisma.user.update({
      where: { id: admin.user.id },
      data: { role: 'admin' },
    })
    const target = await register('target@example.com', 'Target')
    const resetTokenBeforePromotion = 'p'.repeat(43)
    await createOutstandingPasswordResetToken(target.user.id, resetTokenBeforePromotion)

    const dashboard = await app.request('/api/admin/dashboard', {
      headers: authenticatedHeaders(admin.accessToken),
    })
    expect(dashboard.status).toBe(200)
    expect(await dashboard.json()).toEqual({
      totalUsers: 2,
      totalAdmins: 1,
      newUsersLast7Days: 2,
    })

    const list = await app.request('/api/admin/users?q=target&page=1&pageSize=20', {
      headers: authenticatedHeaders(admin.accessToken),
    })
    const listBody = await list.json()
    expect(list.status).toBe(200)
    expect(listBody).toMatchObject({
      page: 1,
      pageSize: 20,
      total: 1,
      hasNext: false,
    })
    expect(listBody.items).toEqual([
      {
        id: target.user.id,
        publicId: target.user.publicId,
        email: 'target@example.com',
        displayName: 'Target',
        nickname: null,
        role: 'user',
        createdAt: target.user.createdAt,
      },
    ])

    const maximumPage = await app.request('/api/admin/users?page=100&pageSize=1', {
      headers: authenticatedHeaders(admin.accessToken),
    })
    expect(maximumPage.status).toBe(200)
    expect(await maximumPage.json()).toMatchObject({
      items: [],
      page: 100,
      pageSize: 1,
      hasNext: false,
    })

    const excessivePage = await app.request('/api/admin/users?page=101', {
      headers: authenticatedHeaders(admin.accessToken),
    })
    expect(excessivePage.status).toBe(400)
    expect((await excessivePage.json()).error.code).toBe('VALIDATION_ERROR')

    const malformedUserId = await app.request('/api/admin/users/not-a-uuid/role', {
      method: 'PATCH',
      headers: authenticatedJsonHeaders(admin.accessToken),
      body: JSON.stringify({ role: 'admin' }),
    })
    expect(malformedUserId.status).toBe(400)
    expect((await malformedUserId.json()).error.code).toBe('VALIDATION_ERROR')

    const promote = await app.request(`/api/admin/users/${target.user.id}/role`, {
      method: 'PATCH',
      headers: authenticatedJsonHeaders(admin.accessToken),
      body: JSON.stringify({ role: 'admin' }),
    })
    expect(promote.status).toBe(200)
    expect((await promote.json()).user.role).toBe('admin')

    const revokedMe = await app.request('/api/auth/me', {
      headers: authenticatedHeaders(target.accessToken),
    })
    expect(revokedMe.status).toBe(401)
    await expectPasswordResetRejected(resetTokenBeforePromotion)

    const promotedLogin = await login('target@example.com')
    const promotedDashboard = await app.request('/api/admin/dashboard', {
      headers: authenticatedHeaders(promotedLogin.accessToken),
    })
    expect(promotedDashboard.status).toBe(200)

    const idempotentPromotion = await app.request(
      `/api/admin/users/${target.user.id}/role`,
      {
        method: 'PATCH',
        headers: authenticatedJsonHeaders(admin.accessToken),
        body: JSON.stringify({ role: 'admin' }),
      },
    )
    expect(idempotentPromotion.status).toBe(200)
    const stillAuthenticated = await app.request('/api/auth/me', {
      headers: authenticatedHeaders(promotedLogin.accessToken),
    })
    expect(stillAuthenticated.status).toBe(200)
  })

  test('hard-deletes users together with sessions and password reset tokens', async () => {
    const admin = await register('delete-admin@example.com', 'Admin')
    await prisma.user.update({
      where: { id: admin.user.id },
      data: { role: 'admin' },
    })
    const target = await register('delete-target@example.com', 'Target')
    await createOutstandingPasswordResetToken(target.user.id, 'd'.repeat(43))

    const malformed = await app.request('/api/admin/users/not-a-uuid', {
      method: 'DELETE',
      headers: authenticatedHeaders(admin.accessToken),
    })
    expect(malformed.status).toBe(400)

    const missing = await app.request(
      '/api/admin/users/019c0000-0000-7000-8000-000000000099',
      {
        method: 'DELETE',
        headers: authenticatedHeaders(admin.accessToken),
      },
    )
    expect(missing.status).toBe(404)

    const deletion = await app.request(`/api/admin/users/${target.user.id}`, {
      method: 'DELETE',
      headers: authenticatedHeaders(admin.accessToken),
    })
    expect(deletion.status).toBe(200)
    expect(await deletion.json()).toEqual({
      user: {
        id: target.user.id,
        publicId: target.user.publicId,
        email: target.user.email,
        displayName: 'Target',
        nickname: null,
        role: 'user',
        createdAt: target.user.createdAt,
      },
    })
    expect(await prisma.user.findUnique({ where: { id: target.user.id } })).toBeNull()
    expect(await prisma.authSession.count({ where: { userId: target.user.id } })).toBe(0)
    expect(await prisma.passwordResetToken.count({ where: { userId: target.user.id } })).toBe(0)

    const deletedSession = await app.request('/api/auth/me', {
      headers: authenticatedHeaders(target.accessToken),
    })
    expect(deletedSession.status).toBe(401)
    const deletedLogin = await app.request('/api/auth/token/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: target.user.email, password: 'password123' }),
    })
    expect(deletedLogin.status).toBe(401)
  })

  test('rejects self-deletion and serializes concurrent cross-admin deletion', async () => {
    const first = await register('first-delete-admin@example.com')
    const second = await register('second-delete-admin@example.com')
    await prisma.user.updateMany({
      where: { id: { in: [first.user.id, second.user.id] } },
      data: { role: 'admin' },
    })

    const selfDeletion = await app.request(`/api/admin/users/${first.user.id}`, {
      method: 'DELETE',
      headers: authenticatedHeaders(first.accessToken),
    })
    expect(selfDeletion.status).toBe(409)
    expect((await selfDeletion.json()).error.code).toBe('CONFLICT')

    const [firstDeletesSecond, secondDeletesFirst] = await Promise.all([
      app.request(`/api/admin/users/${second.user.id}`, {
        method: 'DELETE',
        headers: authenticatedHeaders(first.accessToken),
      }),
      app.request(`/api/admin/users/${first.user.id}`, {
        method: 'DELETE',
        headers: authenticatedHeaders(second.accessToken),
      }),
    ])
    const statuses = [firstDeletesSecond.status, secondDeletesFirst.status].sort()
    expect(statuses[0]).toBe(200)
    expect([401, 403, 404, 409]).toContain(statuses[1])
    expect(await prisma.user.count({ where: { role: 'admin' } })).toBe(1)
  })

  test('rejects self-demotion and serializes concurrent cross-demotion', async () => {
    const first = await register('first-admin@example.com')
    const second = await register('second-admin@example.com')
    await prisma.user.updateMany({
      where: { id: { in: [first.user.id, second.user.id] } },
      data: { role: 'admin' },
    })

    const selfDemotion = await app.request(`/api/admin/users/${first.user.id}/role`, {
      method: 'PATCH',
      headers: authenticatedJsonHeaders(first.accessToken),
      body: JSON.stringify({ role: 'user' }),
    })
    expect(selfDemotion.status).toBe(409)

    const [firstDemotesSecond, secondDemotesFirst] = await Promise.all([
      app.request(`/api/admin/users/${second.user.id}/role`, {
        method: 'PATCH',
        headers: authenticatedJsonHeaders(first.accessToken),
        body: JSON.stringify({ role: 'user' }),
      }),
      app.request(`/api/admin/users/${first.user.id}/role`, {
        method: 'PATCH',
        headers: authenticatedJsonHeaders(second.accessToken),
        body: JSON.stringify({ role: 'user' }),
      }),
    ])

    const statuses = [firstDemotesSecond.status, secondDemotesFirst.status].sort()
    expect(statuses[0]).toBe(200)
    expect([401, 403]).toContain(statuses[1])
    expect(await prisma.user.count({ where: { role: 'admin' } })).toBe(1)
  })

  test('keeps queued role transitions from blocking unrelated target logins', async () => {
    const actor = await register('queue-actor@example.com')
    await prisma.user.update({
      where: { id: actor.user.id },
      data: { role: 'admin' },
    })
    const firstTarget = await register('queue-first@example.com')
    const secondTarget = await register('queue-second@example.com')
    const thirdTarget = await register('queue-third@example.com')

    const firstUpdateGate = gateNextUserUpdate(firstTarget.user.id)
    const firstRoleApp = createApp({ env, prisma: firstUpdateGate.db })
    const promote = (targetId: string, requestApp = app) =>
      requestApp.request(`/api/admin/users/${targetId}/role`, {
        method: 'PATCH',
        headers: authenticatedJsonHeaders(actor.accessToken),
        body: JSON.stringify({ role: 'admin' }),
      })

    const firstRoleChange = promote(firstTarget.user.id, firstRoleApp)
    await firstUpdateGate.reached

    let secondRoleSettled = false
    let thirdRoleSettled = false
    const secondRoleChange = Promise.resolve(promote(secondTarget.user.id)).finally(() => {
      secondRoleSettled = true
    })
    const thirdRoleChange = Promise.resolve(promote(thirdTarget.user.id)).finally(() => {
      thirdRoleSettled = true
    })
    await new Promise<void>((resolve) => setTimeout(resolve, 50))

    const loginRequest = (email: string) =>
      app.request('/api/auth/token/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: 'password123' }),
      })
    const queuedTargetLogins = Promise.all([
      loginRequest(secondTarget.user.email),
      loginRequest(thirdTarget.user.email),
    ])
    const loginOutcome = await Promise.race([
      queuedTargetLogins,
      new Promise<null>((resolve) => setTimeout(() => resolve(null), 1_000)),
    ])

    const roleChangesWereQueued = !secondRoleSettled && !thirdRoleSettled
    firstUpdateGate.release()
    const roleResponses = await Promise.all([
      firstRoleChange,
      secondRoleChange,
      thirdRoleChange,
    ])
    const loginResponses = loginOutcome ?? await queuedTargetLogins

    expect(roleChangesWereQueued).toBe(true)
    expect(loginOutcome).not.toBeNull()
    expect(loginResponses.map(({ status }) => status)).toEqual([200, 200])
    expect(roleResponses.map(({ status }) => status)).toEqual([200, 200, 200])
  })

  test('makes old-password login wait beyond the default transaction timeout when bootstrap owns authentication authority', async () => {
    const existing = await register('bootstrap-reset-wins@example.com')
    const userUpdateGate = gateNextUserUpdate(existing.user.id)
    const reset = bootstrapAdmin(userUpdateGate.db, {
      email: existing.user.email,
      password: 'new-bootstrap-password',
    })
    await userUpdateGate.reached

    let loginSettled = false
    const oldPasswordLogin = Promise.resolve(app.request('/api/auth/token/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: existing.user.email,
        password: 'password123',
      }),
    })).finally(() => {
      loginSettled = true
    })
    await new Promise<void>((resolve) => setTimeout(resolve, 5_250))
    const loginSettledBeforeReset = loginSettled
    userUpdateGate.release()

    const [, loginResponse] = await Promise.all([reset, oldPasswordLogin])
    expect(loginSettledBeforeReset).toBe(false)
    expect(loginResponse.status).toBe(401)
  }, 15_000)

  test('revokes a password login that wins session issuance before bootstrap reset', async () => {
    const existing = await register('login-before-bootstrap-reset@example.com')
    const sessionCreateGate = gateNextSessionCreate()
    const loginApp = createApp({ env, prisma: sessionCreateGate.db })
    const login = loginApp.request('/api/auth/token/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: existing.user.email,
        password: 'password123',
      }),
    })
    await sessionCreateGate.reached

    let resetSettled = false
    const reset = bootstrapAdmin(prisma, {
      email: existing.user.email,
      password: 'newer-bootstrap-password',
    }).finally(() => {
      resetSettled = true
    })
    await new Promise<void>((resolve) => setTimeout(resolve, 50))
    const resetSettledBeforeLogin = resetSettled
    sessionCreateGate.release()

    const [loginResponse] = await Promise.all([login, reset])
    const loginBody = await loginResponse.json()
    expect(loginResponse.status).toBe(200)
    expect(resetSettledBeforeLogin).toBe(false)
    expect(await app.request('/api/auth/me', {
      headers: authenticatedHeaders(loginBody.accessToken),
    })).toHaveProperty('status', 401)
  })

  test('issues a fresh-role login when role mutation owns authentication authority first', async () => {
    const admin = await register('role-first-admin@example.com')
    await prisma.user.update({
      where: { id: admin.user.id },
      data: { role: 'admin' },
    })
    const target = await register('role-first-target@example.com')
    const userUpdateGate = gateNextUserUpdate(target.user.id)
    const roleApp = createApp({ env, prisma: userUpdateGate.db })
    const roleChange = roleApp.request(`/api/admin/users/${target.user.id}/role`, {
      method: 'PATCH',
      headers: authenticatedJsonHeaders(admin.accessToken),
      body: JSON.stringify({ role: 'admin' }),
    })
    await userUpdateGate.reached

    let loginSettled = false
    const targetLogin = Promise.resolve(app.request('/api/auth/token/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: target.user.email,
        password: 'password123',
      }),
    })).finally(() => {
      loginSettled = true
    })
    await new Promise<void>((resolve) => setTimeout(resolve, 50))
    const loginSettledBeforeRoleChange = loginSettled
    userUpdateGate.release()

    const [roleResponse, loginResponse] = await Promise.all([roleChange, targetLogin])
    const loginBody = await loginResponse.json()
    expect(roleResponse.status).toBe(200)
    expect(loginSettledBeforeRoleChange).toBe(false)
    expect(loginResponse.status).toBe(200)
    expect(loginBody.user.role).toBe('admin')
    expect(await app.request('/api/auth/me', {
      headers: authenticatedHeaders(loginBody.accessToken),
    })).toHaveProperty('status', 200)
  })

  test('seeds a locked admin idempotently and unlocks it only with an explicit password', async () => {
    await expect(assertLoginCapableAdmin(prisma)).rejects.toThrow(
      'password credential',
    )
    const localConfig = parseAdminSeedConfig({}, { requirePassword: false })
    expect(await bootstrapAdmin(prisma, localConfig)).toEqual({
      email: 'admin@example.com',
      locked: true,
    })
    const seeded = await prisma.user.findUniqueOrThrow({
      where: { email: 'admin@example.com' },
    })
    expect(seeded).toMatchObject({ passwordHash: null, role: 'admin' })
    const lockedLogin = await app.request('/api/auth/token/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@example.com',
        password: 'a-strong-local-admin-password',
      }),
    })
    expect(lockedLogin.status).toBe(401)

    const existingPasswordHash = await Bun.password.hash('existing-admin-password', {
      algorithm: 'argon2id',
    })
    await prisma.user.update({
      where: { id: seeded.id },
      data: { passwordHash: existingPasswordHash },
    })
    expect(await bootstrapAdmin(prisma, localConfig)).toEqual({
      email: 'admin@example.com',
      locked: false,
    })
    expect(
      await prisma.user.findUniqueOrThrow({
        where: { id: seeded.id },
        select: { passwordHash: true },
      }),
    ).toEqual({ passwordHash: existingPasswordHash })

    const password = 'a-strong-local-admin-password'
    await bootstrapAdmin(
      prisma,
      parseAdminSeedConfig(
        {
          ADMIN_SEED_EMAIL: 'admin@example.com',
          ADMIN_SEED_PASSWORD: password,
        },
        { requirePassword: false },
      ),
    )
    const unlocked = await prisma.user.findUniqueOrThrow({
      where: { id: seeded.id },
      select: { passwordHash: true },
    })
    expect(unlocked.passwordHash).not.toBeNull()
    expect(await Bun.password.verify(password, unlocked.passwordHash!)).toBe(true)
    await expect(assertLoginCapableAdmin(prisma)).resolves.toBeUndefined()
  })

  test('concurrent first-admin bootstraps converge on one idempotent account', async () => {
    const config = {
      email: 'concurrent-bootstrap@example.com',
      password: null,
    }
    const results = await Promise.all([
      bootstrapAdmin(prisma, config),
      bootstrapAdmin(prisma, config),
    ])

    expect(results).toEqual([
      { email: config.email, locked: true },
      { email: config.email, locked: true },
    ])
    expect(await prisma.user.count({ where: { email: config.email } })).toBe(1)
    expect(await prisma.user.findUniqueOrThrow({
      where: { email: config.email },
      select: { passwordHash: true, role: true },
    })).toEqual({ passwordHash: null, role: 'admin' })
  })

  test('revokes existing sessions when bootstrap changes privileges or credentials', async () => {
    const existing = await register('bootstrap-existing@example.com')
    const resetTokenBeforeBootstrap = 'b'.repeat(43)
    await createOutstandingPasswordResetToken(existing.user.id, resetTokenBeforeBootstrap)

    await bootstrapAdmin(prisma, {
      email: existing.user.email,
      password: null,
    })

    expect(await app.request('/api/auth/me', {
      headers: authenticatedHeaders(existing.accessToken),
    })).toHaveProperty('status', 401)
    await expectPasswordResetRejected(resetTokenBeforeBootstrap)
    expect(await prisma.user.findUniqueOrThrow({
      where: { id: existing.user.id },
      select: { role: true },
    })).toEqual({ role: 'admin' })

    const relogin = await login(existing.user.email)
    const replacementPassword = 'replacement-admin-password'

    await bootstrapAdmin(prisma, {
      email: existing.user.email,
      password: replacementPassword,
    })

    expect(await app.request('/api/auth/me', {
      headers: authenticatedHeaders(relogin.accessToken),
    })).toHaveProperty('status', 401)
    const oldPasswordLogin = await app.request('/api/auth/token/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: existing.user.email,
        password: 'password123',
      }),
    })
    expect(oldPasswordLogin.status).toBe(401)
    const replacementPasswordLogin = await app.request('/api/auth/token/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: existing.user.email,
        password: replacementPassword,
      }),
    })
    expect(replacementPasswordLogin.status).toBe(200)
    const replacementSession = await replacementPasswordLogin.json()
    const hashBeforeIdempotentSeed = await prisma.user.findUniqueOrThrow({
      where: { id: existing.user.id },
      select: { passwordHash: true },
    })

    await bootstrapAdmin(prisma, {
      email: existing.user.email,
      password: replacementPassword,
    })

    expect(await prisma.user.findUniqueOrThrow({
      where: { id: existing.user.id },
      select: { passwordHash: true },
    })).toEqual(hashBeforeIdempotentSeed)
    expect(await app.request('/api/auth/me', {
      headers: authenticatedHeaders(replacementSession.accessToken),
    })).toHaveProperty('status', 200)
  })

  test('persists the current-user plan library across reads', async () => {
    const session = await register('plan-library@example.com', 'Plan User')
    const authored = {
      id: 'plan_11111111-1111-4111-8111-111111111111',
      title: 'Офис',
      description: 'День в офисе',
      coverImage: '/catalog/office.jpg',
      createdAt: '2026-09-01T00:00:00.000Z',
      goal: 'Похудение',
      sourceCatalogId: 'catalog_office',
    }

    const empty = await app.request('/api/users/me/plan-library', {
      headers: authenticatedHeaders(session.accessToken),
    })
    expect(empty.status).toBe(200)
    expect(await empty.json()).toEqual({
      authoredPlans: [],
      savedPlanIds: [],
      selectedPlanIds: [],
      planStarts: [],
      updatedAt: null,
    })

    const saved = await app.request('/api/users/me/plan-library', {
      method: 'PUT',
      headers: authenticatedJsonHeaders(session.accessToken),
      body: JSON.stringify({
        authoredPlans: [authored],
        savedPlanIds: ['catalog_loss'],
        selectedPlanIds: [authored.id],
        planStarts: [{ planId: authored.id, dayKey: '2026-09-01' }],
      }),
    })
    expect(saved.status).toBe(200)
    const savedBody = await saved.json()
    expect(savedBody).toMatchObject({
      authoredPlans: [authored],
      savedPlanIds: ['catalog_loss'],
      selectedPlanIds: [authored.id],
      planStarts: [{ planId: authored.id, dayKey: '2026-09-01' }],
    })
    expect(typeof savedBody.updatedAt).toBe('string')

    const reread = await app.request('/api/users/me/plan-library', {
      headers: authenticatedHeaders(session.accessToken),
    })
    expect(reread.status).toBe(200)
    expect(await reread.json()).toEqual(savedBody)
  })

  function createOutstandingPasswordResetToken(userId: string, token: string) {
    return prisma.passwordResetToken.create({
      data: {
        userId,
        tokenHash: createHash('sha256').update(token).digest('hex'),
        expiresAt: new Date(Date.now() + 30 * 60 * 1_000),
      },
    })
  }

  async function expectPasswordResetRejected(token: string) {
    const response = await app.request('/api/auth/password-reset/confirm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, password: 'late-reset-password' }),
    })
    expect(response.status).toBe(400)
    expect((await response.json()).error.code).toBe('AUTH_PASSWORD_RESET_INVALID')
  }

  function gateNextSessionCreate() {
    let markReached: () => void = () => undefined
    const reached = new Promise<void>((resolve) => {
      markReached = resolve
    })
    let releaseGate: () => void = () => undefined
    const barrier = new Promise<void>((resolve) => {
      releaseGate = resolve
    })
    let released = false
    const release = () => {
      if (released) return
      released = true
      pendingGateReleases.delete(release)
      releaseGate()
    }
    pendingGateReleases.add(release)
    let gated = false
    const db = prisma.$extends({
      query: {
        authSession: {
          async create({ args, query }) {
            if (!gated) {
              gated = true
              markReached()
              await barrier
            }
            return query(args)
          },
        },
      },
    }) as unknown as DbClient
    return { db, reached, release }
  }

  function gateNextUserUpdate(userId: string) {
    let markReached: () => void = () => undefined
    const reached = new Promise<void>((resolve) => {
      markReached = resolve
    })
    let releaseGate: () => void = () => undefined
    const barrier = new Promise<void>((resolve) => {
      releaseGate = resolve
    })
    let released = false
    const release = () => {
      if (released) return
      released = true
      pendingGateReleases.delete(release)
      releaseGate()
    }
    pendingGateReleases.add(release)
    let gated = false
    const db = prisma.$extends({
      query: {
        user: {
          async update({ args, query }) {
            const updated = await query(args)
            if (!gated && args.where.id === userId) {
              gated = true
              markReached()
              await barrier
            }
            return updated
          },
        },
      },
    }) as unknown as DbClient
    return { db, reached, release }
  }

  async function register(
    email: string,
    displayName?: string,
    role: 'user' | 'mentor' = 'user',
    mentorIdentifier?: string,
    referralCode?: string,
  ) {
    const response = await app.request('/api/auth/token/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        password: 'password123',
        displayName,
        role,
        mentorIdentifier,
        referralCode,
      }),
    })
    expect(response.status).toBe(201)
    return response.json()
  }

  async function login(email: string) {
    const response = await app.request('/api/auth/token/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        password: 'password123',
      }),
    })
    expect(response.status).toBe(200)
    return response.json()
  }
})

function authenticatedHeaders(accessToken: string) {
  return {
    Authorization: `Bearer ${accessToken}`,
  }
}

function authenticatedJsonHeaders(accessToken: string) {
  return {
    ...authenticatedHeaders(accessToken),
    'Content-Type': 'application/json',
  }
}
