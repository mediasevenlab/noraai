import { expect, test } from 'bun:test'

import type { AuthenticatedPrincipal } from '../../auth'
import { UsersFailure } from '../domain/errors'
import type { SharedRationRecord } from '../domain/shared-ration'
import { UsersService } from './users-service'

const principal: AuthenticatedPrincipal = {
  id: 'user-1',
  publicId: 101,
  email: 'share@example.com',
  displayName: 'Анна',
  nickname: 'anna',
  telegramUsername: null,
  telegramPhone: null,
  role: 'user',
  questionnaireCompleted: true,
  createdAt: '2026-09-07T00:00:00.000Z',
  sessionId: 'session-1',
}

const authoredId = 'plan_11111111-1111-4111-8111-111111111111'
const snapshot = {
  title: 'Офис',
  description: 'День в офисе',
  goal: 'Похудение' as const,
  coverImage: '/catalog/office.jpg',
  meals: [
    {
      dayIndex: 0,
      slot: 'Обед' as const,
      title: 'Курица',
      ingredients: 'курица, рис',
      image: '/diary/meals/meal-01.jpg',
      kcal: 420,
      protein: 35,
      fat: 12,
      carbs: 40,
    },
  ],
}

const unused = {
  adminDashboardReader: { dashboard: async () => ({
    totalUsers: 0, totalAdmins: 0, newUsersLast7Days: 0,
  }) },
  adminUsersReader: { listUsers: async () => ({
    items: [], page: 1, pageSize: 20, total: 0, hasNext: false,
  }) },
  currentUserMentorReader: { getCurrentUserMentor: async () => null },
  mentorUsersManager: {} as never,
  userMentorConnector: {} as never,
  userReferralsReader: { listUserReferrals: async () => ({
    items: [], page: 1, pageSize: 20, total: 0, hasNext: false,
  }) },
  profileWriter: { updateProfile: async () => {
    throw new Error('not used')
  } },
  questionnaireStore: {
    getQuestionnaire: async () => null,
    upsertQuestionnaire: async () => {
      throw new Error('not used')
    },
    hasCompletedQuestionnaire: async () => true,
  },
  userDeleter: { deleteUser: async () => {
    throw new Error('not used')
  } },
  userRoleUpdater: { updateRole: async () => {
    throw new Error('not used')
  } },
}

function createStore() {
  const rows = new Map<string, SharedRationRecord>()
  const likes = new Map<string, Set<string>>()
  const now = new Date('2026-09-16T10:00:00.000Z')

  function withSocial(row: SharedRationRecord, viewerUserId: string): SharedRationRecord {
    const likedBy = likes.get(row.id) ?? new Set()
    return {
      ...row,
      authorName: 'Анна',
      likeCount: likedBy.size,
      liked: likedBy.has(viewerUserId),
    }
  }

  return {
    rows,
    store: {
      findByAuthorAndSource: async (authorId: string, sourcePlanId: string) =>
        [...rows.values()].find((row) => row.authorId === authorId && row.sourcePlanId === sourcePlanId) ?? null,
      findById: async (id: string) => rows.get(id) ?? null,
      upsertShared: async (input: Omit<SharedRationRecord, 'id' | 'createdAt' | 'updatedAt' | 'authorName' | 'likeCount' | 'liked'>) => {
        const existing = [...rows.values()].find(
          (row) => row.authorId === input.authorId && row.sourcePlanId === input.sourcePlanId,
        )
        const row: SharedRationRecord = {
          id: existing?.id ?? 'ration-1',
          createdAt: existing?.createdAt ?? now,
          updatedAt: now,
          ...input,
        }
        rows.set(row.id, row)
        return row
      },
      setSharedAt: async (id: string, sharedAt: Date | null) => {
        const current = rows.get(id)
        if (!current) throw new Error('missing')
        const next = { ...current, sharedAt, updatedAt: now }
        rows.set(id, next)
        return next
      },
      listShared: async (_limit: number, viewerUserId: string) =>
        [...rows.values()]
          .filter((row) => row.sharedAt != null)
          .map((row) => withSocial(row, viewerUserId)),
      setLiked: async (rationId: string, userId: string, liked: boolean) => {
        const current = rows.get(rationId)
        if (!current) throw new Error('missing')
        const likedBy = likes.get(rationId) ?? new Set<string>()
        if (liked) likedBy.add(userId)
        else likedBy.delete(userId)
        likes.set(rationId, likedBy)
        return withSocial(current, userId)
      },
    },
  }
}

test('owner can publish an authored ration and hide it again', async () => {
  const { store } = createStore()
  const service = new UsersService({
    ...unused,
    clock: { now: () => new Date('2026-09-16T10:00:00.000Z') },
    userPlanLibraryStore: {
      getPlanLibrary: async () => ({
        authoredPlans: [{
          id: authoredId,
          title: 'Офис',
          description: '',
          coverImage: '',
          createdAt: '2026-09-01T00:00:00.000Z',
          goal: 'Похудение',
        }],
        savedPlanIds: [],
        selectedPlanIds: [],
        planStarts: [],
        updatedAt: new Date('2026-09-07T12:00:00.000Z'),
      }),
      putPlanLibrary: async () => {
        throw new Error('not used')
      },
    },
    sharedRationsStore: store,
  })

  await expect(
    service.setRationShared(principal, 'plan_missing-plan-id-000000000000', {
      shared: true,
      snapshot,
    }),
  ).rejects.toBeInstanceOf(UsersFailure)

  const published = await service.setRationShared(principal, authoredId, {
    shared: true,
    snapshot,
  })
  expect(published.ration.shared).toBe(true)
  expect(published.ration.title).toBe('Офис')
  expect(published.ration.kcal).toBe(420)
  expect(published.ration.sourcePlanId).toBe(authoredId)

  const feed = await service.listSharedRations(principal)
  expect(feed.items).toHaveLength(1)
  expect(feed.items[0]?.id).toBe(published.ration.id)
  expect(feed.items[0]?.own).toBe(true)

  const liked = await service.setRationLiked(principal, published.ration.id, true)
  expect(liked.ration.liked).toBe(true)
  expect(liked.ration.likeCount).toBe(1)

  const hidden = await service.setRationShared(principal, authoredId, { shared: false })
  expect(hidden.ration.shared).toBe(false)
  expect((await service.listSharedRations(principal)).items).toHaveLength(0)

  await expect(
    service.setRationLiked(principal, published.ration.id, true),
  ).rejects.toBeInstanceOf(UsersFailure)
})

test('cloned catalog or feed rations cannot be published to the feed', async () => {
  const clonedId = 'plan_22222222-2222-4222-8222-222222222222'
  const { store } = createStore()
  const service = new UsersService({
    ...unused,
    clock: { now: () => new Date('2026-09-16T10:00:00.000Z') },
    userPlanLibraryStore: {
      getPlanLibrary: async () => ({
        authoredPlans: [{
          id: clonedId,
          title: 'Минус без голода',
          description: '',
          coverImage: '',
          createdAt: '2026-09-01T00:00:00.000Z',
          goal: 'Похудение',
          sourceCatalogId: 'catalog_loss',
        }],
        savedPlanIds: [],
        selectedPlanIds: [],
        planStarts: [],
        updatedAt: new Date('2026-09-07T12:00:00.000Z'),
      }),
      putPlanLibrary: async () => {
        throw new Error('not used')
      },
    },
    sharedRationsStore: store,
  })

  await expect(
    service.setRationShared(principal, clonedId, { shared: true, snapshot }),
  ).rejects.toMatchObject({ kind: 'forbidden' })
})
