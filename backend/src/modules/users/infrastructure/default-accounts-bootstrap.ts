import type { DbClient } from '../../../db'
import {
  DEFAULT_APP_ACCOUNTS,
  DEFAULT_MENTEE_EMAIL,
  DEFAULT_MENTOR_EMAIL,
} from '../domain/default-accounts'

export type DefaultAccountsBootstrapResult = {
  created: string[]
  updated: string[]
}

export async function bootstrapDefaultAccounts(db: DbClient, password: string) {
  const passwordHash = await Bun.password.hash(password, { algorithm: 'argon2id' })
  const created: string[] = []
  const updated: string[] = []

  for (const account of DEFAULT_APP_ACCOUNTS) {
    const existing = await db.user.findUnique({
      where: { email: account.email },
      select: {
        id: true,
        email: true,
        displayName: true,
        nickname: true,
        role: true,
        passwordHash: true,
      },
    })

    if (!existing) {
      await db.user.create({
        data: {
          email: account.email,
          displayName: account.displayName,
          nickname: account.nickname,
          role: account.role,
          passwordHash,
        },
      })
      created.push(account.email)
      continue
    }

    const passwordMatches =
      existing.passwordHash !== null &&
      (await matchesPassword(password, existing.passwordHash))
    const needsUpdate =
      existing.role !== account.role
      || existing.nickname !== account.nickname
      || existing.displayName !== account.displayName
      || !passwordMatches

    if (!needsUpdate) continue

    await db.user.update({
      where: { id: existing.id },
      data: {
        displayName: account.displayName,
        nickname: account.nickname,
        role: account.role,
        ...(passwordMatches ? {} : { passwordHash }),
      },
    })
    updated.push(account.email)
  }

  const mentor = await db.user.findUnique({
    where: { email: DEFAULT_MENTOR_EMAIL },
    select: { id: true, role: true },
  })
  const mentee = await db.user.findUnique({
    where: { email: DEFAULT_MENTEE_EMAIL },
    select: { id: true, role: true },
  })
  if (mentor?.role === 'mentor' && mentee?.role === 'user') {
    await db.mentorAssignment.upsert({
      where: { menteeId: mentee.id },
      create: { mentorId: mentor.id, menteeId: mentee.id },
      update: { mentorId: mentor.id },
    })
  }

  return { created, updated } satisfies DefaultAccountsBootstrapResult
}

async function matchesPassword(password: string, passwordHash: string) {
  try {
    return await Bun.password.verify(password, passwordHash)
  } catch {
    return false
  }
}
