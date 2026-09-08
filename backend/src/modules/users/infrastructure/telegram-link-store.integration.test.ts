import { afterAll, beforeEach, describe, expect, test } from 'bun:test'

import { createPrisma } from '../../../db'
import { createTelegramLinkStore } from './telegram-link-store'

const databaseUrl = process.env.TEST_DATABASE_URL
const maybeDescribe = databaseUrl ? describe : describe.skip

maybeDescribe('telegram link store integration', () => {
  const prisma = createPrisma(databaseUrl!)
  const links = createTelegramLinkStore(prisma)

  beforeEach(async () => {
    await prisma.telegramLinkChallenge.deleteMany()
    await prisma.authSession.deleteMany()
    await prisma.user.deleteMany()
  })

  afterAll(async () => {
    await prisma.$disconnect()
  })

  test('completes a username challenge and rejects a second claim', async () => {
    const first = await prisma.user.create({
      data: {
        email: 'store-first@example.com',
        passwordHash: 'not-a-real-hash',
        displayName: 'First',
      },
    })
    const second = await prisma.user.create({
      data: {
        email: 'store-second@example.com',
        passwordHash: 'not-a-real-hash',
        displayName: 'Second',
      },
    })

    const started = await links.start(first.id, { telegramUsername: '  @Food_User  ' })
    const completed = await links.complete(started.code, { telegramUsername: 'food_user' })
    expect(completed).toEqual({ ok: true, userId: first.id })

    const startedChat = await links.start(first.id, { telegramUsername: 'food_user' })
    const withChat = await links.complete(
      startedChat.code,
      { telegramUsername: 'food_user' },
      { telegramChatId: '9988776655' },
    )
    expect(withChat).toEqual({ ok: true, userId: first.id })
    const stored = await prisma.user.findUnique({
      where: { id: first.id },
      select: { telegramChatId: true },
    })
    expect(stored?.telegramChatId).toBe('9988776655')

    const startedSecond = await links.start(second.id, { telegramUsername: 'FOOD_USER' })
    let taken: unknown
    try {
      await links.complete(startedSecond.code, { telegramUsername: 'food_user' })
    } catch (error) {
      taken = error
    }
    expect(taken).toMatchObject({ kind: 'telegram_username_taken' })
  })

  test('phone challenge waits for a shared contact instead of failing on /start', async () => {
    const mentor = await prisma.user.create({
      data: {
        email: 'store-phone@example.com',
        passwordHash: 'not-a-real-hash',
        displayName: 'Mentor',
        role: 'mentor',
      },
    })
    const started = await links.start(mentor.id, { telegramPhone: '+7 (913) 706-72-36' })
    expect(await links.complete(started.code, { telegramUsername: 'mediaseven' })).toEqual({
      ok: false,
      reason: 'phone_proof_required',
    })
    const stillOpen = await prisma.telegramLinkChallenge.findFirst({
      where: { userId: mentor.id, consumedAt: null },
    })
    expect(stillOpen).not.toBeNull()

    const completed = await links.complete(
      started.code,
      { telegramPhone: '79137067236' },
      { telegramChatId: '42' },
    )
    expect(completed).toEqual({ ok: true, userId: mentor.id })
    const stored = await prisma.user.findUnique({
      where: { id: mentor.id },
      select: { telegramPhone: true, telegramChatId: true },
    })
    expect(stored).toMatchObject({
      telegramPhone: '79137067236',
      telegramChatId: '42',
    })
  })
})
