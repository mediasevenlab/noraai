import {
  mealCategorySchema,
  mealSlotSchema,
  mealVersionSchema,
  normalizeMicronutrients,
  normalizePortionItems,
  telegramPhoneSchema,
  telegramUsernameSchema,
} from '@web-app-demo/contracts'

import type { DbClient } from '../../../db'
import { Prisma } from '../../../generated/prisma/client'
import type { MealRecord, MealsRepository } from '../application/ports'
import { MealsFailure } from '../domain/errors'
import type { MealVersionRecord } from '../domain/meal-versions'
import { extraImageKeysOf } from '../domain/meal-versions'

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value.map((item) => String(item ?? '').trim()).filter(Boolean)
}

function asVersions(value: unknown): MealVersionRecord[] {
  if (!Array.isArray(value)) return []
  const versions: MealVersionRecord[] = []
  for (const item of value) {
    const extraImageKeys = extraImageKeysOf(
      item && typeof item === 'object' ? (item as { extraImageKeys?: string[] }) : undefined,
    )
    const withoutKeys =
      item && typeof item === 'object'
        ? Object.fromEntries(Object.entries(item).filter(([key]) => key !== 'extraImageKeys'))
        : item
    const parsed = mealVersionSchema.safeParse(withoutKeys)
    if (parsed.success) versions.push({ ...parsed.data, extraImageKeys })
  }
  return versions
}

function toMealRecord(row: {
  id: string
  userId: string
  title: string
  ingredients: string
  category: string
  mealSlot: string
  recordedAt: Date
  kcal: number
  protein: number
  fat: number
  carbs: number
  portionItems: Prisma.JsonValue
  clientComment: string
  assumptions: Prisma.JsonValue
  micronutrients: Prisma.JsonValue
  versions: Prisma.JsonValue
  activeVersionId: string | null
  source: 'telegram' | 'manual'
  telegramUpdateId: string | null
  clientKey: string | null
  imageKey: string | null
  imageMime: string | null
  sharedAt: Date | null
  createdAt: Date
}): MealRecord {
  return {
    id: row.id,
    userId: row.userId,
    title: row.title,
    ingredients: row.ingredients,
    category: row.category,
    mealSlot: row.mealSlot,
    recordedAt: row.recordedAt,
    kcal: row.kcal,
    protein: row.protein,
    fat: row.fat,
    carbs: row.carbs,
    portionItems: normalizePortionItems(row.portionItems),
    clientComment: row.clientComment,
    assumptions: asStringArray(row.assumptions),
    micronutrients: normalizeMicronutrients(row.micronutrients),
    versions: asVersions(row.versions),
    activeVersionId: row.activeVersionId,
    source: row.source,
    telegramUpdateId: row.telegramUpdateId,
    clientKey: row.clientKey,
    imageKey: row.imageKey,
    imageMime: row.imageMime,
    sharedAt: row.sharedAt,
    createdAt: row.createdAt,
  }
}

const mealSelect = {
  id: true,
  userId: true,
  title: true,
  ingredients: true,
  category: true,
  mealSlot: true,
  recordedAt: true,
  kcal: true,
  protein: true,
  fat: true,
  carbs: true,
  portionItems: true,
  clientComment: true,
  assumptions: true,
  micronutrients: true,
  versions: true,
  activeVersionId: true,
  source: true,
  telegramUpdateId: true,
  clientKey: true,
  imageKey: true,
  imageMime: true,
  sharedAt: true,
  createdAt: true,
} as const

function authorLabel(user: { displayName: string | null; nickname: string | null }) {
  const name = user.displayName?.trim() || user.nickname?.trim()
  if (!name) return 'Пользователь'
  return name.length > 80 ? name.slice(0, 80) : name
}
export function createPrismaMealsRepository(db: DbClient): MealsRepository {
  return {
    async getTelegramPollerOffset(cursorId) {
      const cursor = await db.telegramPollerCursor.findUnique({ where: { id: cursorId } })
      return Number(cursor?.offset ?? 0n)
    },
    async advanceTelegramPollerOffset(cursorId, offset) {
      await db.telegramPollerCursor.upsert({
        where: { id: cursorId },
        create: { id: cursorId, offset: BigInt(offset) },
        update: { offset: BigInt(offset) },
      })
    },
    async findUserByTelegramUsername(username) {
      const normalized = telegramUsernameSchema.parse(username)
      const user = await db.user.findUnique({
        where: { telegramUsername: normalized },
        select: {
          id: true,
          publicId: true,
          displayName: true,
          telegramUsername: true,
          telegramPhone: true,
        },
      })
      if (!user) return null
      return {
        id: user.id,
        publicId: user.publicId,
        displayName: user.displayName,
        telegramUsername: user.telegramUsername,
        telegramPhone: user.telegramPhone,
      }
    },
    async findUserByTelegramPhone(phone) {
      const normalized = telegramPhoneSchema.parse(phone)
      const user = await db.user.findUnique({
        where: { telegramPhone: normalized },
        select: {
          id: true,
          publicId: true,
          displayName: true,
          telegramUsername: true,
          telegramPhone: true,
        },
      })
      if (!user) return null
      return {
        id: user.id,
        publicId: user.publicId,
        displayName: user.displayName,
        telegramUsername: user.telegramUsername,
        telegramPhone: user.telegramPhone,
      }
    },
    async findMealByTelegramUpdateId(telegramUpdateId) {
      const row = await db.meal.findUnique({
        where: { telegramUpdateId },
        select: mealSelect,
      })
      return row ? toMealRecord(row) : null
    },
    async findMealByClientKey(userId, clientKey) {
      const row = await db.meal.findUnique({
        where: { userId_clientKey: { userId, clientKey } },
        select: mealSelect,
      })
      return row ? toMealRecord(row) : null
    },
    async findMealById(mealId) {
      const row = await db.meal.findUnique({
        where: { id: mealId },
        select: mealSelect,
      })
      return row ? toMealRecord(row) : null
    },
    async listMealsForUser(userId) {
      const rows = await db.meal.findMany({
        where: { userId },
        orderBy: { recordedAt: 'desc' },
        select: mealSelect,
      })
      return rows.map(toMealRecord)
    },
    async listSharedMeals(limit, viewerUserId) {
      const rows = await db.meal.findMany({
        where: { sharedAt: { not: null } },
        orderBy: { sharedAt: 'desc' },
        take: limit,
        select: {
          ...mealSelect,
          user: { select: { displayName: true, nickname: true } },
          _count: { select: { likes: true } },
          likes: {
            where: { userId: viewerUserId },
            select: { userId: true },
            take: 1,
          },
        },
      })
      return rows.map((row) => ({
        ...toMealRecord(row),
        authorName: authorLabel(row.user),
        likeCount: row._count.likes,
        liked: row.likes.length > 0,
      }))
    },
    async isMentorOf(mentorUserId, menteeUserId) {
      const assignment = await db.mentorAssignment.findUnique({
        where: { menteeId: menteeUserId },
        select: { mentorId: true },
      })
      return assignment?.mentorId === mentorUserId
    },
    async listMenteeIdsForMentor(mentorUserId) {
      const rows = await db.mentorAssignment.findMany({
        where: { mentorId: mentorUserId },
        select: { menteeId: true },
        orderBy: { createdAt: 'desc' },
      })
      return rows.map((row) => row.menteeId)
    },
    async findMentorMealNotifyTarget(menteeUserId) {
      const assignment = await db.mentorAssignment.findUnique({
        where: { menteeId: menteeUserId },
        select: {
          mentorId: true,
          mentor: { select: { telegramChatId: true } },
          mentee: {
            select: {
              publicId: true,
              nickname: true,
              displayName: true,
            },
          },
        },
      })
      const telegramChatId = assignment?.mentor.telegramChatId
      if (!assignment || !telegramChatId) return null
      return {
        mentorId: assignment.mentorId,
        telegramChatId,
        mentee: assignment.mentee,
      }
    },
    async setTelegramChatId(userId, chatId) {
      const normalized = String(chatId).trim()
      if (!normalized) return
      await db.$transaction([
        db.user.updateMany({
          where: { telegramChatId: normalized, NOT: { id: userId } },
          data: { telegramChatId: null },
        }),
        db.user.update({
          where: { id: userId },
          data: { telegramChatId: normalized },
        }),
      ])
    },
    async listMentorMealCursors(mentorUserId, menteeIds) {
      if (menteeIds.length === 0) return []
      const rows = await db.mentorMenteeMealCursor.findMany({
        where: { mentorId: mentorUserId, menteeId: { in: menteeIds } },
        select: { menteeId: true, viewedAt: true },
      })
      return rows
    },
    async upsertMentorMealCursor(mentorUserId, menteeUserId, viewedAt) {
      const row = await db.mentorMenteeMealCursor.upsert({
        where: {
          mentorId_menteeId: { mentorId: mentorUserId, menteeId: menteeUserId },
        },
        create: { mentorId: mentorUserId, menteeId: menteeUserId, viewedAt },
        update: { viewedAt },
        select: { viewedAt: true },
      })
      return row.viewedAt
    },
    async listMealUnreadScan(userIds) {
      if (userIds.length === 0) return []
      const rows = await db.meal.findMany({
        where: { userId: { in: userIds } },
        select: {
          id: true,
          userId: true,
          assumptions: true,
          createdAt: true,
          updatedAt: true,
        },
      })
      return rows.map((row) => ({
        id: row.id,
        userId: row.userId,
        assumptions: asStringArray(row.assumptions),
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      }))
    },
    async listMentorViewedMealIds(mentorUserId) {
      const rows = await db.mentorMenteeMealView.findMany({
        where: { mentorId: mentorUserId },
        select: { mealId: true },
      })
      return rows.map((row) => row.mealId)
    },
    async insertMentorMealViews(mentorUserId, menteeUserId, mealIds) {
      if (mealIds.length === 0) return
      await db.mentorMenteeMealView.createMany({
        data: mealIds.map((mealId) => ({
          mentorId: mentorUserId,
          menteeId: menteeUserId,
          mealId,
        })),
        skipDuplicates: true,
      })
    },
    async findMealsByIds(ids) {
      if (ids.length === 0) return []
      const rows = await db.meal.findMany({
        where: { id: { in: ids } },
        select: {
          id: true,
          userId: true,
          assumptions: true,
          createdAt: true,
          updatedAt: true,
        },
      })
      return rows.map((row) => ({
        id: row.id,
        userId: row.userId,
        assumptions: asStringArray(row.assumptions),
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      }))
    },
    async createMeal(input) {
      try {
        const row = await db.meal.create({
          data: {
            ...(input.id ? { id: input.id } : {}),
            userId: input.userId,
            title: input.title,
            ingredients: input.ingredients,
            category: input.category,
            mealSlot: input.mealSlot,
            recordedAt: input.recordedAt,
            kcal: input.kcal,
            protein: input.protein,
            fat: input.fat,
            carbs: input.carbs,
            portionItems: input.portionItems,
            clientComment: input.clientComment,
            assumptions: input.assumptions,
            micronutrients: input.micronutrients,
            versions: input.versions ?? [],
            activeVersionId: input.activeVersionId ?? null,
            source: input.source,
            telegramUpdateId: input.telegramUpdateId ?? null,
            clientKey: input.clientKey ?? null,
            imageKey: input.imageKey ?? null,
            imageMime: input.imageMime ?? null,
          },
          select: mealSelect,
        })
        return toMealRecord(row)
      } catch (error) {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError
          && error.code === 'P2002'
        ) {
          throw new MealsFailure('conflict', 'Meal already exists for this idempotency key')
        }
        throw error
      }
    },
    async updateMealContent(mealId, content) {
      const data = {
        title: content.title,
        ingredients: content.ingredients,
        category: mealCategorySchema.parse(content.category),
        mealSlot: mealSlotSchema.parse(content.mealSlot),
        kcal: content.kcal,
        protein: content.protein,
        fat: content.fat,
        carbs: content.carbs,
        portionItems: content.portionItems,
        clientComment: content.clientComment,
        assumptions: content.assumptions,
        micronutrients: content.micronutrients,
        versions: content.versions,
        activeVersionId: content.activeVersionId,
        ...(content.recordedAt ? { recordedAt: content.recordedAt } : {}),
      }
      if (content.expectedActiveVersionId !== undefined) {
        const updated = await db.meal.updateMany({
          where: { id: mealId, activeVersionId: content.expectedActiveVersionId },
          data,
        })
        if (updated.count !== 1) {
          throw new MealsFailure('conflict', 'Meal changed while this update was in progress')
        }
      } else {
        await db.meal.update({
          where: { id: mealId },
          data,
        })
      }
      const row = await db.meal.findUnique({
        where: { id: mealId },
        select: mealSelect,
      })
      if (!row) throw new MealsFailure('not_found', 'Meal not found')
      return toMealRecord(row)
    },

    async setMealShared(mealId, sharedAt) {
      const row = await db.meal.update({
        where: { id: mealId },
        data: { sharedAt },
        select: mealSelect,
      })
      return toMealRecord(row)
    },

    async setMealLike(mealId, userId, liked) {
      if (liked) {
        await db.mealLike.upsert({
          where: { mealId_userId: { mealId, userId } },
          create: { mealId, userId },
          update: {},
        })
      } else {
        await db.mealLike.deleteMany({ where: { mealId, userId } })
      }
      const likeCount = await db.mealLike.count({ where: { mealId } })
      return { likeCount, liked }
    },

    async deleteMeal(mealId) {
      try {
        await db.meal.delete({ where: { id: mealId } })
      } catch (error) {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError
          && error.code === 'P2025'
        ) {
          throw new MealsFailure('not_found', 'Meal not found')
        }
        throw error
      }
    },
  }
}
