import { describe, expect, test } from 'bun:test'

import { MealsService } from './meals-service'
import type { MealImageStore, MealRecord, MealsRepository } from './ports'
import { MealsFailure } from '../domain/errors'

function mealRecord(overrides: Partial<MealRecord> = {}): MealRecord {
  const versionId = '33333333-3333-4333-8333-333333333333'
  return {
    id: '11111111-1111-4111-8111-111111111111',
    userId: '22222222-2222-4222-8222-222222222222',
    title: 'Овсянка',
    ingredients: 'Овсянка',
    category: 'Завтрак',
    mealSlot: 'Завтрак',
    recordedAt: new Date('2026-08-04T08:00:00.000Z'),
    kcal: 300,
    protein: 20,
    fat: 8,
    carbs: 40,
    portionItems: [{ label: 'Овсянка ~40 г', kcal: 0, protein: 0, fat: 0, carbs: 0 }],
    clientComment: '',
    assumptions: [],
    micronutrients: [],
    versions: [
      {
        id: versionId,
        createdAt: '2026-08-04T08:00:00.000Z',
        label: 'vers. 1.0',
        snapshot: {
          title: 'Овсянка',
          ingredients: 'Овсянка',
          category: 'Завтрак',
          meal: 'Завтрак',
          kcal: 300,
          protein: 20,
          fat: 8,
          carbs: 40,
          portionItems: [{ label: 'Овсянка ~40 г', kcal: 0, protein: 0, fat: 0, carbs: 0 }],
          clientComment: '',
          assumptions: [],
          micronutrients: [],
        },
      },
    ],
    activeVersionId: versionId,
    source: 'telegram',
    telegramUpdateId: '42',
    clientKey: null,
    imageKey: 'user/meal.jpg',
    imageMime: 'image/jpeg',
    sharedAt: null,
    createdAt: new Date('2026-08-04T08:00:01.000Z'),
    ...overrides,
  }
}

function repositoryStub(overrides: Partial<MealsRepository> = {}): MealsRepository {
  return {
    getTelegramPollerOffset: async () => 0,
    advanceTelegramPollerOffset: async () => undefined,
    findUserByTelegramUsername: async () => null,
    findUserByTelegramPhone: async () => null,
    findMealByTelegramUpdateId: async () => null,
    findMealByClientKey: async () => null,
    findMealById: async () => null,
    listMealsForUser: async () => [],
    listSharedMeals: async () => [],
    isMentorOf: async () => false,
    listMenteeIdsForMentor: async () => [],
    findMentorMealNotifyTarget: async () => null,
    setTelegramChatId: async () => undefined,
    listMentorMealCursors: async () => [],
    upsertMentorMealCursor: async (_mentorId, _menteeId, viewedAt) => viewedAt,
    listMentorViewedMealIds: async () => [],
    insertMentorMealViews: async () => undefined,
    findMealsByIds: async () => [],
    listMealUnreadScan: async () => [],
    createMeal: async () => mealRecord(),
    updateMealContent: async (_id, content) =>
      mealRecord({
        title: content.title,
        ingredients: content.ingredients,
        category: content.category,
        mealSlot: content.mealSlot,
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
      }),
    setMealShared: async (_id, sharedAt) => mealRecord({ sharedAt }),
    setMealLike: async () => ({ likeCount: 0, liked: false }),
    deleteMeal: async () => undefined,
    ...overrides,
  }
}

function imageUrls(build: (id: string) => string = (id) => `/img/${id}`) {
  return {
    build,
    buildExtra: (id: string, index: number) => `${build(id)}/extras/${index}`,
  }
}

describe('MealsService', () => {
  test('createUserMeal scopes the same clientKey to each user', async () => {
    const records: MealRecord[] = []
    const repository = repositoryStub({
      findMealByClientKey: async (userId, clientKey) =>
        records.find((record) => record.userId === userId && record.clientKey === clientKey) ?? null,
      createMeal: async (input) => {
        const created = mealRecord({
          id: records.length === 0
            ? '11111111-1111-4111-8111-111111111111'
            : '44444444-4444-4444-8444-444444444444',
          userId: input.userId,
          source: input.source,
          telegramUpdateId: null,
          clientKey: input.clientKey ?? null,
        })
        records.push(created)
        return created
      },
    })
    const service = new MealsService({
      analyzer: {
        analyze: async () => {
          throw new Error('unused')
        },
        refine: async () => {
          throw new Error('unused')
        },
      },
      imageStore: {
        saveImage: async () => {
          throw new Error('unused')
        },
        readImage: async () => null,
      },
      imageUrlBuilder: imageUrls(),
      repository,
    })
    const input = {
      title: 'Овсянка',
      ingredients: 'Овсянка',
      category: 'Завтрак',
      meal: 'Завтрак',
      kcal: 300,
      protein: 20,
      fat: 8,
      carbs: 40,
      portionItems: [],
      clientComment: '',
      assumptions: [],
      micronutrients: [],
      source: 'manual' as const,
      clientKey: 'shared-client-key',
    }
    const firstUserId = '22222222-2222-4222-8222-222222222222'
    const secondUserId = '55555555-5555-4555-8555-555555555555'

    const first = await service.createUserMeal({ id: firstUserId, role: 'user' }, input)
    const second = await service.createUserMeal({ id: secondUserId, role: 'user' }, input)
    const firstRetry = await service.createUserMeal({ id: firstUserId, role: 'user' }, input)
    const secondRetry = await service.createUserMeal({ id: secondUserId, role: 'user' }, input)

    expect(first.created).toBe(true)
    expect(second.created).toBe(true)
    expect(first.meal.userId).toBe(firstUserId)
    expect(second.meal.userId).toBe(secondUserId)
    expect(second.meal.id).not.toBe(first.meal.id)
    expect(firstRetry).toMatchObject({ created: false, meal: { id: first.meal.id, userId: firstUserId } })
    expect(secondRetry).toMatchObject({
      created: false,
      meal: { id: second.meal.id, userId: secondUserId },
    })
  })

  test('notifies the mentor through n8n after a mentee saves a new meal', async () => {
    const menteeId = '22222222-2222-4222-8222-222222222222'
    const mentorId = '66666666-6666-4666-8666-666666666666'
    const notified: Array<{ chatId: string; title: string }> = []
    const records: MealRecord[] = []
    const repository = repositoryStub({
      findMentorMealNotifyTarget: async (userId) =>
        userId === menteeId
          ? {
              mentorId,
              telegramChatId: '998877',
              mentee: { publicId: 104, nickname: 'anya', displayName: 'Аня' },
            }
          : null,
      isMentorOf: async (mentorUserId, menteeUserId) =>
        mentorUserId === mentorId && menteeUserId === menteeId,
      findMealByClientKey: async (userId, clientKey) =>
        records.find((record) => record.userId === userId && record.clientKey === clientKey) ?? null,
      createMeal: async (input) => {
        const created = mealRecord({
          id: records.length === 0
            ? '11111111-1111-4111-8111-111111111111'
            : '44444444-4444-4444-8444-444444444444',
          userId: input.userId,
          title: input.title,
          source: input.source,
          telegramUpdateId: null,
          clientKey: input.clientKey ?? null,
          assumptions: input.assumptions,
        })
        records.push(created)
        return created
      },
    })
    const service = new MealsService({
      analyzer: {
        analyze: async () => {
          throw new Error('unused')
        },
        refine: async () => {
          throw new Error('unused')
        },
      },
      imageStore: {
        saveImage: async () => {
          throw new Error('unused')
        },
        readImage: async () => null,
      },
      imageUrlBuilder: imageUrls(),
      repository,
      mentorMealNotifier: {
        notify: async (payload) => {
          notified.push({ chatId: payload.chatId, title: payload.title })
        },
      },
    })
    const input = {
      title: 'Овсянка',
      ingredients: 'Овсянка',
      category: 'Завтрак',
      meal: 'Завтрак',
      kcal: 300,
      protein: 20,
      fat: 8,
      carbs: 40,
      portionItems: [],
      clientComment: '',
      assumptions: [],
      micronutrients: [],
      source: 'manual' as const,
      clientKey: 'notify-meal-1',
    }

    const created = await service.createUserMeal({ id: menteeId, role: 'user' }, input)
    expect(created.mentorNotify).toBe('sent')
    expect(notified).toEqual([{ chatId: '998877', title: 'Овсянка' }])

    const first = await service.createUserMeal({ id: menteeId, role: 'user' }, input)
    expect(first).toMatchObject({ created: false, mentorNotify: 'skipped' })

    await service.createUserMeal(
      { id: mentorId, role: 'mentor' },
      { ...input, clientKey: 'notify-meal-2' },
      menteeId,
    )
    expect(notified).toHaveLength(1)
  })

  test('reports a failed mentor notify, keeps the meal, and retries in the background', async () => {
    const menteeId = '22222222-2222-4222-8222-222222222222'
    const mentorId = '66666666-6666-4666-8666-666666666666'
    const attempts: string[] = []
    const errors: unknown[] = []
    const deferred: Array<(signal: AbortSignal) => Promise<void>> = []
    const records: MealRecord[] = []
    const repository = repositoryStub({
      findMentorMealNotifyTarget: async (userId) =>
        userId === menteeId
          ? {
              mentorId,
              telegramChatId: '998877',
              mentee: { publicId: 104, nickname: 'anya', displayName: 'Аня' },
            }
          : null,
      isMentorOf: async (mentorUserId, menteeUserId) =>
        mentorUserId === mentorId && menteeUserId === menteeId,
      findMealByClientKey: async (userId, clientKey) =>
        records.find((record) => record.userId === userId && record.clientKey === clientKey) ?? null,
      createMeal: async (input) => {
        const created = mealRecord({
          id: '11111111-1111-4111-8111-111111111111',
          userId: input.userId,
          title: input.title,
          source: input.source,
          telegramUpdateId: null,
          clientKey: input.clientKey ?? null,
          assumptions: input.assumptions,
        })
        records.push(created)
        return created
      },
    })
    const service = new MealsService({
      analyzer: {
        analyze: async () => {
          throw new Error('unused')
        },
        refine: async () => {
          throw new Error('unused')
        },
      },
      imageStore: {
        saveImage: async () => {
          throw new Error('unused')
        },
        readImage: async () => null,
      },
      imageUrlBuilder: imageUrls(),
      repository,
      backgroundTasks: {
        defer: (task) => {
          deferred.push(task)
        },
      },
      onNotifyError: (error) => {
        errors.push(error)
      },
      mentorMealNotifier: {
        notify: async (payload) => {
          attempts.push(payload.title)
          if (attempts.length === 1) throw new Error('n8n down')
        },
      },
    })
    const result = await service.createUserMeal(
      { id: menteeId, role: 'user' },
      {
        title: 'Овсянка',
        ingredients: 'Овсянка',
        category: 'Завтрак',
        meal: 'Завтрак',
        kcal: 300,
        protein: 20,
        fat: 8,
        carbs: 40,
        portionItems: [],
        clientComment: '',
        assumptions: [],
        micronutrients: [],
        source: 'manual',
        clientKey: 'notify-fail-1',
      },
    )
    expect(result.created).toBe(true)
    expect(result.mentorNotify).toBe('failed')
    expect(attempts).toHaveLength(1)
    expect(String(errors[0])).toContain('n8n down')
    expect(deferred).toHaveLength(1)
    await deferred[0]?.(new AbortController().signal)
    expect(attempts).toHaveLength(2)
    expect(deferred).toHaveLength(1)
  })

  test('does not notify the mentor when a mentee adds a ration day or catalogs a favorite', async () => {
    const menteeId = '22222222-2222-4222-8222-222222222222'
    const mentorId = '66666666-6666-4666-8666-666666666666'
    const notified: Array<{ chatId: string; title: string }> = []
    const records: MealRecord[] = []
    const repository = repositoryStub({
      findMentorMealNotifyTarget: async (userId) =>
        userId === menteeId
          ? {
              mentorId,
              telegramChatId: '998877',
              mentee: { publicId: 104, nickname: 'anya', displayName: 'Аня' },
            }
          : null,
      findMealByClientKey: async (userId, clientKey) =>
        records.find((record) => record.userId === userId && record.clientKey === clientKey) ?? null,
      createMeal: async (input) => {
        const created = mealRecord({
          id: '55555555-5555-4555-8555-555555555555',
          userId: input.userId,
          title: input.title,
          source: input.source,
          clientKey: input.clientKey ?? null,
          assumptions: input.assumptions,
        })
        records.push(created)
        return created
      },
    })
    const service = new MealsService({
      analyzer: {
        analyze: async () => {
          throw new Error('unused')
        },
        refine: async () => {
          throw new Error('unused')
        },
      },
      imageStore: {
        saveImage: async () => {
          throw new Error('unused')
        },
        readImage: async () => null,
      },
      imageUrlBuilder: imageUrls(),
      repository,
      mentorMealNotifier: {
        notify: async (payload) => {
          notified.push({ chatId: payload.chatId, title: payload.title })
        },
      },
    })

    await service.createUserMeal(
      { id: menteeId, role: 'user' },
      {
        title: 'Овсянка',
        ingredients: 'Овсянка',
        category: 'Завтрак',
        meal: 'Завтрак',
        kcal: 300,
        protein: 20,
        fat: 8,
        carbs: 40,
        portionItems: [],
        clientComment: '',
        assumptions: ['Добавлено из рациона', 'Рацион:office-1400', 'План:week:2026-08-31'],
        micronutrients: [],
        source: 'manual',
        clientKey: 'ration-meal-1',
      },
    )
    expect(notified).toEqual([])

    await service.createUserMeal(
      { id: menteeId, role: 'user' },
      {
        title: 'Жареный творог',
        ingredients: 'Творог',
        category: 'Завтрак',
        meal: 'Завтрак',
        kcal: 410,
        protein: 27,
        fat: 25,
        carbs: 20,
        portionItems: [],
        clientComment: '',
        assumptions: ['Добавлено из каталога', 'Каталог:plan-preview:catalog_loss:1'],
        micronutrients: [],
        source: 'manual',
        clientKey: 'catalog-fav-1',
      },
    )
    expect(notified).toEqual([])
  })

  test('createMealFromBot is idempotent for telegramUpdateId', async () => {
    const existing = mealRecord()
    let creates = 0
    const repository = repositoryStub({
      findMealByTelegramUpdateId: async () => existing,
      findMealById: async () => existing,
      listMealsForUser: async () => [existing],
      createMeal: async () => {
        creates += 1
        return existing
      },
    })
    const imageStore: MealImageStore = {
      saveImage: async () => {
        throw new Error('should not save')
      },
      readImage: async () => null,
    }
    const service = new MealsService({
      analyzer: {
        analyze: async () => {
          throw new Error('unused')
        },
        refine: async () => {
          throw new Error('unused')
        },
      },
      imageStore,
      imageUrlBuilder: imageUrls((id) => `/api/meals/${id}/image?signed=1`),
      repository,
    })

    const result = await service.createMealFromBot({
      userId: existing.userId,
      title: 'Овсянка',
      ingredients: 'Овсянка',
      category: 'Завтрак',
      meal: 'Завтрак',
      kcal: 300,
      protein: 20,
      fat: 8,
      carbs: 40,
      portionItems: [],
      clientComment: '',
      assumptions: [],
      micronutrients: [],
      source: 'telegram',
      telegramUpdateId: '42',
      imageBase64: 'abc',
    })

    expect(result.created).toBe(false)
    expect(result.meal.id).toBe(existing.id)
    expect(result.meal.versions).toHaveLength(1)
    expect(creates).toBe(0)
  })

  test('createMealFromBot rejects a normal Telegram idempotency hit owned by another user', async () => {
    const existing = mealRecord()
    const service = new MealsService({
      analyzer: {
        analyze: async () => {
          throw new Error('unused')
        },
        refine: async () => {
          throw new Error('unused')
        },
      },
      imageStore: {
        saveImage: async () => {
          throw new Error('should not save')
        },
        readImage: async () => null,
      },
      imageUrlBuilder: imageUrls(),
      repository: repositoryStub({
        findMealByTelegramUpdateId: async () => existing,
      }),
    })

    await expect(
      service.createMealFromBot({
        userId: '55555555-5555-4555-8555-555555555555',
        title: 'Чужая попытка',
        ingredients: '',
        category: 'Завтрак',
        meal: 'Завтрак',
        kcal: 1,
        protein: 0,
        fat: 0,
        carbs: 0,
        portionItems: [],
        clientComment: '',
        assumptions: [],
        micronutrients: [],
        source: 'telegram',
        telegramUpdateId: existing.telegramUpdateId!,
      }),
    ).rejects.toMatchObject({ kind: 'conflict' })
  })

  test('createMealFromBot rejects a conflict Telegram hit owned by another user', async () => {
    const existing = mealRecord()
    let lookups = 0
    const service = new MealsService({
      analyzer: {
        analyze: async () => {
          throw new Error('unused')
        },
        refine: async () => {
          throw new Error('unused')
        },
      },
      imageStore: {
        saveImage: async () => {
          throw new Error('unused')
        },
        readImage: async () => null,
      },
      imageUrlBuilder: imageUrls(),
      repository: repositoryStub({
        findMealByTelegramUpdateId: async () => {
          lookups += 1
          return lookups === 1 ? null : existing
        },
        createMeal: async () => {
          throw new MealsFailure('conflict', 'duplicate Telegram update')
        },
      }),
    })

    await expect(
      service.createMealFromBot({
        userId: '55555555-5555-4555-8555-555555555555',
        title: 'Чужая попытка',
        ingredients: '',
        category: 'Завтрак',
        meal: 'Завтрак',
        kcal: 1,
        protein: 0,
        fat: 0,
        carbs: 0,
        portionItems: [],
        clientComment: '',
        assumptions: [],
        micronutrients: [],
        source: 'telegram',
        telegramUpdateId: existing.telegramUpdateId!,
      }),
    ).rejects.toMatchObject({ kind: 'conflict' })
    expect(lookups).toBe(2)
  })

  test('createMealFromGeminiCard stores extra dish photos on vers. 1.0', async () => {
    const saved: Array<{ variant?: string; base64: string }> = []
    let createdExtraKeys: string[] | undefined
    const service = new MealsService({
      analyzer: {
        analyze: async () => {
          throw new Error('unused')
        },
        refine: async () => {
          throw new Error('unused')
        },
      },
      imageStore: {
        saveImage: async (input) => {
          saved.push({ variant: input.variant, base64: input.imageBase64 })
          return {
            imageKey: input.variant === 'extra' ? 'meals/extra-2.jpg' : 'meals/cover.jpg',
            imageMime: 'image/jpeg',
          }
        },
        readImage: async () => null,
      },
      imageUrlBuilder: imageUrls((id) => `/img/${id}`),
      repository: repositoryStub({
        createMeal: async (input) => {
          createdExtraKeys = input.versions?.[0]?.extraImageKeys
          return mealRecord({
            versions: input.versions,
            activeVersionId: input.activeVersionId ?? null,
            imageKey: input.imageKey ?? null,
          })
        },
      }),
    })

    await service.createMealFromGeminiCard({
      userId: '22222222-2222-4222-8222-222222222222',
      clientKey: 'app-1',
      imageBase64: 'cover',
      imageMime: 'image/jpeg',
      extraImages: [{ imageBase64: 'dish-2', imageMime: 'image/jpeg' }],
      source: 'manual',
      card: {
        title: 'Овсянка',
        excerpt: 'Овсянка',
        nutrition: { kcal: 420, protein: 28, fat: 10, carbs: 55 },
      },
    })

    expect(saved).toEqual([
      { variant: undefined, base64: 'cover' },
      { variant: 'extra', base64: 'dish-2' },
    ])
    expect(createdExtraKeys).toEqual(['meals/extra-2.jpg'])
  })

  test('mentor list rejects unassigned mentee', async () => {
    const service = new MealsService({
      analyzer: {
        analyze: async () => ({ ok: true, model: 'x', meal: {} as never }),
        refine: async () => ({ ok: true, model: 'x', meal: {} as never }),
      },
      imageStore: {
        saveImage: async () => ({ imageKey: 'a', imageMime: 'image/jpeg' }),
        readImage: async () => null,
      },
      imageUrlBuilder: imageUrls((id) => id),
      repository: repositoryStub(),
    })

    await expect(service.listMentorUserMeals('m1', 'u1')).rejects.toBeInstanceOf(MealsFailure)
  })

  test('mentor meal list marks unread only on unviewed reportable cards', async () => {
    const menteeId = '22222222-2222-4222-8222-222222222222'
    const unreadId = '11111111-1111-4111-8111-111111111111'
    const viewedId = '44444444-4444-4444-8444-444444444444'
    const pendingId = '55555555-5555-4555-8555-555555555555'
    const pendingAssumptions = ['Добавлено из рациона']
    const service = new MealsService({
      analyzer: {
        analyze: async () => {
          throw new Error('unused')
        },
        refine: async () => {
          throw new Error('unused')
        },
      },
      imageStore: {
        saveImage: async () => {
          throw new Error('unused')
        },
        readImage: async () => null,
      },
      imageUrlBuilder: imageUrls(),
      repository: repositoryStub({
        isMentorOf: async () => true,
        listMentorViewedMealIds: async () => [viewedId],
        listMealsForUser: async () => [
          mealRecord({ id: unreadId }),
          mealRecord({ id: viewedId, title: 'Viewed' }),
          mealRecord({
            id: pendingId,
            title: 'Plan',
            assumptions: pendingAssumptions,
            versions: mealRecord().versions.map((version) => ({
              ...version,
              snapshot: { ...version.snapshot, assumptions: pendingAssumptions },
            })),
          }),
        ],
      }),
    })

    const listed = await service.listMentorUserMeals('m1', menteeId)
    expect(listed.items.find((meal) => meal.id === unreadId)?.unread).toBe(true)
    expect(listed.items.find((meal) => meal.id === viewedId)?.unread).toBe(false)
    expect(listed.items.find((meal) => meal.id === pendingId)?.unread).toBe(false)
  })

  test('unread counts skip pending plan meals and drop only the viewed card ids', async () => {
    const menteeId = '22222222-2222-4222-8222-222222222222'
    const uploadedId = '11111111-1111-4111-8111-111111111111'
    const viewed = new Set<string>()
    const service = new MealsService({
      analyzer: {
        analyze: async () => {
          throw new Error('unused')
        },
        refine: async () => {
          throw new Error('unused')
        },
      },
      imageStore: {
        saveImage: async () => {
          throw new Error('unused')
        },
        readImage: async () => null,
      },
      imageUrlBuilder: imageUrls(),
      repository: repositoryStub({
        listMenteeIdsForMentor: async () => [menteeId],
        listMentorViewedMealIds: async () => [...viewed],
        listMealUnreadScan: async () => [
          {
            id: uploadedId,
            userId: menteeId,
            assumptions: [],
            createdAt: new Date('2026-08-26T09:00:00.000Z'),
            updatedAt: new Date('2026-08-26T09:00:00.000Z'),
          },
        ],
        isMentorOf: async () => true,
        findMealsByIds: async (ids) =>
          ids.includes(uploadedId)
            ? [
                {
                  id: uploadedId,
                  userId: menteeId,
                  assumptions: [],
                  createdAt: new Date('2026-08-26T09:00:00.000Z'),
                  updatedAt: new Date('2026-08-26T09:00:00.000Z'),
                },
              ]
            : [],
        insertMentorMealViews: async (_mentorId, _menteeId, mealIds) => {
          for (const id of mealIds) viewed.add(id)
        },
      }),
    })

    expect(await service.listMentorUnreadMeals('m1')).toEqual({
      items: [{ userId: menteeId, unreadCount: 1 }],
    })
    const marked = await service.markMenteeMealsViewed('m1', menteeId, [uploadedId])
    expect(marked).toEqual({
      ok: true,
      viewedMealIds: [uploadedId],
      unreadCount: 0,
    })
    expect(await service.listMentorUnreadMeals('m1')).toEqual({
      items: [{ userId: menteeId, unreadCount: 0 }],
    })
  })

  test('mark viewed ignores pending plan cards so completing them later stays unread', async () => {
    const menteeId = '22222222-2222-4222-8222-222222222222'
    const pendingId = '55555555-5555-4555-8555-555555555555'
    const inserted: string[] = []
    const service = new MealsService({
      analyzer: {
        analyze: async () => {
          throw new Error('unused')
        },
        refine: async () => {
          throw new Error('unused')
        },
      },
      imageStore: {
        saveImage: async () => {
          throw new Error('unused')
        },
        readImage: async () => null,
      },
      imageUrlBuilder: imageUrls(),
      repository: repositoryStub({
        isMentorOf: async () => true,
        listMenteeIdsForMentor: async () => [menteeId],
        listMentorViewedMealIds: async () => inserted,
        listMealUnreadScan: async () => [
          {
            id: pendingId,
            userId: menteeId,
            assumptions: ['Добавлено из рациона'],
            createdAt: new Date('2026-08-26T09:00:00.000Z'),
            updatedAt: new Date('2026-08-26T09:00:00.000Z'),
          },
        ],
        findMealsByIds: async () => [
          {
            id: pendingId,
            userId: menteeId,
            assumptions: ['Добавлено из рациона'],
            createdAt: new Date('2026-08-26T09:00:00.000Z'),
            updatedAt: new Date('2026-08-26T09:00:00.000Z'),
          },
        ],
        insertMentorMealViews: async (_mentorId, _menteeId, mealIds) => {
          inserted.push(...mealIds)
        },
      }),
    })

    const marked = await service.markMenteeMealsViewed('m1', menteeId, [pendingId])
    expect(marked.viewedMealIds).toEqual([])
    expect(inserted).toEqual([])
    expect(marked.unreadCount).toBe(0)
  })

  test('setMealPlanDone stamps only the owner planned meal', async () => {
    const existing = mealRecord({
      assumptions: ['Добавлено из рациона'],
    })
    existing.versions[0]!.snapshot.assumptions = ['Добавлено из рациона']
    let savedAssumptions: string[] | undefined
    const service = new MealsService({
      analyzer: {
        analyze: async () => {
          throw new Error('unused')
        },
        refine: async () => {
          throw new Error('unused')
        },
      },
      imageStore: {
        saveImage: async () => {
          throw new Error('unused')
        },
        readImage: async () => null,
      },
      imageUrlBuilder: imageUrls(),
      repository: repositoryStub({
        findMealById: async () => existing,
        updateMealContent: async (_id, content) => {
          savedAssumptions = content.assumptions
          return mealRecord({ assumptions: content.assumptions, versions: content.versions })
        },
      }),
    })

    const result = await service.setMealPlanDone(
      { id: existing.userId, role: 'user' },
      existing.id,
      true,
    )
    expect(savedAssumptions).toContain('Выполнено по плану')
    expect(result.meal.assumptions).toContain('Выполнено по плану')

    await expect(
      service.setMealPlanDone({ id: 'other', role: 'user' }, existing.id, true),
    ).rejects.toBeInstanceOf(MealsFailure)
  })

  test('refineMeal appends version and updates active content', async () => {
    const existing = mealRecord()
    const updatedVersions: { length: number } = { length: 0 }
    let refineInput: { coverBase64?: string; attachBase64?: string } | undefined
    let readImageCalls = 0
    const service = new MealsService({
      analyzer: {
        analyze: async () => {
          throw new Error('unused')
        },
        refine: async (input) => {
          refineInput = input
          return {
            ok: true as const,
            model: 'gemini-test',
            meal: {
              title: 'Овсянка с бананом',
              excerpt: 'Овсянка, банан',
              body: '',
              category: 'Завтрак',
              mealType: 'Завтрак',
              tags: [] as string[],
              nutrition: { kcal: 380, protein: 22, fat: 9, carbs: 55 },
              clientNoteStructured: 'Добавил банан',
              composition: [
                { label: 'Овсянка ~40 г', kcal: 180, protein: 8, fat: 3, carbs: 30 },
                { label: 'Банан ~80 г', kcal: 90, protein: 1, fat: 0, carbs: 23 },
              ],
              assumptions: ['Банан спелый'],
              micronutrients: [{ key: 'sodium', label: 'Натрий', unit: 'мг', amount: 180 }],
            },
          }
        },
      },
      imageStore: {
        saveImage: async () => ({ imageKey: 'a', imageMime: 'image/jpeg' }),
        readImage: async () => {
          readImageCalls += 1
          return Buffer.from('img')
        },
      },
      imageUrlBuilder: imageUrls(),
      repository: repositoryStub({
        findMealById: async () => existing,
        updateMealContent: async (_id, content) => {
          updatedVersions.length = content.versions.length
          return mealRecord({
            ...content,
            id: existing.id,
            userId: existing.userId,
          })
        },
      }),
    })

    const result = await service.refineMeal(
      { id: existing.userId, role: 'user' },
      existing.id,
      { message: 'банан 80г' },
    )

    expect(result.meal.title).toBe('Овсянка с бананом')
    expect(result.meal.kcal).toBe(380)
    expect(result.meal.versions).toHaveLength(2)
    expect(result.meal.versions[1]?.label).toBe('vers. 2.0')
    expect(result.meal.assumptions).toEqual(['Банан спелый'])
    expect(result.meal.clientComment).toBe('Добавил банан')
    expect(result.meal.assumptions.some((item) => item.startsWith('Уточнение в чате'))).toBe(false)
    expect(result.meal.micronutrients.find((item) => item.key === 'sodium')?.amount).toBe(180)
    expect(updatedVersions.length).toBe(2)
    expect(readImageCalls).toBe(0)
    expect(refineInput?.coverBase64).toBeUndefined()
  })

  test('refineMeal keeps catalog origin stamps after a text-only change', async () => {
    const existing = mealRecord({
      assumptions: ['Добавлено из каталога', 'Каталог:plan-preview:catalog_loss:1'],
    })
    let savedAssumptions: string[] = []
    const service = new MealsService({
      analyzer: {
        analyze: async () => {
          throw new Error('unused')
        },
        refine: async () => ({
          ok: true as const,
          model: 'gemini-test',
          meal: {
            title: 'Овсянка с бананом',
            excerpt: 'Овсянка, банан',
            body: '',
            category: 'Завтрак',
            mealType: 'Завтрак',
            tags: [] as string[],
            nutrition: { kcal: 380, protein: 22, fat: 9, carbs: 55 },
            clientNoteStructured: '',
            composition: [],
            assumptions: ['Банан спелый'],
            micronutrients: [],
          },
        }),
      },
      imageStore: { saveImage: async () => ({ imageKey: 'a', imageMime: 'image/jpeg' }), readImage: async () => null },
      imageUrlBuilder: imageUrls(),
      repository: repositoryStub({
        findMealById: async () => existing,
        updateMealContent: async (_id, content) => {
          savedAssumptions = content.assumptions
          return mealRecord({
            ...content,
            id: existing.id,
            userId: existing.userId,
            assumptions: content.assumptions,
          })
        },
      }),
    })

    const result = await service.refineMeal(
      { id: existing.userId, role: 'user' },
      existing.id,
      { message: 'банан 80г' },
    )

    expect(savedAssumptions).toEqual([
      'Добавлено из каталога',
      'Каталог:plan-preview:catalog_loss:1',
      'Банан спелый',
    ])
    expect(result.meal.assumptions).toEqual(savedAssumptions)
    await expect(
      service.setMealShared({ id: existing.userId, role: 'user' }, existing.id, true),
    ).rejects.toMatchObject({ kind: 'forbidden' })
  })

  test('refineMeal with attach photo still loads cover image', async () => {
    const existing = mealRecord({ imageKey: 'cover.jpg', imageMime: 'image/jpeg' })
    let refineInput: { coverBase64?: string; attachBase64?: string } | undefined
    const service = new MealsService({
      analyzer: {
        analyze: async () => {
          throw new Error('unused')
        },
        refine: async (input) => {
          refineInput = input
          return {
            ok: true as const,
            model: 'gemini-test',
            meal: {
              title: 'Овсянка',
              excerpt: 'Овсянка',
              body: '',
              category: 'Завтрак',
              mealType: 'Завтрак',
              tags: [] as string[],
              nutrition: { kcal: 300, protein: 20, fat: 8, carbs: 40 },
              clientNoteStructured: '',
              composition: [{ label: 'Овсянка ~40 г', kcal: 180, protein: 8, fat: 3, carbs: 30 }],
              assumptions: [],
              micronutrients: [],
            },
          }
        },
      },
      imageStore: {
        saveImage: async () => ({ imageKey: 'a', imageMime: 'image/jpeg' }),
        readImage: async () => Buffer.from('cover-bytes'),
      },
      imageUrlBuilder: imageUrls(),
      repository: repositoryStub({
        findMealById: async () => existing,
        updateMealContent: async (_id, content) =>
          mealRecord({
            ...content,
            id: existing.id,
            userId: existing.userId,
            imageKey: existing.imageKey,
            imageMime: existing.imageMime,
          }),
      }),
    })

    await service.refineMeal(
      { id: existing.userId, role: 'user' },
      existing.id,
      { message: '', imageBase64: 'att', imageMime: 'image/jpeg' },
    )

    expect(refineInput?.attachBase64).toBe('att')
    expect(refineInput?.coverBase64).toBe(Buffer.from('cover-bytes').toString('base64'))
  })

  test('refineMeal with attach photo keeps extras on the new version', async () => {
    const existing = mealRecord({ imageKey: 'cover.jpg', imageMime: 'image/jpeg' })
    let savedVersions: MealRecord['versions'] = []
    let savedVariant: 'cover' | 'extra' | undefined
    const service = new MealsService({
      analyzer: {
        analyze: async () => {
          throw new Error('unused')
        },
        refine: async () => ({
          ok: true as const,
          model: 'gemini-test',
          meal: {
            title: 'Овсянка и шаурма',
            excerpt: 'Овсянка, шаурма',
            body: '',
            category: 'Завтрак',
            mealType: 'Завтрак',
            tags: [] as string[],
            nutrition: { kcal: 700, protein: 40, fat: 20, carbs: 70 },
            clientNoteStructured: '',
            composition: [{ label: 'Шаурма ~200 г', kcal: 400, protein: 20, fat: 12, carbs: 30 }],
            assumptions: [],
            micronutrients: [],
          },
        }),
      },
      imageStore: {
        saveImage: async (input) => {
          savedVariant = input.variant
          return { imageKey: 'meals/extra-shawarma.jpg', imageMime: 'image/jpeg' }
        },
        readImage: async () => Buffer.from('cover-bytes'),
      },
      imageUrlBuilder: imageUrls((id) => `/img/${id}`),
      repository: repositoryStub({
        findMealById: async () => existing,
        updateMealContent: async (_id, content) => {
          savedVersions = content.versions
          return mealRecord({
            ...content,
            id: existing.id,
            userId: existing.userId,
            imageKey: existing.imageKey,
            imageMime: existing.imageMime,
          })
        },
      }),
    })

    const refined = await service.refineMeal(
      { id: existing.userId, role: 'user' },
      existing.id,
      { message: '', imageBase64: 'att', imageMime: 'image/jpeg' },
    )

    expect(savedVersions[0]?.extraImageKeys ?? []).toEqual([])
    expect(savedVersions[1]?.extraImageKeys).toEqual(['meals/extra-shawarma.jpg'])
    expect(savedVariant).toBe('extra')
    expect(refined.meal.extraImageUrls).toEqual([`/img/${existing.id}/extras/0`])
    expect(refined.meal.imageUrl).toBe(`/img/${existing.id}`)
    expect(refined.meal.assumptions).toContain('Добавлено своё фото')
  })

  test('refineMeal keeps every attached photo', async () => {
    const existing = mealRecord({
      title: 'Овсянка',
      ingredients: 'Овсянка',
      category: 'Завтрак',
      mealSlot: 'Завтрак',
      kcal: 300,
      protein: 10,
      fat: 8,
      carbs: 40,
    })
    let savedKeys: string[] = []
    let attachCount = 0
    const service = new MealsService({
      analyzer: {
        analyze: async () => {
          throw new Error('unused')
        },
        refine: async (input) => {
          attachCount = input.attachImages?.length ?? 0
          return {
            ok: true as const,
            model: 'gemini-test',
            meal: {
              title: 'Овсянка',
              excerpt: 'Овсянка',
              body: '',
              category: 'Завтрак',
              mealType: 'Завтрак',
              tags: [] as string[],
              nutrition: { kcal: 300, protein: 10, fat: 8, carbs: 40 },
              clientNoteStructured: '',
              composition: [{ label: 'Овсянка ~200 г', kcal: 300, protein: 10, fat: 8, carbs: 40 }],
              assumptions: [],
              micronutrients: [],
            },
          }
        },
      },
      imageStore: {
        saveImage: async () => {
          const imageKey = `meals/extra-${savedKeys.length + 1}.jpg`
          savedKeys = [...savedKeys, imageKey]
          return { imageKey, imageMime: 'image/jpeg' }
        },
        readImage: async () => Buffer.from('cover-bytes'),
      },
      imageUrlBuilder: imageUrls((id) => `/img/${id}`),
      repository: repositoryStub({
        findMealById: async () => existing,
        updateMealContent: async (_id, content) => {
          savedKeys = content.versions.at(-1)?.extraImageKeys ?? savedKeys
          return mealRecord({
            ...content,
            id: existing.id,
            userId: existing.userId,
            imageKey: existing.imageKey,
            imageMime: existing.imageMime,
          })
        },
      }),
    })

    await service.refineMeal(
      { id: existing.userId, role: 'user' },
      existing.id,
      {
        message: 'добавил ещё',
        images: [
          { imageBase64: 'one', imageMime: 'image/jpeg' },
          { imageBase64: 'two', imageMime: 'image/png' },
        ],
      },
    )

    expect(attachCount).toBe(2)
    expect(savedKeys).toEqual(['meals/extra-1.jpg', 'meals/extra-2.jpg'])
  })

  test('refineMeal with attach photo keeps the current foods and adds the photo foods', async () => {
    const existing = mealRecord({
      title: 'Рецепт шашлыка из свинины в духовке',
      ingredients: 'Свинина, лук',
      category: 'Мясо',
      mealSlot: 'Обед',
      kcal: 715,
      protein: 43,
      fat: 56,
      carbs: 9,
      portionItems: [
        { label: 'Свинина ~120 г', kcal: 320, protein: 28, fat: 22, carbs: 0 },
        { label: 'Лук репчатый ~80 г', kcal: 32, protein: 1, fat: 0, carbs: 7 },
      ],
    })
    let refineMessage = ''
    const service = new MealsService({
      analyzer: {
        analyze: async () => {
          throw new Error('unused')
        },
        refine: async (input) => {
          refineMessage = input.message
          return {
            ok: true as const,
            model: 'gemini-test',
            meal: {
              title: 'Шаурма',
              excerpt: 'Шаурма',
              body: '',
              category: 'Мясо',
              mealType: 'Ужин',
              tags: [] as string[],
              nutrition: { kcal: 400, protein: 20, fat: 12, carbs: 30 },
              clientNoteStructured: '',
              composition: [{ label: 'Шаурма ~200 г', kcal: 400, protein: 20, fat: 12, carbs: 30 }],
              assumptions: [],
              micronutrients: [],
            },
          }
        },
      },
      imageStore: {
        saveImage: async () => ({ imageKey: 'meals/extra.jpg', imageMime: 'image/jpeg' }),
        readImage: async () => Buffer.from('cover-bytes'),
      },
      imageUrlBuilder: imageUrls(),
      repository: repositoryStub({
        findMealById: async () => existing,
        updateMealContent: async (_id, content) =>
          mealRecord({
            ...content,
            id: existing.id,
            userId: existing.userId,
            imageKey: existing.imageKey,
            imageMime: existing.imageMime,
          }),
      }),
    })

    const refined = await service.refineMeal(
      { id: existing.userId, role: 'user' },
      existing.id,
      { message: '', imageBase64: 'att', imageMime: 'image/jpeg' },
    )

    expect(refineMessage).toContain('Добавь к текущему составу')
    expect(refineMessage).toContain('Существующие позиции не удаляй')
    expect(refined.meal.title).toBe('Рецепт шашлыка из свинины в духовке')
    expect(refined.meal.meal).toBe('Обед')
    expect(refined.meal.portionItems.map((item) => item.label)).toEqual([
      'Свинина ~120 г',
      'Лук репчатый ~80 г',
      'Шаурма ~200 г',
    ])
    expect(refined.meal.kcal).toBe(1115)
    expect(refined.meal.protein).toBe(63)
  })

  test('refineMeal skips extra slides when attach reuses the cover key', async () => {
    const existing = mealRecord({ imageKey: 'cover.jpg', imageMime: 'image/jpeg' })
    let savedVersions: MealRecord['versions'] = []
    const service = new MealsService({
      analyzer: {
        analyze: async () => {
          throw new Error('unused')
        },
        refine: async () => ({
          ok: true as const,
          model: 'gemini-test',
          meal: {
            title: 'Овсянка',
            excerpt: 'Овсянка',
            body: '',
            category: 'Завтрак',
            mealType: 'Завтрак',
            tags: [] as string[],
            nutrition: { kcal: 300, protein: 20, fat: 8, carbs: 40 },
            clientNoteStructured: '',
            composition: [{ label: 'Овсянка ~40 г', kcal: 180, protein: 8, fat: 3, carbs: 30 }],
            assumptions: [],
            micronutrients: [],
          },
        }),
      },
      imageStore: {
        saveImage: async () => ({ imageKey: existing.imageKey!, imageMime: 'image/jpeg' }),
        readImage: async () => Buffer.from('cover-bytes'),
      },
      imageUrlBuilder: imageUrls((id) => `/img/${id}`),
      repository: repositoryStub({
        findMealById: async () => existing,
        updateMealContent: async (_id, content) => {
          savedVersions = content.versions
          return mealRecord({
            ...content,
            id: existing.id,
            userId: existing.userId,
            imageKey: existing.imageKey,
            imageMime: existing.imageMime,
          })
        },
      }),
    })

    const refined = await service.refineMeal(
      { id: existing.userId, role: 'user' },
      existing.id,
      { message: '', imageBase64: 'att', imageMime: 'image/jpeg' },
    )

    expect(savedVersions[1]?.extraImageKeys ?? []).toEqual([])
    expect(refined.meal.extraImageUrls).toEqual([])
  })

  test('hides extra slides that point at the cover file', async () => {
    const existing = mealRecord({
      imageKey: 'cover.jpg',
      versions: [
        {
          ...mealRecord().versions[0]!,
          extraImageKeys: ['cover.jpg'],
        },
      ],
    })
    const service = new MealsService({
      analyzer: {
        analyze: async () => {
          throw new Error('unused')
        },
        refine: async () => {
          throw new Error('unused')
        },
      },
      imageStore: {
        saveImage: async () => ({ imageKey: 'a', imageMime: 'image/jpeg' }),
        readImage: async () => null,
      },
      imageUrlBuilder: imageUrls((id) => `/img/${id}`),
      repository: repositoryStub({
        listMealsForUser: async () => [existing],
      }),
    })

    const listed = await service.listCurrentUserMeals(existing.userId)
    expect(listed.items[0]?.extraImageUrls).toEqual([])
    expect(listed.items[0]?.imageUrl).toBe(`/img/${existing.id}`)
  })

  test('selectMealVersion restores original snapshot', async () => {
    const originalId = '33333333-3333-4333-8333-333333333333'
    const revisedId = '44444444-4444-4444-8444-444444444444'
    const existing = mealRecord({
      title: 'Уточнённая',
      kcal: 400,
      versions: [
        {
          id: originalId,
          createdAt: '2026-08-04T08:00:00.000Z',
          label: 'vers. 1.0',
          snapshot: {
            title: 'Овсянка',
            ingredients: 'Овсянка',
            category: 'Завтрак',
            meal: 'Завтрак',
            kcal: 300,
            protein: 20,
            fat: 8,
            carbs: 40,
            portionItems: [{ label: 'Овсянка ~40 г', kcal: 0, protein: 0, fat: 0, carbs: 0 }],
            clientComment: '',
            assumptions: [],
            micronutrients: [],
          },
        },
        {
          id: revisedId,
          createdAt: '2026-08-04T08:05:00.000Z',
          label: 'vers. 2.0',
          snapshot: {
            title: 'Уточнённая',
            ingredients: 'Овсянка, банан',
            category: 'Завтрак',
            meal: 'Завтрак',
            kcal: 400,
            protein: 22,
            fat: 9,
            carbs: 55,
            portionItems: [
              { label: 'Овсянка ~40 г', kcal: 0, protein: 0, fat: 0, carbs: 0 },
              { label: 'Банан ~80 г', kcal: 0, protein: 0, fat: 0, carbs: 0 },
            ],
            clientComment: 'Добавил банан',
            assumptions: [],
            micronutrients: [],
          },
        },
      ],
      activeVersionId: revisedId,
    })

    const service = new MealsService({
      analyzer: {
        analyze: async () => {
          throw new Error('unused')
        },
        refine: async () => {
          throw new Error('unused')
        },
      },
      imageStore: {
        saveImage: async () => ({ imageKey: 'a', imageMime: 'image/jpeg' }),
        readImage: async () => null,
      },
      imageUrlBuilder: imageUrls((id) => id),
      repository: repositoryStub({
        findMealById: async () => existing,
      }),
    })

    const result = await service.selectMealVersion(
      { id: existing.userId, role: 'user' },
      existing.id,
      originalId,
    )

    expect(result.meal.title).toBe('Овсянка')
    expect(result.meal.kcal).toBe(300)
    expect(result.meal.activeVersionId).toBe(originalId)
  })

  test('deleteMeal removes owner meal and image', async () => {
    const existing = mealRecord()
    const deleted: { id?: string; imageKey?: string | null } = {}
    const service = new MealsService({
      analyzer: {
        analyze: async () => {
          throw new Error('unused')
        },
        refine: async () => {
          throw new Error('unused')
        },
      },
      imageStore: {
        saveImage: async () => ({ imageKey: 'a', imageMime: 'image/jpeg' }),
        readImage: async () => null,
        deleteImage: async (key) => {
          deleted.imageKey = key
        },
      },
      imageUrlBuilder: imageUrls((id) => id),
      repository: repositoryStub({
        findMealById: async () => existing,
        deleteMeal: async (id) => {
          deleted.id = id
        },
      }),
    })

    const result = await service.deleteMeal(
      { id: existing.userId, role: 'user' },
      existing.id,
    )
    expect(result).toEqual({ ok: true })
    expect(deleted).toEqual({ id: existing.id, imageKey: existing.imageKey })
  })

  test('deleteMeal rejects non-owner', async () => {
    const existing = mealRecord()
    const service = new MealsService({
      analyzer: {
        analyze: async () => {
          throw new Error('unused')
        },
        refine: async () => {
          throw new Error('unused')
        },
      },
      imageStore: {
        saveImage: async () => ({ imageKey: 'a', imageMime: 'image/jpeg' }),
        readImage: async () => null,
      },
      imageUrlBuilder: imageUrls((id) => id),
      repository: repositoryStub({
        findMealById: async () => existing,
      }),
    })

    await expect(
      service.deleteMeal({ id: '99999999-9999-4999-8999-999999999999', role: 'user' }, existing.id),
    ).rejects.toBeInstanceOf(MealsFailure)
  })

  test('readMealImage serves the requested size and reports webp mime for cards', async () => {
    const existing = mealRecord()
    const webp = Buffer.from([
      0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50,
    ])
    let requestedSize: string | undefined
    const service = new MealsService({
      analyzer: {
        analyze: async () => {
          throw new Error('unused')
        },
        refine: async () => {
          throw new Error('unused')
        },
      },
      imageStore: {
        saveImage: async () => ({ imageKey: 'a', imageMime: 'image/jpeg' }),
        readImage: async (_key, size) => {
          requestedSize = size
          return webp
        },
      },
      imageUrlBuilder: imageUrls((id) => id),
      repository: repositoryStub({
        findMealById: async () => existing,
      }),
    })

    const card = await service.readMealImage(null, existing.id, true, 'card')
    expect(requestedSize).toBe('card')
    expect(card.mime).toBe('image/webp')
    expect(card.filename).toBe('meal.card.webp')

    const full = await service.readMealImage(null, existing.id, true, 'full')
    expect(requestedSize).toBe('full')
  })

  test('setMealShared publishes a meal for the owner and lists it in the feed', async () => {
    const existing = mealRecord({ sharedAt: null })
    let stored: MealRecord = existing
    const service = new MealsService({
      analyzer: { analyze: async () => ({ ok: true, model: 'x', meal: {} as never }), refine: async () => ({ ok: true, model: 'x', meal: {} as never }) },
      imageStore: { saveImage: async () => ({ imageKey: 'a', imageMime: 'image/jpeg' }), readImage: async () => null },
      imageUrlBuilder: imageUrls((id) => `/img/${id}`),
      repository: repositoryStub({
        findMealById: async () => stored,
        setMealShared: async (_id, sharedAt) => {
          stored = mealRecord({ ...stored, sharedAt })
          return stored
        },
        listSharedMeals: async () =>
          stored.sharedAt
            ? [{ ...stored, authorName: 'Иван', likeCount: 0, liked: false }]
            : [],
      }),
    })
    const owner = { id: existing.userId, role: 'user' }
    await expect(
      service.setMealShared({ id: '99999999-9999-4999-8999-999999999999', role: 'user' }, existing.id, true),
    ).rejects.toMatchObject({ kind: 'forbidden' })

    const published = await service.setMealShared(owner, existing.id, true)
    expect(published.meal.shared).toBe(true)
    const feed = await service.listSharedMeals(owner.id)
    expect(feed.items).toHaveLength(1)
    expect(feed.items[0]?.authorName).toBe('Иван')
    expect(feed.items[0]?.likeCount).toBe(0)

    const hidden = await service.setMealShared(owner, existing.id, false)
    expect(hidden.meal.shared).toBe(false)
    expect((await service.listSharedMeals(owner.id)).items).toHaveLength(0)
  })

  test('setMealShared refuses ration copies, and likes only apply to published meals', async () => {
    const rationMeal = mealRecord({
      assumptions: ['Добавлено из рациона', 'Рацион:mentor-ab12'],
    })
    let likes: Array<{ mealId: string; userId: string }> = []
    const shared = mealRecord({
      id: '55555555-5555-4555-8555-555555555555',
      sharedAt: new Date('2026-08-25T12:00:00.000Z'),
    })
    const service = new MealsService({
      analyzer: { analyze: async () => ({ ok: true, model: 'x', meal: {} as never }), refine: async () => ({ ok: true, model: 'x', meal: {} as never }) },
      imageStore: { saveImage: async () => ({ imageKey: 'a', imageMime: 'image/jpeg' }), readImage: async () => null },
      imageUrlBuilder: imageUrls((id) => `/img/${id}`),
      repository: repositoryStub({
        findMealById: async (id) => {
          if (id === rationMeal.id) return rationMeal
          if (id === shared.id) return shared
          return mealRecord({ id, sharedAt: null })
        },
        listSharedMeals: async () => [
          { ...rationMeal, sharedAt: new Date('2026-08-25T12:00:00.000Z'), authorName: 'Наставник', likeCount: 0, liked: false },
          { ...shared, authorName: 'Иван', likeCount: likes.length, liked: likes.some((row) => row.userId === shared.userId) },
        ],
        setMealLike: async (mealId, userId, liked) => {
          likes = liked
            ? [{ mealId, userId }]
            : likes.filter((row) => !(row.mealId === mealId && row.userId === userId))
          return { likeCount: likes.length, liked }
        },
      }),
    })
    const owner = { id: rationMeal.userId, role: 'user' }
    await expect(service.setMealShared(owner, rationMeal.id, true)).rejects.toMatchObject({
      kind: 'forbidden',
    })
    const feedCopy = mealRecord({
      id: '66666666-6666-4666-8666-666666666666',
      assumptions: ['Добавлено из ленты', 'Лента:aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'],
    })
    const feedService = new MealsService({
      analyzer: { analyze: async () => ({ ok: true, model: 'x', meal: {} as never }), refine: async () => ({ ok: true, model: 'x', meal: {} as never }) },
      imageStore: { saveImage: async () => ({ imageKey: 'a', imageMime: 'image/jpeg' }), readImage: async () => null },
      imageUrlBuilder: imageUrls((id) => `/img/${id}`),
      repository: repositoryStub({
        findMealById: async () => feedCopy,
      }),
    })
    await expect(
      feedService.setMealShared({ id: feedCopy.userId, role: 'user' }, feedCopy.id, true),
    ).rejects.toMatchObject({ kind: 'forbidden' })
    const catalogCopy = mealRecord({
      id: '77777777-7777-4777-8777-777777777777',
      assumptions: ['Добавлено из каталога', 'Каталог:plan-preview:catalog_loss:1'],
    })
    const catalogService = new MealsService({
      analyzer: { analyze: async () => ({ ok: true, model: 'x', meal: {} as never }), refine: async () => ({ ok: true, model: 'x', meal: {} as never }) },
      imageStore: { saveImage: async () => ({ imageKey: 'a', imageMime: 'image/jpeg' }), readImage: async () => null },
      imageUrlBuilder: imageUrls((id) => `/img/${id}`),
      repository: repositoryStub({
        findMealById: async () => catalogCopy,
      }),
    })
    await expect(
      catalogService.setMealShared({ id: catalogCopy.userId, role: 'user' }, catalogCopy.id, true),
    ).rejects.toMatchObject({ kind: 'forbidden' })
    const uniquified = mealRecord({
      id: '88888888-8888-4888-8888-888888888888',
      assumptions: ['Добавлено из каталога', 'Каталог:plan-preview:catalog_loss:1'],
      versions: [
        {
          id: '99999999-9999-4999-8999-999999999999',
          createdAt: '2026-08-04T08:00:00.000Z',
          label: 'vers. 2.0',
          extraImageKeys: ['meals/owner-photo.webp'],
          snapshot: {
            title: 'Овсянка',
            ingredients: 'Овсянка',
            category: 'Завтрак',
            meal: 'Завтрак',
            kcal: 300,
            protein: 20,
            fat: 8,
            carbs: 40,
            portionItems: [],
            clientComment: '',
            assumptions: ['Добавлено из каталога'],
            micronutrients: [],
          },
        },
      ],
      activeVersionId: '99999999-9999-4999-8999-999999999999',
    })
    const uniquifiedService = new MealsService({
      analyzer: { analyze: async () => ({ ok: true, model: 'x', meal: {} as never }), refine: async () => ({ ok: true, model: 'x', meal: {} as never }) },
      imageStore: { saveImage: async () => ({ imageKey: 'a', imageMime: 'image/jpeg' }), readImage: async () => null },
      imageUrlBuilder: imageUrls((id) => `/img/${id}`),
      repository: repositoryStub({
        findMealById: async () => uniquified,
        setMealShared: async (_id, sharedAt) => ({ ...uniquified, sharedAt }),
      }),
    })
    const publishedCopy = await uniquifiedService.setMealShared(
      { id: uniquified.userId, role: 'user' },
      uniquified.id,
      true,
    )
    expect(publishedCopy.meal.shared).toBe(true)
    const feed = await service.listSharedMeals(owner.id)
    expect(feed.items).toHaveLength(1)
    expect(feed.items[0]?.id).toBe(shared.id)

    const privateMeal = mealRecord({ id: '44444444-4444-4444-8444-444444444444', sharedAt: null })
    await expect(
      service.setMealLike(owner, privateMeal.id, true),
    ).rejects.toMatchObject({ kind: 'forbidden' })

    const liked = await service.setMealLike(owner, shared.id, true)
    expect(liked.meal.liked).toBe(true)
    expect(liked.meal.likeCount).toBe(1)
    const unliked = await service.setMealLike(owner, shared.id, false)
    expect(unliked.meal.liked).toBe(false)
    expect(unliked.meal.likeCount).toBe(0)
  })
})

