import type {
  AdminUserSummary,
  AdminUsersQuery,
  UserRole,
} from '@web-app-demo/contracts'
import {
  ADMIN_USERS_MAX_PAGE,
  isDefaultUserEmail,
  questionnaireAnswersSchema,
} from '@web-app-demo/contracts'

import {
  acquireUserAuthenticationAuthorityLock,
  acquireUserRoleMutationLock,
  type DbClient,
  userAuthorityTransitionTransactionOptions,
} from '../../../db'
import { Prisma } from '../../../generated/prisma/client'
import {
  WEEK_PLAN_ID_PREFIX,
  RATION_PLAN_ID_PREFIX,
  authoredPlansWithoutRation,
  isDeletableRationId,
  jsonWithoutPlanIds,
  mealRemovedWithRation,
  planStartsWithoutRation,
  rationIdsRemovedWith,
} from '../domain/ration-delete'
import type {
  AdminDashboardReader,
  AdminUsersReader,
  CurrentUserMentorReader,
  MentorUsersManager,
  ProfileWriter,
  QuestionnaireStore,
  MentorPlansStore,
  PlanAssignmentsStore,
  RationCleanup,
  UserFavoritesStore,
  UserPlanLibraryStore,
  UserMentorConnector,
  UserDeleter,
  UserRoleUpdater,
  UserReferralsReader,
  SharedRationsStore,
} from '../application/ports'
import { UsersFailure } from '../domain/errors'
import { uuidMealIds } from '../domain/favorite-meal-ids'
import {
  generationSpendFromAccount,
  parseGenerationAccount,
  settleLegacyGenerationLedgers,
  sumSettledGenerationSpend,
} from '../../meals'

const userSummarySelect = {
  id: true,
  publicId: true,
  email: true,
  displayName: true,
  nickname: true,
  telegramUsername: true,
  telegramPhone: true,
  role: true,
  createdAt: true,
  generationUsage: true,
} as const

type UsersRepository =
  & ProfileWriter
  & AdminDashboardReader
  & AdminUsersReader
  & CurrentUserMentorReader
  & MentorUsersManager
  & UserMentorConnector
  & UserDeleter
  & UserRoleUpdater
  & UserReferralsReader
  & QuestionnaireStore
  & PlanAssignmentsStore
  & UserFavoritesStore
  & UserPlanLibraryStore
  & MentorPlansStore
  & SharedRationsStore
  & RationCleanup

export function createPrismaUsersRepository(db: DbClient): UsersRepository {
  return {
    async getPlanAssignment(userId) {
      const assignment = await db.planAssignment.findUnique({ where: { userId } })
      if (!assignment) return null
      return {
        planIds: Array.isArray(assignment.planIds)
          ? assignment.planIds.filter((id): id is string => typeof id === 'string')
          : [],
        updatedAt: assignment.updatedAt,
      }
    },
    async putPlanAssignment(input) {
      const assignment = await db.planAssignment.upsert({
        where: { userId: input.userId },
        create: {
          userId: input.userId,
          planIds: input.planIds,
          updatedById: input.mentorUserId,
        },
        update: {
          planIds: input.planIds,
          updatedById: input.mentorUserId,
        },
      })
      return { planIds: input.planIds, updatedAt: assignment.updatedAt }
    },
    async getFavorites(userId) {
      const row = await db.userSavedItems.findUnique({ where: { userId } })
      if (!row) return null
      return {
        mealIds: stringIds(row.mealIds),
        updatedAt: row.updatedAt,
      }
    },
    async putFavorites(input) {
      const row = await db.userSavedItems.upsert({
        where: { userId: input.userId },
        create: {
          userId: input.userId,
          mealIds: input.mealIds,
        },
        update: {
          mealIds: input.mealIds,
        },
      })
      return {
        mealIds: input.mealIds,
        updatedAt: row.updatedAt,
      }
    },
    async getPlanLibrary(userId) {
      const row = await db.userPlanLibrary.findUnique({ where: { userId } })
      if (!row) return null
      return {
        authoredPlans: row.authoredPlans,
        savedPlanIds: row.savedPlanIds,
        selectedPlanIds: row.selectedPlanIds,
        planStarts: row.planStarts,
        updatedAt: row.updatedAt,
      }
    },
    async putPlanLibrary(input) {
      const row = await db.userPlanLibrary.upsert({
        where: { userId: input.userId },
        create: {
          userId: input.userId,
          authoredPlans: input.authoredPlans as Prisma.InputJsonValue,
          savedPlanIds: input.savedPlanIds as Prisma.InputJsonValue,
          selectedPlanIds: input.selectedPlanIds as Prisma.InputJsonValue,
          planStarts: input.planStarts as Prisma.InputJsonValue,
        },
        update: {
          authoredPlans: input.authoredPlans as Prisma.InputJsonValue,
          savedPlanIds: input.savedPlanIds as Prisma.InputJsonValue,
          selectedPlanIds: input.selectedPlanIds as Prisma.InputJsonValue,
          planStarts: input.planStarts as Prisma.InputJsonValue,
        },
      })
      return {
        authoredPlans: input.authoredPlans,
        savedPlanIds: input.savedPlanIds,
        selectedPlanIds: input.selectedPlanIds,
        planStarts: input.planStarts,
        updatedAt: row.updatedAt,
      }
    },
    async filterOwnedMealIds(userId, mealIds) {
      const lookupIds = uuidMealIds(mealIds)
      if (lookupIds.length === 0) return []
      const rows = await db.meal.findMany({
        where: { userId, id: { in: lookupIds } },
        select: { id: true },
      })
      const owned = new Set(rows.map((row) => row.id))
      return lookupIds.filter((id) => owned.has(id))
    },
    async listMentorPlans(mentorId) {
      return db.mentorPlan.findMany({
        where: { mentorId },
        orderBy: { updatedAt: 'desc' },
      })
    },
    async getMentorPlan(mentorId, planId) {
      return db.mentorPlan.findFirst({
        where: { id: planId, mentorId },
      })
    },
    async listPlansByIds(ids) {
      if (ids.length === 0) return []
      return db.mentorPlan.findMany({
        where: { id: { in: ids } },
      })
    },
    async createMentorPlan(input) {
      return db.mentorPlan.create({
        data: {
          mentorId: input.mentorId,
          title: input.title,
          description: input.description,
          goal: input.goal,
          source: input.source,
          image: input.image,
          days: input.days,
          mealsPerDay: input.mealsPerDay,
          meals: input.meals as Prisma.InputJsonValue,
          kcal: input.kcal,
          protein: input.protein,
          fat: input.fat,
          carbs: input.carbs,
        },
      })
    },
    async updateMentorPlan(input) {
      const existing = await db.mentorPlan.findFirst({
        where: { id: input.planId, mentorId: input.mentorId },
        select: { id: true },
      })
      if (!existing) {
        throw new UsersFailure('not_found', 'Plan not found')
      }
      return db.mentorPlan.update({
        where: { id: input.planId },
        data: {
          title: input.title,
          description: input.description,
          goal: input.goal,
          source: input.source,
          image: input.image,
          days: input.days,
          mealsPerDay: input.mealsPerDay,
          meals: input.meals as Prisma.InputJsonValue,
          kcal: input.kcal,
          protein: input.protein,
          fat: input.fat,
          carbs: input.carbs,
        },
      })
    },
    async deleteMentorPlan(mentorId, planId) {
      const existing = await db.mentorPlan.findFirst({
        where: { id: planId, mentorId },
        select: { id: true },
      })
      if (!existing) {
        throw new UsersFailure('not_found', 'Plan not found')
      }
      await forgetRationRecords(db, planId)
      await db.mentorPlan.delete({ where: { id: planId } })
    },
    async forgetRation(planId, userId) {
      if (!isDeletableRationId(planId)) {
        throw new UsersFailure('invalid', 'Invalid plan id')
      }
      await forgetRationRecords(db, planId, userId)
    },
    async findByAuthorAndSource(authorId, sourcePlanId) {
      const row = await db.sharedRation.findUnique({
        where: { authorId_sourcePlanId: { authorId, sourcePlanId } },
      })
      return row ? toSharedRationRecord(row) : null
    },
    async findById(id) {
      const row = await db.sharedRation.findUnique({ where: { id } })
      return row ? toSharedRationRecord(row) : null
    },
    async upsertShared(input) {
      const row = await db.sharedRation.upsert({
        where: {
          authorId_sourcePlanId: {
            authorId: input.authorId,
            sourcePlanId: input.sourcePlanId,
          },
        },
        create: {
          authorId: input.authorId,
          sourcePlanId: input.sourcePlanId,
          title: input.title,
          description: input.description,
          goal: input.goal,
          coverImage: input.coverImage,
          days: input.days,
          meals: input.meals as Prisma.InputJsonValue,
          kcal: input.kcal,
          protein: input.protein,
          fat: input.fat,
          carbs: input.carbs,
          sharedAt: input.sharedAt,
        },
        update: {
          title: input.title,
          description: input.description,
          goal: input.goal,
          coverImage: input.coverImage,
          days: input.days,
          meals: input.meals as Prisma.InputJsonValue,
          kcal: input.kcal,
          protein: input.protein,
          fat: input.fat,
          carbs: input.carbs,
          sharedAt: input.sharedAt,
        },
      })
      return toSharedRationRecord(row)
    },
    async setSharedAt(id, sharedAt) {
      const row = await db.sharedRation.update({
        where: { id },
        data: { sharedAt },
      })
      return toSharedRationRecord(row)
    },
    async listShared(limit, viewerUserId) {
      const rows = await db.sharedRation.findMany({
        where: { sharedAt: { not: null } },
        orderBy: { sharedAt: 'desc' },
        take: limit,
        include: {
          author: { select: { displayName: true, nickname: true } },
          _count: { select: { likes: true } },
          likes: {
            where: { userId: viewerUserId },
            select: { createdAt: true },
            take: 1,
          },
        },
      })
      return rows.map((row) =>
        toSharedRationRecord(row, {
          authorName: sharedRationAuthorLabel(row.author),
          likeCount: row._count.likes,
          liked: row.likes.length > 0,
          likedAt: row.likes[0]?.createdAt ?? null,
        }),
      )
    },
    async setLiked(rationId, userId, liked) {
      if (liked) {
        await db.sharedRationLike.upsert({
          where: { rationId_userId: { rationId, userId } },
          create: { rationId, userId },
          update: {},
        })
      } else {
        await db.sharedRationLike.deleteMany({ where: { rationId, userId } })
      }
      const row = await db.sharedRation.findUnique({
        where: { id: rationId },
        include: {
          author: { select: { displayName: true, nickname: true } },
          _count: { select: { likes: true } },
          likes: {
            where: { userId },
            select: { createdAt: true },
            take: 1,
          },
        },
      })
      if (!row) {
        throw new UsersFailure('not_found', 'Ration not found')
      }
      return toSharedRationRecord(row, {
        authorName: sharedRationAuthorLabel(row.author),
        likeCount: row._count.likes,
        liked: row.likes.length > 0,
        likedAt: row.likes[0]?.createdAt ?? null,
      })
    },
    async getQuestionnaire(userId) {
      const row = await db.userQuestionnaireProfile.findUnique({
        where: { userId },
        select: {
          answers: true,
          version: true,
          completedAt: true,
        },
      })
      if (!row) return null
      return {
        answers: questionnaireAnswersSchema.parse(row.answers),
        version: row.version,
        completedAt: row.completedAt,
      }
    },

    async upsertQuestionnaire(userId, answers, completedAt) {
      const row = await db.userQuestionnaireProfile.upsert({
        where: { userId },
        create: {
          userId,
          answers,
          completedAt,
          version: 1,
        },
        update: {
          answers,
          completedAt,
          version: { increment: 1 },
        },
        select: {
          answers: true,
          version: true,
          completedAt: true,
        },
      })
      return {
        answers: questionnaireAnswersSchema.parse(row.answers),
        version: row.version,
        completedAt: row.completedAt,
      }
    },

    async hasCompletedQuestionnaire(userId) {
      const row = await db.userQuestionnaireProfile.findUnique({
        where: { userId },
        select: { completedAt: true },
      })
      return row?.completedAt != null
    },

    async updateProfile(userId, input) {
      try {
        if (input.nickname !== undefined) {
          const user = await db.user.findUnique({
            where: { id: userId },
            select: { email: true },
          })
          if (user && isDefaultUserEmail(user.email)) {
            throw new UsersFailure(
              'nickname_locked',
              'The nickname of a default user cannot be changed',
            )
          }
        }
        const data = {
          ...input,
          ...(input.telegramUsername === null && input.telegramPhone === null
            ? { telegramChatId: null }
            : {}),
        }
        return await db.user.update({
          where: { id: userId },
          data,
          select: userSummarySelect,
        })
      } catch (error) {
        if (isUniqueConstraintError(error)) {
          const targets = uniqueConstraintTargets(error)
          if (targets.some((target) => target.includes('telegram_phone') || target.includes('telegramPhone'))) {
            throw new UsersFailure(
              'telegram_phone_taken',
              'This Telegram phone is already taken',
            )
          }
          if (targets.some((target) => target.includes('telegram'))) {
            throw new UsersFailure(
              'telegram_username_taken',
              'This Telegram username is already taken',
            )
          }
          throw new UsersFailure('nickname_taken', 'This nickname is already taken')
        }
        throw error
      }
    },

    async dashboard(createdAfter) {
      const [totalUsers, totalAdmins, newUsersLast7Days] = await db.$transaction([
        db.user.count(),
        db.user.count({ where: { role: 'admin' } }),
        db.user.count({ where: { createdAt: { gte: createdAfter } } }),
      ])
      return { totalUsers, totalAdmins, newUsersLast7Days }
    },

    async listUsers({ page, pageSize, q, role }: AdminUsersQuery) {
      await settleLegacyGenerationLedgers(db)
      const where = {
        ...(role ? { role } : {}),
        ...(q
          ? {
              OR: [
                { email: { contains: q, mode: 'insensitive' as const } },
                { displayName: { contains: q, mode: 'insensitive' as const } },
                { nickname: { contains: q, mode: 'insensitive' as const } },
                ...(isPublicId(q) ? [{ publicId: Number(q) }] : []),
              ],
            }
          : {}),
      }
      const [total, users, usageRows] = await db.$transaction([
        db.user.count({ where }),
        db.user.findMany({
          where,
          orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
          skip: (page - 1) * pageSize,
          take: pageSize,
          select: userSummarySelect,
        }),
        db.user.findMany({ select: { generationUsage: true } }),
      ])
      const totalSpend = sumSettledGenerationSpend(usageRows.map((row) => row.generationUsage))
      return {
        items: users.map(toAdminUserSummary),
        page,
        pageSize,
        total,
        hasNext: page < ADMIN_USERS_MAX_PAGE && page * pageSize < total,
        ...(totalSpend.tokens > 0 ? { generationSpend: totalSpend } : {}),
      }
    },

    async getCurrentUserMentor(userId) {
      await assertUser(db, userId)
      const assignment = await db.mentorAssignment.findUnique({
        where: { menteeId: userId },
        select: { mentor: { select: userSummarySelect } },
      })
      return assignment ? toAdminUserSummary(assignment.mentor) : null
    },

    async listUserReferrals(userId, { page, pageSize, q }) {
      await assertUser(db, userId)
      const where = {
        referredByUserId: userId,
        ...(q
          ? {
              OR: [
                { email: { contains: q, mode: 'insensitive' as const } },
                { displayName: { contains: q, mode: 'insensitive' as const } },
                { nickname: { contains: q, mode: 'insensitive' as const } },
                ...(isPublicId(q) ? [{ publicId: Number(q) }] : []),
              ],
            }
          : {}),
      }
      const [total, users] = await db.$transaction([
        db.user.count({ where }),
        db.user.findMany({
          where,
          orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
          skip: (page - 1) * pageSize,
          take: pageSize,
          select: userSummarySelect,
        }),
      ])
      return {
        items: users.map(toAdminUserSummary),
        page,
        pageSize,
        total,
        hasNext: page < ADMIN_USERS_MAX_PAGE && page * pageSize < total,
      }
    },

    async listMentorUsers(mentorUserId, { page, pageSize, q }) {
      await assertMentor(db, mentorUserId)
      const where = {
        mentorId: mentorUserId,
        ...(q
          ? {
              mentee: {
                OR: [
                  { email: { contains: q, mode: 'insensitive' as const } },
                  { displayName: { contains: q, mode: 'insensitive' as const } },
                  { nickname: { contains: q, mode: 'insensitive' as const } },
                  ...(isPublicId(q) ? [{ publicId: Number(q) }] : []),
                  ...(isUuid(q) ? [{ id: q }] : []),
                ],
              },
            }
          : {}),
      }
      const [total, assignments] = await db.$transaction([
        db.mentorAssignment.count({ where }),
        db.mentorAssignment.findMany({
          where,
          orderBy: [{ createdAt: 'desc' }, { menteeId: 'desc' }],
          skip: (page - 1) * pageSize,
          take: pageSize,
          select: {
            mentee: { select: userSummarySelect },
          },
        }),
      ])
      return {
        items: assignments.map(({ mentee }) => toAdminUserSummary(mentee)),
        page,
        pageSize,
        total,
        hasNext: page < ADMIN_USERS_MAX_PAGE && page * pageSize < total,
      }
    },

    async connectCurrentUserToMentor(userId, mentorIdentifier) {
      try {
        return await db.$transaction(async (tx) => {
          await acquireUserRoleMutationLock(tx)
          const user = await tx.user.findUnique({
            where: { id: userId },
            select: userSummarySelect,
          })
          if (!user || user.role !== 'user') {
            throw new UsersFailure('forbidden', 'Only users can connect to a mentor')
          }
          const mentor = await findUserByIdentifier(tx, mentorIdentifier)
          if (!mentor || mentor.role !== 'mentor') {
            throw new UsersFailure('not_found', 'Mentor not found')
          }
          const assignment = await tx.mentorAssignment.findUnique({
            where: { menteeId: userId },
            select: { mentorId: true },
          })
          if (assignment) {
            throw new UsersFailure(
              'mentor_conflict',
              assignment.mentorId === mentor.id
                ? 'You are already connected to this mentor'
                : 'You are already connected to another mentor',
            )
          }
          await tx.mentorAssignment.create({
            data: { mentorId: mentor.id, menteeId: userId },
          })
          return toAdminUserSummary(mentor)
        })
      } catch (error) {
        if (isUniqueConstraintError(error)) {
          throw new UsersFailure(
            'mentor_conflict',
            'You are already connected to another mentor',
          )
        }
        throw error
      }
    },

    async detachMentorUser(mentorUserId, menteeUserId) {
      return db.$transaction(async (tx) => {
        await acquireUserRoleMutationLock(tx)
        await assertMentor(tx, mentorUserId)
        const assignment = await tx.mentorAssignment.findUnique({
          where: { menteeId: menteeUserId },
          select: {
            mentorId: true,
            mentee: { select: userSummarySelect },
          },
        })
        if (!assignment || assignment.mentorId !== mentorUserId) {
          throw new UsersFailure('not_found', 'Connected user not found')
        }
        await tx.mentorAssignment.delete({ where: { menteeId: menteeUserId } })
        return toAdminUserSummary(assignment.mentee)
      })
    },

    async requireAssignedMentee(mentorUserId, menteeUserId) {
      await assertMentor(db, mentorUserId)
      const assignment = await db.mentorAssignment.findUnique({
        where: { menteeId: menteeUserId },
        select: { mentorId: true },
      })
      if (!assignment || assignment.mentorId !== mentorUserId) {
        throw new UsersFailure('not_found', 'Connected user not found')
      }
    },

    updateRole(input) {
      return db.$transaction(async (tx) => {
        await acquireUserRoleMutationLock(tx)
        await acquireUserAuthenticationAuthorityLock(tx, input.targetUserId)

        const actor = await tx.user.findUnique({
          where: { id: input.actorUserId },
          select: { id: true, role: true },
        })
        if (actor?.role !== 'admin') {
          throw new UsersFailure('forbidden', 'Administrator access is required')
        }

        const target = await tx.user.findUnique({
          where: { id: input.targetUserId },
          select: userSummarySelect,
        })
        if (!target) {
          throw new UsersFailure('not_found', 'User not found')
        }
        if (target.role === input.role) {
          return toAdminUserSummary(target)
        }
        if (target.id === actor.id && input.role !== 'admin') {
          throw new UsersFailure('role_conflict', 'You cannot remove your own administrator role')
        }

        if (target.role === 'admin' && input.role !== 'admin') {
          const adminCount = await tx.user.count({ where: { role: 'admin' } })
          if (adminCount <= 1) {
            throw new UsersFailure('role_conflict', 'At least one administrator must remain')
          }
        }

        if (input.role !== 'mentor') {
          await tx.mentorAssignment.deleteMany({
            where: { mentorId: target.id },
          })
        }
        if (input.role !== 'user') {
          await tx.mentorAssignment.deleteMany({
            where: { menteeId: target.id },
          })
        }

        const updated = await tx.user.update({
          where: { id: target.id },
          data: { role: input.role },
          select: userSummarySelect,
        })
        await tx.authSession.updateMany({
          where: { userId: target.id, revokedAt: null },
          data: { revokedAt: input.now },
        })
        await tx.passwordResetToken.updateMany({
          where: { userId: target.id, usedAt: null },
          data: { usedAt: input.now },
        })
        return toAdminUserSummary(updated)
      }, userAuthorityTransitionTransactionOptions)
    },

    deleteUser(input) {
      return db.$transaction(async (tx) => {
        await acquireUserRoleMutationLock(tx)
        await acquireUserAuthenticationAuthorityLock(tx, input.targetUserId)

        const actor = await tx.user.findUnique({
          where: { id: input.actorUserId },
          select: { id: true, role: true },
        })
        if (actor?.role !== 'admin') {
          throw new UsersFailure('forbidden', 'Administrator access is required')
        }

        const target = await tx.user.findUnique({
          where: { id: input.targetUserId },
          select: userSummarySelect,
        })
        if (!target) {
          throw new UsersFailure('not_found', 'User not found')
        }
        if (isDefaultUserEmail(target.email)) {
          throw new UsersFailure('delete_conflict', 'Default users cannot be deleted')
        }
        if (target.id === actor.id) {
          throw new UsersFailure('delete_conflict', 'You cannot delete your own account')
        }
        if (target.role === 'admin') {
          const adminCount = await tx.user.count({ where: { role: 'admin' } })
          if (adminCount <= 1) {
            throw new UsersFailure('delete_conflict', 'At least one administrator must remain')
          }
        }

        const deleted = await tx.user.delete({
          where: { id: target.id },
          select: userSummarySelect,
        })
        return toAdminUserSummary(deleted)
      }, userAuthorityTransitionTransactionOptions)
    },
  }
}

function toAdminUserSummary(user: {
  id: string
  publicId: number
  email: string
  displayName: string | null
  nickname: string | null
  role: UserRole
  createdAt: Date
  generationUsage?: unknown
}): AdminUserSummary {
  const spend = generationSpendFromAccount(parseGenerationAccount(user.generationUsage))
  return {
    id: user.id,
    publicId: user.publicId,
    email: user.email,
    displayName: user.displayName,
    nickname: user.nickname,
    role: user.role,
    ...(spend.tokens > 0 ? { generationSpend: spend } : {}),
    createdAt: user.createdAt.toISOString(),
  }
}

function isUniqueConstraintError(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002'
}

function uniqueConstraintTargets(error: unknown): string[] {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError)) return []
  const target = error.meta?.target
  if (Array.isArray(target)) return target.map(String)
  if (typeof target === 'string') return [target]
  return []
}

type UserLookupClient = Pick<DbClient, 'user'>

async function assertMentor(client: UserLookupClient, userId: string) {
  const actor = await client.user.findUnique({
    where: { id: userId },
    select: { role: true },
  })
  if (actor?.role !== 'mentor') {
    throw new UsersFailure('forbidden', 'Mentor access is required')
  }
}

async function assertUser(client: UserLookupClient, userId: string) {
  const actor = await client.user.findUnique({
    where: { id: userId },
    select: { role: true },
  })
  if (actor?.role !== 'user') {
    throw new UsersFailure('forbidden', 'User access is required')
  }
}

function findUserByIdentifier(client: UserLookupClient, identifier: string) {
  return client.user.findUnique({
    where: isPublicId(identifier)
      ? { publicId: Number(identifier) }
      : isUuid(identifier)
        ? { id: identifier }
        : { nickname: identifier },
    select: userSummarySelect,
  })
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
}

function isPublicId(value: string) {
  return /^\d{1,10}$/.test(value) && Number(value) <= 2_147_483_647
}

function stringIds(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value.filter((id): id is string => typeof id === 'string' && id.length > 0)
}

function sharedRationAuthorLabel(user: { displayName: string | null; nickname: string | null }) {
  const name = user.displayName?.trim() || user.nickname?.trim()
  if (!name) return 'Пользователь'
  return name.length > 80 ? name.slice(0, 80) : name
}

function toSharedRationRecord(
  row: {
    id: string
    authorId: string
    sourcePlanId: string
    title: string
    description: string
    goal: string | null
    coverImage: string
    days: number
    meals: unknown
    kcal: number
    protein: number
    fat: number
    carbs: number
    sharedAt: Date | null
    createdAt: Date
    updatedAt: Date
  },
  extras?: { authorName?: string; likeCount?: number; liked?: boolean; likedAt?: Date | null },
) {
  return {
    id: row.id,
    authorId: row.authorId,
    sourcePlanId: row.sourcePlanId,
    title: row.title,
    description: row.description,
    goal: row.goal,
    coverImage: row.coverImage,
    days: row.days,
    meals: row.meals,
    kcal: row.kcal,
    protein: row.protein,
    fat: row.fat,
    carbs: row.carbs,
    sharedAt: row.sharedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    ...extras,
  }
}

async function forgetRationRecords(db: DbClient, planId: string, userId?: string) {
  const libraries = await db.userPlanLibrary.findMany({
    where: userId ? { userId } : undefined,
    select: {
      userId: true,
      authoredPlans: true,
      savedPlanIds: true,
      selectedPlanIds: true,
      planStarts: true,
    },
  })
  const removed = new Set<string>([planId])
  for (const row of libraries) {
    for (const id of rationIdsRemovedWith(planId, row.authoredPlans)) removed.add(id)
  }

  const meals = await db.meal.findMany({
    where: {
      ...(userId ? { userId } : {}),
      OR: [...removed].flatMap((id) => [
        { assumptions: { string_contains: `${WEEK_PLAN_ID_PREFIX}${id}` } },
        { assumptions: { string_contains: `${RATION_PLAN_ID_PREFIX}${id}` } },
      ]),
    },
    select: { id: true, userId: true, assumptions: true, versions: true },
  })
  const dropIds: string[] = []
  const owners = new Set<string>()
  for (const meal of meals) {
    const versions = Array.isArray(meal.versions) ? meal.versions : []
    if (
      !mealRemovedWithRation({
        assumptions: stringIds(meal.assumptions),
        hasAuthorPhoto: versionsHaveExtraImages(versions),
        planIds: removed,
        versionCount: versions.length,
      })
    ) {
      continue
    }
    dropIds.push(meal.id)
    owners.add(meal.userId)
  }
  if (dropIds.length > 0) {
    await db.meal.deleteMany({ where: { id: { in: dropIds } } })
    const saved = await db.userSavedItems.findMany({
      where: { userId: { in: [...owners] } },
      select: { userId: true, mealIds: true },
    })
    const dropped = new Set(dropIds)
    for (const row of saved) {
      const current = stringIds(row.mealIds)
      const mealIds = current.filter((id) => !dropped.has(id))
      if (mealIds.length === current.length) continue
      await db.userSavedItems.update({
        where: { userId: row.userId },
        data: { mealIds },
      })
    }
  }

  for (const row of libraries) {
    const authoredPlans = authoredPlansWithoutRation(row.authoredPlans, removed)
    const savedPlanIds = jsonWithoutPlanIds(row.savedPlanIds, removed)
    const selectedPlanIds = jsonWithoutPlanIds(row.selectedPlanIds, removed)
    const planStarts = planStartsWithoutRation(row.planStarts, removed)
    if (
      JSON.stringify(authoredPlans) === JSON.stringify(row.authoredPlans)
      && JSON.stringify(savedPlanIds) === JSON.stringify(row.savedPlanIds)
      && JSON.stringify(selectedPlanIds) === JSON.stringify(row.selectedPlanIds)
      && JSON.stringify(planStarts) === JSON.stringify(row.planStarts)
    ) {
      continue
    }
    await db.userPlanLibrary.update({
      where: { userId: row.userId },
      data: {
        authoredPlans: authoredPlans as Prisma.InputJsonValue,
        savedPlanIds: savedPlanIds as Prisma.InputJsonValue,
        selectedPlanIds: selectedPlanIds as Prisma.InputJsonValue,
        planStarts: planStarts as Prisma.InputJsonValue,
      },
    })
  }

  const assignments = await db.planAssignment.findMany({
    where: userId ? { userId } : undefined,
    select: { userId: true, planIds: true },
  })
  for (const row of assignments) {
    const planIds = stringIds(row.planIds)
    const next = planIds.filter((id) => !removed.has(id))
    if (next.length === planIds.length) continue
    await db.planAssignment.update({
      where: { userId: row.userId },
      data: { planIds: next },
    })
  }

  await db.sharedRation.deleteMany({
    where: {
      sourcePlanId: { in: [...removed] },
      ...(userId ? { authorId: userId } : {}),
    },
  })
}

function versionsHaveExtraImages(versions: readonly unknown[]) {
  return versions.some((version) => {
    if (!version || typeof version !== 'object') return false
    const keys = (version as { extraImageKeys?: unknown }).extraImageKeys
    return Array.isArray(keys) && keys.some((key) => typeof key === 'string' && key.trim().length > 0)
  })
}
