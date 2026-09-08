import { afterAll, beforeEach, describe, expect, test } from 'bun:test'

import { createPrisma } from '../../../db'
import { backfillMealClientKeys } from './meal-client-key-backfill'

const databaseUrl = process.env.TEST_DATABASE_URL
const maybeDescribe = databaseUrl ? describe : describe.skip

maybeDescribe('meal clientKey backfill', () => {
  if (!databaseUrl) return

  const testDatabaseUrl = databaseUrl
  const prisma = createPrisma(testDatabaseUrl)

  beforeEach(async () => {
    await prisma.meal.deleteMany()
    await prisma.authSession.deleteMany()
    await prisma.user.deleteMany()
  })

  afterAll(async () => {
    await prisma.$disconnect()
  })

  test('moves legacy manual keys, leaves Telegram rows untouched, and is repeatable', async () => {
    const legacyOwner = await createUser('legacy-owner@example.com')
    const otherOwner = await createUser('other-owner@example.com')
    const legacy = await createMeal({
      userId: legacyOwner.id,
      source: 'manual',
      telegramUpdateId: 'shared-across-users',
    })
    const telegram = await createMeal({
      userId: legacyOwner.id,
      source: 'telegram',
      telegramUpdateId: 'tg-unchanged',
    })
    await createMeal({
      userId: otherOwner.id,
      source: 'manual',
      clientKey: 'shared-across-users',
    })

    expect(await runBackfill()).toEqual({ migrated: 1 })

    expect(await prisma.meal.findUnique({ where: { id: legacy.id } })).toMatchObject({
      source: 'manual',
      clientKey: 'shared-across-users',
      telegramUpdateId: null,
    })
    expect(await prisma.meal.findUnique({ where: { id: telegram.id } })).toMatchObject({
      source: 'telegram',
      clientKey: null,
      telegramUpdateId: 'tg-unchanged',
    })
    expect(await runBackfill()).toEqual({ migrated: 0 })
  })

  test('fails before changing any row when an owner already has the legacy clientKey', async () => {
    const owner = await createUser('conflict-owner@example.com')
    const legacy = await createMeal({
      userId: owner.id,
      source: 'manual',
      telegramUpdateId: 'conflicting-key',
    })
    const nonConflicting = await createMeal({
      userId: owner.id,
      source: 'manual',
      telegramUpdateId: 'safe-key',
    })
    await createMeal({
      userId: owner.id,
      source: 'manual',
      clientKey: 'conflicting-key',
    })

    await expect(runBackfill()).rejects.toThrow(
      'Meal clientKey backfill conflict',
    )

    expect(await prisma.meal.findUnique({ where: { id: legacy.id } })).toMatchObject({
      clientKey: null,
      telegramUpdateId: 'conflicting-key',
    })
    expect(await prisma.meal.findUnique({ where: { id: nonConflicting.id } })).toMatchObject({
      clientKey: null,
      telegramUpdateId: 'safe-key',
    })
  })

  async function createUser(email: string) {
    return prisma.user.create({ data: { email } })
  }

  async function runBackfill() {
    const deploymentPrisma = createPrisma(testDatabaseUrl)
    try {
      return await backfillMealClientKeys(deploymentPrisma)
    } finally {
      await deploymentPrisma.$disconnect()
    }
  }

  async function createMeal(input: {
    userId: string
    source: 'manual' | 'telegram'
    telegramUpdateId?: string
    clientKey?: string
  }) {
    return prisma.meal.create({
      data: {
        userId: input.userId,
        title: 'Тест',
        category: 'Завтрак',
        mealSlot: 'Завтрак',
        recordedAt: new Date('2026-08-24T10:00:00.000Z'),
        kcal: 1,
        protein: 0,
        fat: 0,
        carbs: 0,
        source: input.source,
        telegramUpdateId: input.telegramUpdateId,
        clientKey: input.clientKey,
      },
    })
  }
})
