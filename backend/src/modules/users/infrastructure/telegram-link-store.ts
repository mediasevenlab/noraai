import { createHash, randomInt } from 'node:crypto'

import {
  telegramPhoneSchema,
  telegramUsernameSchema,
} from '@web-app-demo/contracts'

import { type DbClient } from '../../../db'
import { Prisma } from '../../../generated/prisma/client'
import { UsersFailure } from '../domain/errors'

const CODE_TTL_MS = 15 * 60 * 1000

export type TelegramLinkIdentity = {
  telegramUsername?: string | null
  telegramPhone?: string | null
}

export type TelegramLinkStartResult = {
  code: string
  expiresAt: Date
}

export type TelegramLinkCompleteResult =
  | { ok: true; userId: string }
  | { ok: false; reason: 'invalid' | 'mismatch' | 'phone_proof_required' }

export function hashTelegramLinkCode(code: string) {
  return createHash('sha256').update(code).digest('hex')
}

export function createTelegramLinkStore(db: DbClient) {
  return {
    async start(
      userId: string,
      input: TelegramLinkIdentity,
    ): Promise<TelegramLinkStartResult> {
      const claimedUsername = input.telegramUsername
        ? telegramUsernameSchema.safeParse(input.telegramUsername)
        : null
      const claimedPhone = input.telegramPhone
        ? telegramPhoneSchema.safeParse(input.telegramPhone)
        : null
      if (input.telegramUsername && !claimedUsername?.success) {
        throw new UsersFailure('invalid', 'Invalid Telegram username')
      }
      if (input.telegramPhone && !claimedPhone?.success) {
        throw new UsersFailure('invalid', 'Invalid Telegram phone')
      }
      const username = claimedUsername?.success ? claimedUsername.data : null
      const phone = claimedPhone?.success ? claimedPhone.data : null
      if (!username && !phone) {
        throw new UsersFailure('invalid', 'Telegram username or phone is required')
      }

      const code = String(randomInt(100_000, 1_000_000))
      const expiresAt = new Date(Date.now() + CODE_TTL_MS)
      await db.telegramLinkChallenge.deleteMany({
        where: { userId, consumedAt: null },
      })
      await db.telegramLinkChallenge.create({
        data: {
          userId,
          codeHash: hashTelegramLinkCode(code),
          claimedUsername: username,
          claimedPhone: phone,
          expiresAt,
        },
      })
      return { code, expiresAt }
    },

    async complete(
      code: string,
      proof: TelegramLinkIdentity,
      extras?: { telegramChatId?: string },
    ): Promise<TelegramLinkCompleteResult> {
      const normalized = String(code ?? '').trim()
      if (!/^\d{6}$/.test(normalized)) {
        return { ok: false, reason: 'invalid' }
      }
      const row = await db.telegramLinkChallenge.findUnique({
        where: { codeHash: hashTelegramLinkCode(normalized) },
      })
      if (!row || row.consumedAt || row.expiresAt.getTime() <= Date.now()) {
        return { ok: false, reason: 'invalid' }
      }

      const proofUsername = proof.telegramUsername
        ? telegramUsernameSchema.safeParse(proof.telegramUsername)
        : null
      const proofPhone = proof.telegramPhone
        ? telegramPhoneSchema.safeParse(proof.telegramPhone)
        : null

      if (row.claimedUsername) {
        if (!proofUsername?.success || proofUsername.data !== row.claimedUsername) {
          return { ok: false, reason: 'mismatch' }
        }
      }
      if (row.claimedPhone) {
        if (!proofPhone?.success) {
          return { ok: false, reason: 'phone_proof_required' }
        }
        if (proofPhone.data !== row.claimedPhone) {
          return { ok: false, reason: 'mismatch' }
        }
      }

      if (row.claimedUsername) {
        const existing = await db.user.findUnique({
          where: { telegramUsername: row.claimedUsername },
          select: { id: true },
        })
        if (existing && existing.id !== row.userId) {
          throw new UsersFailure(
            'telegram_username_taken',
            'This Telegram username is already taken',
          )
        }
      }
      if (row.claimedPhone) {
        const existing = await db.user.findUnique({
          where: { telegramPhone: row.claimedPhone },
          select: { id: true },
        })
        if (existing && existing.id !== row.userId) {
          throw new UsersFailure(
            'telegram_phone_taken',
            'This Telegram phone is already taken',
          )
        }
      }

      await db.telegramLinkChallenge.update({
        where: { id: row.id },
        data: { consumedAt: new Date() },
      })
      try {
        const telegramChatId = extras?.telegramChatId?.trim() || null
        if (telegramChatId) {
          await db.user.updateMany({
            where: { telegramChatId, NOT: { id: row.userId } },
            data: { telegramChatId: null },
          })
        }
        await db.user.update({
          where: { id: row.userId },
          data: {
            ...(row.claimedUsername
              ? { telegramUsername: row.claimedUsername }
              : {}),
            ...(row.claimedPhone ? { telegramPhone: row.claimedPhone } : {}),
            ...(telegramChatId ? { telegramChatId } : {}),
          },
        })
      } catch (error) {
        await db.telegramLinkChallenge.update({
          where: { id: row.id },
          data: { consumedAt: null },
        }).catch(() => undefined)
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
          const target = error.meta?.target
          const fields = Array.isArray(target) ? target.map(String) : [String(target ?? '')]
          if (fields.some((field) => field.includes('telegram_phone') || field.includes('telegramPhone'))) {
            throw new UsersFailure('telegram_phone_taken', 'This Telegram phone is already taken')
          }
          throw new UsersFailure(
            'telegram_username_taken',
            'This Telegram username is already taken',
          )
        }
        throw error
      }

      return { ok: true, userId: row.userId }
    },
  }
}

export type TelegramLinkStore = ReturnType<typeof createTelegramLinkStore>
