import { describe, expect, test } from 'bun:test'

import type { DbClient } from '../../../db'
import { DEFAULT_APP_ACCOUNT_PASSWORD } from '../domain/default-accounts'
import { bootstrapDefaultAccounts } from './default-accounts-bootstrap'

describe('default accounts bootstrap', () => {
  test('creates administrator, mentor, and user and assigns the mentee', async () => {
    const db = createFakeDb()

    const first = await bootstrapDefaultAccounts(db, DEFAULT_APP_ACCOUNT_PASSWORD)
    expect(first.created).toEqual(['admin@nora.com', 'mentor@nora.com', 'user@nora.com'])
    expect(first.updated).toEqual([])

    const admin = await db.user.findUnique({ where: { email: 'admin@nora.com' } })
    const mentor = await db.user.findUnique({ where: { email: 'mentor@nora.com' } })
    const user = await db.user.findUnique({ where: { email: 'user@nora.com' } })

    expect(admin).toMatchObject({
      role: 'admin',
      nickname: 'admin',
      displayName: 'Администратор',
    })
    expect(mentor).toMatchObject({
      role: 'mentor',
      nickname: 'mentor',
      displayName: 'Наставник',
    })
    expect(user).toMatchObject({
      role: 'user',
      nickname: 'user',
      displayName: 'Пользователь',
    })
    expect(await Bun.password.verify(DEFAULT_APP_ACCOUNT_PASSWORD, admin!.passwordHash!)).toBe(true)
    expect(db.assignments).toEqual([{ mentorId: mentor!.id, menteeId: user!.id }])

    const second = await bootstrapDefaultAccounts(db, DEFAULT_APP_ACCOUNT_PASSWORD)
    expect(second.created).toEqual([])
    expect(second.updated).toEqual([])
    expect(db.assignments).toHaveLength(1)
  })
})

type FakeUser = {
  id: string
  email: string
  displayName: string | null
  nickname: string | null
  role: 'admin' | 'mentor' | 'user'
  passwordHash: string | null
}

function createFakeDb() {
  const usersByEmail = new Map<string, FakeUser>()
  const usersById = new Map<string, FakeUser>()
  const assignments: Array<{ mentorId: string; menteeId: string }> = []
  let nextId = 1

  const db = {
    assignments,
    user: {
      async findUnique({ where }: { where: { email?: string; id?: string } }) {
        if (where.email) return usersByEmail.get(where.email) ?? null
        if (where.id) return usersById.get(where.id) ?? null
        return null
      },
      async create({ data }: { data: Omit<FakeUser, 'id'> }) {
        const user: FakeUser = { id: `user-${nextId++}`, ...data }
        usersByEmail.set(user.email, user)
        usersById.set(user.id, user)
        return user
      },
      async update({
        where,
        data,
      }: {
        where: { id: string }
        data: Partial<Omit<FakeUser, 'id' | 'email'>>
      }) {
        const user = usersById.get(where.id)
        if (!user) throw new Error('missing user')
        Object.assign(user, data)
        return user
      },
    },
    mentorAssignment: {
      async upsert({
        where,
        create,
        update,
      }: {
        where: { menteeId: string }
        create: { mentorId: string; menteeId: string }
        update: { mentorId: string }
      }) {
        const existing = assignments.find((row) => row.menteeId === where.menteeId)
        if (!existing) {
          assignments.push({ ...create })
          return create
        }
        existing.mentorId = update.mentorId
        return existing
      },
    },
  }

  return db as unknown as DbClient & { assignments: typeof assignments }
}
