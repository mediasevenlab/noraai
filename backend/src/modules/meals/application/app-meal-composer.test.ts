import { describe, expect, test } from 'bun:test'
import type { MealDto } from '@web-app-demo/contracts'

import { AppMealComposer } from './app-meal-composer'
import { MealsService } from './meals-service'
import type { MealImageStore, MealRecord, MealsRepository } from './ports'

function mealRecord(overrides: Partial<MealRecord> = {}): MealRecord {
  const versionId = '33333333-3333-4333-8333-333333333333'
  return {
    id: '11111111-1111-4111-8111-111111111111',
    userId: '22222222-2222-4222-8222-222222222222',
    title: 'Овсянка',
    ingredients: 'Овсянка',
    category: 'Завтрак',
    mealSlot: 'Завтрак',
    recordedAt: new Date('2026-08-19T08:00:00.000Z'),
    kcal: 420,
    protein: 28,
    fat: 10,
    carbs: 55,
    portionItems: [],
    clientComment: '',
    assumptions: [],
    micronutrients: [],
    versions: [
      {
        id: versionId,
        createdAt: '2026-08-19T08:00:00.000Z',
        label: 'vers. 1.0',
        snapshot: {
          title: 'Овсянка',
          ingredients: 'Овсянка',
          category: 'Завтрак',
          meal: 'Завтрак',
          kcal: 420,
          protein: 28,
          fat: 10,
          carbs: 55,
          portionItems: [],
          clientComment: '',
          assumptions: [],
          micronutrients: [],
        },
      },
    ],
    activeVersionId: versionId,
    source: 'manual',
    telegramUpdateId: null,
    clientKey: 'app-1',
    imageKey: 'user/meal.jpg',
    imageMime: 'image/jpeg',
    sharedAt: null,
    createdAt: new Date('2026-08-19T08:00:01.000Z'),
    ...overrides,
  }
}

function mealDto(overrides: Partial<MealDto> = {}): MealDto {
  const record = mealRecord()
  return {
    id: record.id,
    userId: record.userId,
    title: record.title,
    ingredients: record.ingredients,
    category: 'Завтрак',
    meal: 'Завтрак',
    recordedAt: record.recordedAt.toISOString(),
    kcal: record.kcal,
    protein: record.protein,
    fat: record.fat,
    carbs: record.carbs,
    imageUrl: `/api/meals/${record.id}/image`,
    extraImageUrls: [],
    portionItems: record.portionItems,
    clientComment: record.clientComment,
    assumptions: record.assumptions,
    micronutrients: record.micronutrients,
    versions: record.versions.map((version) => ({
      id: version.id,
      createdAt: version.createdAt,
      label: version.label,
      note: version.note,
      snapshot: version.snapshot,
    })),
    activeVersionId: record.activeVersionId!,
    source: record.source,
    createdAt: record.createdAt.toISOString(),
    shared: false,
    likeCount: 0,
    liked: false,
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
    findMealById: async () => mealRecord(),
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
    createMeal: async (input) =>
      mealRecord({
        userId: input.userId,
        title: input.title,
        source: input.source,
        telegramUpdateId: input.telegramUpdateId ?? null,
        clientKey: input.clientKey ?? null,
      }),
    updateMealContent: async () => mealRecord(),
    setMealShared: async () => mealRecord(),
    setMealLike: async () => ({ likeCount: 0, liked: false }),
    deleteMeal: async () => undefined,
    ...overrides,
  }
}

const imageStore: MealImageStore = {
  saveImage: async () => ({ imageKey: 'a', imageMime: 'image/jpeg' }),
  readImage: async () => null,
}

describe('AppMealComposer', () => {
  test('photo then note persists a manual meal through analyze', async () => {
    let analyzedNote = ''
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
      imageUrlBuilder: {
        build: (id) => `/img/${id}`,
        buildExtra: (id, index) => `/img/${id}/extras/${index}`,
      },
      repository: repositoryStub(),
    })
    const composer = new AppMealComposer({
      analyze: async (input) => {
        analyzedNote = input.note ?? ''
        return {
          ok: true,
          model: 'n8n',
          meal: {
            title: 'Овсянка',
            excerpt: 'Овсянка',
            body: 'Овсянка',
            category: 'Завтрак',
            mealType: 'Завтрак',
            tags: [],
            nutrition: { kcal: 420, protein: 28, fat: 10, carbs: 55 },
            clientNoteStructured: '',
            composition: [],
            assumptions: [],
            micronutrients: [],
          },
        }
      },
      persist: (input) => service.createMealFromGeminiCard(input),
    })

    const opened = await composer.applyTurn('22222222-2222-4222-8222-222222222222', {
      action: 'open',
    })
    expect(opened.status).toBe('idle')
    expect(opened.messages[0]?.text).toContain('Пришлите фото вашего приёма пищи')

    const photo = await composer.applyTurn('22222222-2222-4222-8222-222222222222', {
      action: 'photo',
      imageBase64: 'abc',
      imageMime: 'image/jpeg',
    })
    expect(photo.status).toBe('collecting')
    expect(photo.photoCount).toBe(1)
    expect(photo.flushAfterMs).toBeNull()

    const second = await composer.applyTurn('22222222-2222-4222-8222-222222222222', {
      action: 'photo',
      imageBase64: 'def',
      imageMime: 'image/jpeg',
    })
    expect(second.photoCount).toBe(2)

    const removed = await composer.applyTurn('22222222-2222-4222-8222-222222222222', {
      action: 'remove-photo',
      photoIndex: 0,
    })
    expect(removed.status).toBe('collecting')
    expect(removed.photoCount).toBe(1)
    expect(removed.messages.at(-1)?.text).toContain('Фото удалено')

    const done = await composer.applyTurn('22222222-2222-4222-8222-222222222222', {
      action: 'note',
      note: 'без сахара',
    })
    expect(analyzedNote).toBe('без сахара')
    expect(done.status).toBe('done')
    expect(done.created).toBe(true)
    expect(done.meal?.title).toBe('Овсянка')
    expect(done.meal?.source).toBe('manual')
    expect(done.messages.at(-1)?.text).toContain('Запись в дневник')
    composer.dispose()
  })

  test('serializes concurrent photo turns so every dish stays in the session', async () => {
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
      imageUrlBuilder: {
        build: (id) => `/img/${id}`,
        buildExtra: (id, index) => `/img/${id}/extras/${index}`,
      },
      repository: repositoryStub(),
    })
    const composer = new AppMealComposer({
      analyze: async () => {
        throw new Error('should not analyze')
      },
      persist: (input) => service.createMealFromGeminiCard(input),
    })
    const userId = '22222222-2222-4222-8222-222222222222'
    await composer.applyTurn(userId, { action: 'open' })
    const [first, second] = await Promise.all([
      composer.applyTurn(userId, { action: 'photo', imageBase64: 'a', imageMime: 'image/jpeg' }),
      composer.applyTurn(userId, { action: 'photo', imageBase64: 'b', imageMime: 'image/jpeg' }),
    ])
    expect(Math.max(first.photoCount, second.photoCount)).toBe(2)
    composer.dispose()
  })

  test('rejects a hollow analysis instead of saving an empty meal card', async () => {
    let persisted = 0
    const composer = new AppMealComposer({
      analyze: async () => ({
        ok: true,
        model: 'n8n',
        meal: {
          title: 'Приём пищи',
          excerpt: '',
          body: '',
          category: 'Баланс',
          mealType: 'Перекус',
          tags: [],
          nutrition: { kcal: 0, protein: 0, fat: 0, carbs: 0 },
          clientNoteStructured: '',
          composition: [],
          assumptions: [],
          micronutrients: [],
        },
      }),
      persist: async () => {
        persisted += 1
        throw new Error('should not persist')
      },
    })
    const userId = '22222222-2222-4222-8222-222222222222'
    await composer.applyTurn(userId, { action: 'open' })
    await composer.applyTurn(userId, {
      action: 'photo',
      imageBase64: 'abc',
      imageMime: 'image/jpeg',
    })
    const done = await composer.applyTurn(userId, { action: 'flush' })
    expect(persisted).toBe(0)
    expect(done.status).toBe('collecting')
    expect(done.photoCount).toBe(1)
    expect(done.messages.at(-1)?.text).toContain('Не удалось разобрать')
    composer.dispose()
  })

  test('does not pass a reasoning flag when a photo is analyzed', async () => {
    let thinking: boolean | undefined = true
    const composer = new AppMealComposer({
      analyze: async (input) => {
        thinking = input.thinking
        return {
          ok: true,
          model: 'gemini',
          meal: {
            title: 'Овсянка',
            excerpt: 'Овсянка',
            body: '',
            category: 'Завтрак',
            mealType: 'Завтрак',
            tags: [],
            nutrition: { kcal: 420, protein: 28, fat: 10, carbs: 55 },
            clientNoteStructured: '',
            composition: [],
            assumptions: [],
            micronutrients: [],
          },
        }
      },
      persist: async () => ({ meal: mealDto(), created: true }),
    })
    const userId = '22222222-2222-4222-8222-222222222222'
    await composer.applyTurn(userId, { action: 'open' })
    await composer.applyTurn(userId, { action: 'photo', imageBase64: 'a', imageMime: 'image/jpeg' })
    await composer.applyTurn(userId, { action: 'flush' })
    expect(thinking).toBeUndefined()
    composer.dispose()
  })

  test('sends every attached dish photo to analyze and persist extras', async () => {
    let analyzedImages = 0
    let extraCount = 0
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
      imageUrlBuilder: {
        build: (id) => `/img/${id}`,
        buildExtra: (id, index) => `/img/${id}/extras/${index}`,
      },
      repository: repositoryStub(),
    })
    const composer = new AppMealComposer({
      analyze: async (input) => {
        analyzedImages = input.images?.length ?? 0
        return {
          ok: true,
          model: 'n8n',
          meal: {
            title: 'Овсянка',
            excerpt: 'Овсянка, брокколи',
            body: '',
            category: 'Завтрак',
            mealType: 'Завтрак',
            tags: [],
            nutrition: { kcal: 420, protein: 28, fat: 10, carbs: 55 },
            clientNoteStructured: '',
            composition: [],
            assumptions: [],
            micronutrients: [],
          },
        }
      },
      persist: async (input) => {
        extraCount = input.extraImages?.length ?? 0
        return service.createMealFromGeminiCard(input)
      },
    })
    const userId = '22222222-2222-4222-8222-222222222222'
    await composer.applyTurn(userId, { action: 'open' })
    await composer.applyTurn(userId, { action: 'photo', imageBase64: 'a', imageMime: 'image/jpeg' })
    await composer.applyTurn(userId, { action: 'photo', imageBase64: 'b', imageMime: 'image/jpeg' })
    const done = await composer.applyTurn(userId, { action: 'flush' })
    expect(analyzedImages).toBe(2)
    expect(extraCount).toBe(1)
    expect(done.status).toBe('done')
    composer.dispose()
  })

  test('retries persist with a stable composer clientKey', async () => {
    const keys: string[] = []
    let failOnce = true
    const composer = new AppMealComposer({
      analyze: async () => ({
        ok: true,
        model: 'n8n',
        meal: {
          title: 'Овсянка',
          excerpt: 'Овсянка',
          body: '',
          category: 'Завтрак',
          mealType: 'Завтрак',
          tags: [],
          nutrition: { kcal: 420, protein: 28, fat: 10, carbs: 55 },
          clientNoteStructured: '',
          composition: [],
          assumptions: [],
          micronutrients: [],
        },
      }),
      persist: async (input) => {
        keys.push(String(input.clientKey))
        if (failOnce) {
          failOnce = false
          throw new Error('transient persist')
        }
        return {
          created: true,
          mentorNotify: 'skipped',
          meal: mealDto(),
        }
      },
    })
    const userId = '22222222-2222-4222-8222-222222222222'
    await composer.applyTurn(userId, { action: 'open' })
    await composer.applyTurn(userId, {
      action: 'photo',
      imageBase64: 'abc',
      imageMime: 'image/jpeg',
    })
    await composer.applyTurn(userId, { action: 'flush' })
    await composer.applyTurn(userId, { action: 'flush' })
    expect(keys).toHaveLength(2)
    expect(keys[0]).toBe(keys[1])
    expect(keys[0]?.startsWith(`app-${userId}-`)).toBe(true)
    composer.dispose()
  })
})
