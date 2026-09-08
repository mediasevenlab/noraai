import {
  defaultNicknameForEmail,
  defaultRoleForEmail,
  isDefaultUserEmail,
} from '@web-app-demo/contracts'

import {
  acquireUserAuthenticationAuthorityLock,
  type DbClient,
  userAuthenticationSessionTransactionOptions,
} from '../../../db'
import { Prisma } from '../../../generated/prisma/client'
import type { AuthRepository } from '../application/ports'
import { AuthFailure } from '../domain/errors'

export function createPrismaAuthRepository(db: DbClient): AuthRepository {
  return {
    findUserByEmail(email) {
      return db.user.findUnique({ where: { email } })
    },

    findMentorByIdentifier(identifier) {
      return db.user.findFirst({
        where: {
          role: 'mentor',
          ...(isPublicId(identifier)
            ? { publicId: Number(identifier) }
            : isUuid(identifier)
              ? { id: identifier }
              : { nickname: identifier }),
        },
        select: {
          id: true,
          publicId: true,
          displayName: true,
          nickname: true,
        },
      })
    },

    findReferrerByCode(code) {
      return db.user.findUnique({
        where: {
          ...(isPublicId(code)
            ? { publicId: Number(code) }
            : { nickname: code }),
          role: { in: ['user', 'mentor'] },
        },
        select: {
          id: true,
          publicId: true,
          displayName: true,
          nickname: true,
          role: true,
        },
      })
    },

    async createPasswordUserWithSession(input) {
      try {
        return await db.$transaction(async (tx) => {
          const referrer = input.user.role === 'user' && input.user.referralCode
            ? await tx.user.findUnique({
                where: {
                  ...(isPublicId(input.user.referralCode)
                    ? { publicId: Number(input.user.referralCode) }
                    : { nickname: input.user.referralCode }),
                  role: { in: ['user', 'mentor'] },
                },
                select: { id: true, role: true },
              })
            : null
          if (input.user.role === 'user' && input.user.referralCode && !referrer) {
            throw new AuthFailure(
              'referrer_not_found',
              'Referral link is no longer valid',
            )
          }
          const requestedMentor = input.user.role === 'user'
            && input.user.mentorIdentifier
            && input.user.email !== 'user@nora.com'
            ? await tx.user.findFirst({
                where: {
                  role: 'mentor',
                  ...(isPublicId(input.user.mentorIdentifier)
                    ? { publicId: Number(input.user.mentorIdentifier) }
                    : isUuid(input.user.mentorIdentifier)
                      ? { id: input.user.mentorIdentifier }
                      : { nickname: input.user.mentorIdentifier }),
                },
                select: { id: true },
              })
            : null
          if (
            input.user.role === 'user'
            && input.user.mentorIdentifier
            && input.user.email !== 'user@nora.com'
            && !requestedMentor
          ) {
            throw new AuthFailure(
              'mentor_not_found',
              'Selected mentor is no longer available',
            )
          }
          const referralMentor = input.user.role === 'user'
            && referrer?.role === 'mentor'
            ? referrer
            : null
          if (
            requestedMentor
            && referralMentor
            && requestedMentor.id !== referralMentor.id
          ) {
            throw new AuthFailure(
              'mentor_not_found',
              'The referral mentor does not match the selected mentor',
            )
          }
          const mentorToAttach = referralMentor ?? requestedMentor
          const user = await tx.user.create({
            data: {
              email: input.user.email,
              passwordHash: input.user.passwordHash,
              displayName: input.user.displayName,
              nickname: defaultNicknameForEmail(input.user.email),
              role: input.user.email === 'mentor@nora.com'
                ? defaultRoleForEmail(input.user.email)
                : input.user.role,
              referredByUserId: input.user.role === 'user' && referrer?.role === 'user'
                ? referrer.id
                : undefined,
            },
          })
          if (isDefaultUserEmail(input.user.email)) {
            const [mentor, mentee] = await Promise.all([
              tx.user.findUnique({
                where: { email: 'mentor@nora.com' },
                select: { id: true, role: true },
              }),
              tx.user.findUnique({
                where: { email: 'user@nora.com' },
                select: { id: true, role: true },
              }),
            ])
            if (mentor?.role === 'mentor' && mentee?.role === 'user') {
              await tx.mentorAssignment.upsert({
                where: { menteeId: mentee.id },
                create: { mentorId: mentor.id, menteeId: mentee.id },
                update: { mentorId: mentor.id },
              })
            }
          }
          if (mentorToAttach && input.user.email !== 'user@nora.com') {
            await tx.mentorAssignment.create({
              data: {
                mentorId: mentorToAttach.id,
                menteeId: user.id,
              },
            })
          }
          const session = await tx.authSession.create({
            data: {
              userId: user.id,
              refreshTokenHash: input.session.refreshTokenHash,
              refreshTokenFamilyHash: input.session.refreshTokenFamilyHash,
              expiresAt: input.session.expiresAt,
              userAgent: input.session.metadata.userAgent,
              ipAddress: input.session.metadata.ipAddress,
            },
            select: { id: true },
          })

          return { user, session }
        })
      } catch (error) {
        if (isUniqueConstraintError(error)) {
          throw new AuthFailure('email_already_exists', 'User with this email already exists')
        }
        throw error
      }
    },

    createSession(input) {
      return db.$transaction(async (tx) => {
        await acquireUserAuthenticationAuthorityLock(tx, input.userId)
        const user = await tx.user.findUnique({
          where: { id: input.userId },
        })
        if (!user || !(await input.authorizeUser(user))) return null

        const session = await tx.authSession.create({
          data: {
            userId: user.id,
            refreshTokenHash: input.refreshTokenHash,
            refreshTokenFamilyHash: input.refreshTokenFamilyHash,
            expiresAt: input.expiresAt,
            userAgent: input.metadata.userAgent,
            ipAddress: input.metadata.ipAddress,
          },
          select: { id: true },
        })
        return { user, session }
      }, userAuthenticationSessionTransactionOptions)
    },

    async findActiveRefreshSession(input) {
      const family = await db.authSession.findFirst({
        where: {
          refreshTokenFamilyHash: input.refreshTokenFamilyHash,
          revokedAt: null,
          expiresAt: { gt: input.now },
          createdAt: { gt: input.createdAfter },
        },
        include: { user: true },
      })
      if (family) {
        if (family.refreshTokenHash === input.refreshTokenHash) {
          return { ...family, credentialState: 'current' as const }
        }

        const isPrevious = family.previousRefreshTokenHash === input.refreshTokenHash
        const withinGrace =
          isPrevious &&
          family.refreshRotatedAt !== null &&
          family.refreshRotatedAt >= input.reuseGraceAfter
        return {
          ...family,
          credentialState: withinGrace
            ? ('previous_within_grace' as const)
            : ('reused' as const),
        }
      }

      const current = await db.authSession.findFirst({
        where: {
          refreshTokenHash: input.refreshTokenHash,
          revokedAt: null,
          expiresAt: { gt: input.now },
          createdAt: { gt: input.createdAfter },
        },
        include: { user: true },
      })
      if (current) {
        return { ...current, credentialState: 'current' as const }
      }

      const previous = await db.authSession.findFirst({
        where: {
          previousRefreshTokenHash: input.refreshTokenHash,
          revokedAt: null,
          expiresAt: { gt: input.now },
          createdAt: { gt: input.createdAfter },
        },
        include: { user: true },
      })
      if (!previous) return null

      const withinGrace =
        previous.refreshRotatedAt !== null && previous.refreshRotatedAt >= input.reuseGraceAfter
      return {
        ...previous,
        credentialState: withinGrace
          ? ('previous_within_grace' as const)
          : ('reused' as const),
      }
    },

    rotateRefreshSession(input) {
      return db.authSession.updateMany({
        where: {
          id: input.currentSessionId,
          refreshTokenHash: input.currentRefreshTokenHash,
          revokedAt: null,
          expiresAt: { gt: input.now },
        },
        data: {
          previousRefreshTokenHash: input.currentRefreshTokenHash,
          refreshTokenHash: input.nextRefreshTokenHash,
          refreshTokenFamilyHash: input.nextRefreshTokenFamilyHash,
          refreshRotatedAt: input.now,
          expiresAt: input.nextExpiresAt,
          userAgent: input.metadata.userAgent,
          ipAddress: input.metadata.ipAddress,
        },
      }).then(({ count }) => count === 1)
    },

    revokeSessionById(input) {
      return db.authSession.updateMany({
        where: { id: input.sessionId, revokedAt: null },
        data: { revokedAt: input.now },
      }).then(({ count }) => count === 1)
    },

    findActiveAccessSession(input) {
      return db.authSession.findFirst({
        where: {
          id: input.sessionId,
          userId: input.userId,
          revokedAt: null,
          expiresAt: { gt: input.now },
          createdAt: { gt: input.createdAfter },
        },
        include: { user: true },
      })
    },

    revokeSession(input) {
      return db.$transaction(async (tx) => {
        const session = await tx.authSession.findFirst({
          where: {
            OR: [
              { refreshTokenHash: input.refreshTokenHash },
              { previousRefreshTokenHash: input.refreshTokenHash },
              { refreshTokenFamilyHash: input.refreshTokenFamilyHash },
            ],
            revokedAt: null,
          },
          select: { id: true, userId: true },
        })
        if (!session) return null

        const revoked = await tx.authSession.updateMany({
          where: { id: session.id, revokedAt: null },
          data: { revokedAt: input.now },
        })
        return revoked.count === 1 ? session.userId : null
      })
    },

    createPasswordResetToken(input) {
      return db.$transaction(async (tx) => {
        await acquireUserAuthenticationAuthorityLock(tx, input.userId)
        const recentToken = await tx.passwordResetToken.findFirst({
          where: {
            userId: input.userId,
            createdAt: { gte: input.createdAfter },
          },
          select: { id: true },
        })
        if (recentToken) return false

        await tx.passwordResetToken.updateMany({
          where: { userId: input.userId, usedAt: null },
          data: { usedAt: input.now },
        })
        await tx.passwordResetToken.create({
          data: {
            userId: input.userId,
            tokenHash: input.tokenHash,
            expiresAt: input.expiresAt,
          },
        })
        return true
      }, userAuthenticationSessionTransactionOptions)
    },

    async invalidatePasswordResetToken(input) {
      await db.passwordResetToken.updateMany({
        where: { tokenHash: input.tokenHash, usedAt: null },
        data: { usedAt: input.now },
      })
    },

    async hasActivePasswordResetToken(input) {
      const token = await db.passwordResetToken.findFirst({
        where: {
          tokenHash: input.tokenHash,
          usedAt: null,
          expiresAt: { gt: input.now },
        },
        select: { id: true },
      })
      return token !== null
    },

    completePasswordReset(input) {
      return db.$transaction(async (tx) => {
        const candidate = await tx.passwordResetToken.findFirst({
          where: {
            tokenHash: input.tokenHash,
            usedAt: null,
            expiresAt: { gt: input.now },
          },
          select: { userId: true },
        })
        if (!candidate) return null

        await acquireUserAuthenticationAuthorityLock(tx, candidate.userId)
        const token = await tx.passwordResetToken.findFirst({
          where: {
            tokenHash: input.tokenHash,
            userId: candidate.userId,
            usedAt: null,
            expiresAt: { gt: input.now },
          },
          select: { user: { select: { email: true } } },
        })
        if (!token) return null

        await tx.user.update({
          where: { id: candidate.userId },
          data: { passwordHash: input.passwordHash },
        })
        await tx.passwordResetToken.updateMany({
          where: { userId: candidate.userId, usedAt: null },
          data: { usedAt: input.now },
        })
        await tx.authSession.updateMany({
          where: { userId: candidate.userId, revokedAt: null },
          data: { revokedAt: input.now },
        })

        return { email: token.user.email }
      }, userAuthenticationSessionTransactionOptions)
    },
  }
}

function isUniqueConstraintError(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002'
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
}

function isPublicId(value: string) {
  return /^\d{1,10}$/.test(value) && Number(value) <= 2_147_483_647
}
