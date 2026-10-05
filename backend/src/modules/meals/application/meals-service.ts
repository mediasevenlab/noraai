import {
  mealCategorySchema,
  mealSlotSchema,
  type CreateMealFromBotRequest,
  type MealDto,
  type MealMicronutrient,
  type MealPortionItem,
  type MealsGeminiRequest,
  type MentorNotifyDelivery,
  type RefineMealRequest,
} from '@web-app-demo/contracts'

import { randomUUID } from 'node:crypto'
import path from 'node:path'
import { MealsFailure } from '../domain/errors'
import {
  mealAssumptionsArePlanCopy,
  mealCanPublishToFeed,
  preserveMealShareAssumptions,
  withAuthorPhotoMark,
} from '../domain/meal-share'
import {
  applyMealPlanDoneMark,
  countUnreadMealsByMentee,
  isMentorUnreadMeal,
  mentorUnreadEventAt,
} from '../domain/mentor-unread'
import {
  buildMentorMealNotifyPayload,
  shouldNotifyMentorOfNewMeal,
} from '../domain/mentor-meal-notify'
import { detectMealImageMime } from '../domain/meal-image'
import {
  applyAdditivePhotoRefine,
  REFINE_ATTACH_PHOTO_INSTRUCTION,
} from '../domain/meal-composition'
import { mapGeminiCardToMealFields } from '../domain/mapping'
import { mealImageCardKey, parseMealImageSize } from '../domain/meal-image-variants'
import {
  appendMealVersion,
  canRefineMeal,
  extraImageKeysForActiveVersion,
  extraImageKeysOf,
  ensureMealVersions,
  selectMealVersion,
  type MealVersionRecord,
  type MealWithVersions,
} from '../domain/meal-versions'

import type {
  MealAnalyzer,
  MealImageStore,
  MealImageUrlBuilder,
  MealRecord,
  MealsRepository,
  MentorMealNotifier,
  MentorNotifyTaskDeferrer,
} from './ports'

export type MealsServiceDependencies = {
  analyzer: MealAnalyzer
  imageStore: MealImageStore
  imageUrlBuilder: MealImageUrlBuilder
  repository: MealsRepository
  mentorMealNotifier?: MentorMealNotifier
  backgroundTasks?: MentorNotifyTaskDeferrer
  onNotifyError?: (error: unknown) => void
}

type MealCreateInput = Omit<CreateMealFromBotRequest, 'telegramUpdateId'> & {
  telegramUpdateId?: string
  clientKey?: string
  actorUserId?: string
  extraImages?: Array<{
    imageBase64: string
    imageMime?: CreateMealFromBotRequest['imageMime']
  }>
}

function refineImages(input: RefineMealRequest) {
  if (input.images?.length) return input.images
  if (input.imageBase64) {
    return [{ imageBase64: input.imageBase64, imageMime: input.imageMime }]
  }
  return []
}

export class MealsService {
  constructor(private readonly dependencies: MealsServiceDependencies) {}
  async analyzeMeal(input: MealsGeminiRequest) {
    return this.dependencies.analyzer.analyze(input)
  }

  async transcribeAudio(input: { audioBase64: string; audioMime?: string }) {
    if (!this.dependencies.analyzer.transcribe) {
      throw new MealsFailure('misconfigured', 'Voice transcription is not configured')
    }
    return this.dependencies.analyzer.transcribe(input)
  }

  async lookupTelegramUser(username: string) {
    const user = await this.dependencies.repository.findUserByTelegramUsername(username)
    return { user: user ? { id: user.id, publicId: user.publicId } : null }
  }

  async lookupTelegramPhone(phone: string) {
    const user = await this.dependencies.repository.findUserByTelegramPhone(phone)
    return { user: user ? { id: user.id, publicId: user.publicId } : null }
  }

  async findTelegramMeal(userId: string, telegramUpdateId: string) {
    const meal = await this.dependencies.repository.findMealByTelegramUpdateId(telegramUpdateId)
    return this.requireIdempotencyOwner(meal, userId)
  }

  getTelegramPollerOffset(cursorId: string) {
    return this.dependencies.repository.getTelegramPollerOffset(cursorId)
  }

  advanceTelegramPollerOffset(cursorId: string, offset: number) {
    return this.dependencies.repository.advanceTelegramPollerOffset(cursorId, offset)
  }

  setTelegramChatId(userId: string, chatId: string) {
    return this.dependencies.repository.setTelegramChatId(userId, chatId)
  }

  private reportMentorNotifyError(error: unknown) {
    const report = this.dependencies.onNotifyError
      ?? ((cause: unknown) => console.error('Mentor meal notify', cause))
    report(error)
  }

  private scheduleMentorNotifyRetries(
    payload: Parameters<MentorMealNotifier['notify']>[0],
    remaining: number,
  ) {
    const defer = this.dependencies.backgroundTasks?.defer
    const notifier = this.dependencies.mentorMealNotifier
    if (!defer || !notifier || remaining <= 0) return
    defer(async (signal) => {
      if (signal.aborted) return
      try {
        await notifier.notify(payload)
      } catch (error) {
        this.reportMentorNotifyError(error)
        this.scheduleMentorNotifyRetries(payload, remaining - 1)
      }
    })
  }

  private async notifyMentorOfNewMeal(input: {
    actorUserId: string
    meal: MealRecord
  }): Promise<MentorNotifyDelivery> {
    const notifier = this.dependencies.mentorMealNotifier
    if (!notifier) return 'skipped'
    try {
      const target = await this.dependencies.repository.findMentorMealNotifyTarget(input.meal.userId)
      if (!target) return 'skipped'
      if (!shouldNotifyMentorOfNewMeal({
        actorUserId: input.actorUserId,
        mentorId: target.mentorId,
        assumptions: input.meal.assumptions,
      })) return 'skipped'
      const payload = buildMentorMealNotifyPayload({
        chatId: target.telegramChatId,
        mentee: target.mentee,
        meal: {
          title: input.meal.title,
          mealSlot: input.meal.mealSlot,
          kcal: input.meal.kcal,
          protein: input.meal.protein,
          fat: input.meal.fat,
          carbs: input.meal.carbs,
          ingredients: input.meal.ingredients,
          source: input.meal.source,
        },
      })
      try {
        await notifier.notify(payload)
        return 'sent'
      } catch (error) {
        this.reportMentorNotifyError(error)
        this.scheduleMentorNotifyRetries(payload, 2)
        return 'failed'
      }
    } catch (error) {
      this.reportMentorNotifyError(error)
      return 'failed'
    }
  }

  async listCurrentUserMeals(userId: string) {
    const items = await this.dependencies.repository.listMealsForUser(userId)
    return { items: items.map((meal) => this.toDto(this.hydrateVersions(meal))) }
  }

  async listMentorUserMeals(mentorUserId: string, menteeUserId: string) {
    const allowed = await this.dependencies.repository.isMentorOf(mentorUserId, menteeUserId)
    if (!allowed) {
      throw new MealsFailure('forbidden', 'Mentee is not assigned to this mentor')
    }
    const viewedMealIds = new Set(
      await this.dependencies.repository.listMentorViewedMealIds(mentorUserId),
    )
    const items = await this.dependencies.repository.listMealsForUser(menteeUserId)
    return {
      items: items.map((meal) => {
        const hydrated = this.hydrateVersions(meal)
        return this.toDto(hydrated, {
          unread: isMentorUnreadMeal(
            {
              id: meal.id,
              assumptions: hydrated.assumptions,
              createdAt: meal.createdAt,
              updatedAt: meal.createdAt,
            },
            viewedMealIds,
          ),
        })
      }),
    }
  }

  async listMentorUnreadMeals(mentorUserId: string) {
    const menteeIds = await this.dependencies.repository.listMenteeIdsForMentor(mentorUserId)
    if (menteeIds.length === 0) return { items: [] }
    const viewedMealIds = new Set(
      await this.dependencies.repository.listMentorViewedMealIds(mentorUserId),
    )
    const meals = await this.dependencies.repository.listMealUnreadScan(menteeIds)
    return { items: countUnreadMealsByMentee(meals, viewedMealIds, menteeIds) }
  }

  async markMenteeMealsViewed(mentorUserId: string, menteeUserId: string, mealIds: string[]) {
    const allowed = await this.dependencies.repository.isMentorOf(mentorUserId, menteeUserId)
    if (!allowed) {
      throw new MealsFailure('forbidden', 'Mentee is not assigned to this mentor')
    }
    const uniqueIds = [...new Set(mealIds)]
    const found = uniqueIds.length
      ? await this.dependencies.repository.findMealsByIds(uniqueIds)
      : []
    const acceptedIds = found
      .filter((meal) => meal.userId === menteeUserId && mentorUnreadEventAt(meal) != null)
      .map((meal) => meal.id)
    if (acceptedIds.length > 0) {
      await this.dependencies.repository.insertMentorMealViews(
        mentorUserId,
        menteeUserId,
        acceptedIds,
      )
    }
    const unread = (await this.listMentorUnreadMeals(mentorUserId)).items.find(
      (item) => item.userId === menteeUserId,
    )
    return {
      ok: true as const,
      viewedMealIds: acceptedIds,
      unreadCount: unread?.unreadCount ?? 0,
    }
  }

  async setMealPlanDone(
    actor: { id: string; role: string },
    mealId: string,
    done: boolean,
    recordedAt?: string,
  ) {
    const meal = await this.dependencies.repository.findMealById(mealId)
    if (!meal) {
      throw new MealsFailure('not_found', 'Meal not found')
    }
    if (meal.userId !== actor.id) {
      throw new MealsFailure('forbidden', 'Only the meal owner can mark a plan meal done')
    }
    if (!mealAssumptionsArePlanCopy(meal.assumptions)) {
      throw new MealsFailure('bad_request', 'Only planned meals can be marked done')
    }
    const assumptions = applyMealPlanDoneMark(meal.assumptions, done)
    const nextRecordedAt =
      done && recordedAt
        ? (() => {
            const parsed = new Date(recordedAt)
            return Number.isNaN(parsed.getTime()) ? undefined : parsed
          })()
        : undefined
    const assumptionsUnchanged =
      assumptions.length === meal.assumptions.length
      && assumptions.every((item, index) => item === meal.assumptions[index])
    if (assumptionsUnchanged && !nextRecordedAt) {
      return { meal: this.toDto(this.hydrateVersions(meal)) }
    }
    const hydrated = this.hydrateVersions({ ...meal, assumptions })
    const versions = hydrated.versions.map((version) =>
      version.id === hydrated.activeVersionId
        ? {
            ...version,
            snapshot: {
              ...version.snapshot,
              assumptions: applyMealPlanDoneMark(version.snapshot.assumptions, done),
            },
          }
        : version,
    )
    const saved = await this.dependencies.repository.updateMealContent(mealId, {
      title: hydrated.title,
      ingredients: hydrated.ingredients,
      category: mealCategorySchema.parse(hydrated.category),
      mealSlot: mealSlotSchema.parse(hydrated.mealSlot),
      kcal: hydrated.kcal,
      protein: hydrated.protein,
      fat: hydrated.fat,
      carbs: hydrated.carbs,
      portionItems: hydrated.portionItems,
      clientComment: hydrated.clientComment,
      assumptions,
      micronutrients: hydrated.micronutrients,
      versions,
      activeVersionId: hydrated.activeVersionId!,
      ...(nextRecordedAt ? { recordedAt: nextRecordedAt } : {}),
    })
    return { meal: this.toDto(saved) }
  }

  async listSharedMeals(viewerUserId: string) {
    const items = await this.dependencies.repository.listSharedMeals(200, viewerUserId)
    return {
      items: items
        .filter((meal) =>
          mealCanPublishToFeed({
            assumptions: meal.assumptions,
            extraImageKeys: extraImageKeysForActiveVersion(meal.versions, meal.activeVersionId),
          }),
        )
        .slice(0, 80)
        .map((meal) =>
          this.toDto(this.hydrateVersions(meal), {
            authorName: meal.authorName,
            likeCount: meal.likeCount,
            liked: meal.liked,
          }),
        ),
    }
  }

  async setMealShared(
    actor: { id: string; role: string },
    mealId: string,
    shared: boolean,
  ) {
    const meal = await this.dependencies.repository.findMealById(mealId)
    if (!meal) {
      throw new MealsFailure('not_found', 'Meal not found')
    }
    if (meal.userId !== actor.id) {
      throw new MealsFailure('forbidden', 'Only the meal owner can share it')
    }
    if (
      shared
      && !mealCanPublishToFeed({
        assumptions: meal.assumptions,
        extraImageKeys: extraImageKeysForActiveVersion(meal.versions, meal.activeVersionId),
      })
    ) {
      throw new MealsFailure(
        'forbidden',
        'Копию из каталога, плана или ленты можно опубликовать только после своего фото',
      )
    }
    if ((meal.sharedAt != null) === shared) {
      return { meal: this.toDto(this.hydrateVersions(meal)) }
    }
    const saved = await this.dependencies.repository.setMealShared(
      mealId,
      shared ? new Date() : null,
    )
    return { meal: this.toDto(this.hydrateVersions(saved)) }
  }

  async setMealLike(
    actor: { id: string; role: string },
    mealId: string,
    liked: boolean,
  ) {
    const meal = await this.dependencies.repository.findMealById(mealId)
    if (!meal) {
      throw new MealsFailure('not_found', 'Meal not found')
    }
    if (meal.sharedAt == null) {
      throw new MealsFailure('forbidden', 'Only published meals can be liked')
    }
    const result = await this.dependencies.repository.setMealLike(mealId, actor.id, liked)
    return {
      meal: this.toDto(this.hydrateVersions(meal), {
        likeCount: result.likeCount,
        liked: result.liked,
      }),
    }
  }

  async createUserMeal(
    actor: { id: string; role: string },
    input: {
      title: string
      ingredients: string
      category: string
      meal: string
      recordedAt?: string
      kcal: number
      protein: number
      fat: number
      carbs: number
      portionItems: MealPortionItem[]
      clientComment: string
      assumptions: string[]
      micronutrients: MealMicronutrient[]
      source?: 'telegram' | 'manual'
      clientKey?: string
      imageBase64?: string
      imageMime?: CreateMealFromBotRequest['imageMime']
    },
    ownerUserId?: string,
  ) {
    const userId = ownerUserId ?? actor.id
    if (userId !== actor.id) {
      if (actor.role !== 'mentor') {
        throw new MealsFailure('forbidden', 'Meal create denied')
      }
      const allowed = await this.dependencies.repository.isMentorOf(actor.id, userId)
      if (!allowed) {
        throw new MealsFailure('forbidden', 'Meal create denied')
      }
    }
    return this.createMeal({
      userId,
      actorUserId: actor.id,
      title: input.title,
      ingredients: input.ingredients,
      category: input.category as CreateMealFromBotRequest['category'],
      meal: input.meal as CreateMealFromBotRequest['meal'],
      recordedAt: input.recordedAt,
      kcal: input.kcal,
      protein: input.protein,
      fat: input.fat,
      carbs: input.carbs,
      portionItems: input.portionItems,
      clientComment: input.clientComment,
      assumptions: input.assumptions,
      micronutrients: input.micronutrients,
      source: input.source ?? 'manual',
      clientKey: input.clientKey,
      imageBase64: input.imageBase64,
      imageMime: input.imageMime,
    })
  }

  async createMealFromBot(
    input: CreateMealFromBotRequest & {
      extraImages?: Array<{
        imageBase64: string
        imageMime?: CreateMealFromBotRequest['imageMime']
      }>
    },
  ) {
    return this.createMeal({
      ...input,
      actorUserId: input.userId,
    })
  }

  private async createMeal(input: MealCreateInput) {
    if (input.telegramUpdateId && input.clientKey) {
      throw new MealsFailure('bad_request', 'Use either telegramUpdateId or clientKey')
    }
    const existing = await this.findIdempotentMeal(input)
    if (existing) {
      return {
        meal: this.toDto(await this.ensurePersistedVersions(existing)),
        created: false,
        mentorNotify: 'skipped' as const,
      }
    }
    const mealId = randomUUID()
    let imageKey: string | null = null
    let imageMime: string | null = null
    const extraImageKeys: string[] = []
    const cleanupImages = async () => {
      if (imageKey) await this.dependencies.imageStore.deleteImage?.(imageKey)
      for (const key of extraImageKeys) await this.dependencies.imageStore.deleteImage?.(key)
    }
    if (input.imageBase64) {
      const saved = await this.dependencies.imageStore.saveImage({
        userId: input.userId,
        mealId,
        imageBase64: input.imageBase64,
        imageMime: input.imageMime,
      })
      imageKey = saved.imageKey
      imageMime = saved.imageMime
    }
    try {
      for (const extra of input.extraImages ?? []) {
        if (!extra.imageBase64) continue
        const saved = await this.dependencies.imageStore.saveImage({
          userId: input.userId,
          mealId,
          imageBase64: extra.imageBase64,
          imageMime: extra.imageMime,
          variant: 'extra',
        })
        if (saved.imageKey === imageKey || extraImageKeys.includes(saved.imageKey)) continue
        extraImageKeys.push(saved.imageKey)
      }
    } catch (error) {
      await cleanupImages()
      throw error
    }
    const recordedAt = input.recordedAt ? new Date(input.recordedAt) : new Date()
    const seeded = ensureMealVersions({
      title: input.title,
      ingredients: input.ingredients,
      category: mealCategorySchema.parse(input.category),
      mealSlot: mealSlotSchema.parse(input.meal),
      kcal: input.kcal,
      protein: input.protein,
      fat: input.fat,
      carbs: input.carbs,
      portionItems: input.portionItems,
      clientComment: input.clientComment,
      assumptions: input.assumptions,
      micronutrients: input.micronutrients,
      extraImageKeys,
      createdAt: recordedAt,
      versions: [],
      activeVersionId: null,
    })
    try {
      const created = await this.dependencies.repository.createMeal({
        id: mealId,
        userId: input.userId,
        title: seeded.title,
        ingredients: seeded.ingredients,
        category: seeded.category,
        mealSlot: seeded.mealSlot,
        recordedAt,
        kcal: seeded.kcal,
        protein: seeded.protein,
        fat: seeded.fat,
        carbs: seeded.carbs,
        portionItems: seeded.portionItems,
        clientComment: seeded.clientComment,
        assumptions: seeded.assumptions,
        micronutrients: seeded.micronutrients,
        versions: seeded.versions,
        activeVersionId: seeded.activeVersionId,
        source: input.source,
        telegramUpdateId: input.telegramUpdateId ?? null,
        clientKey: input.clientKey ?? null,
        imageKey,
        imageMime,
      })
      const mentorNotify = await this.notifyMentorOfNewMeal({
        actorUserId: input.actorUserId ?? input.userId,
        meal: created,
      })
      return { meal: this.toDto(created), created: true, mentorNotify }
    } catch (error) {
      if (
        error instanceof MealsFailure
        && error.kind === 'conflict'
        && (input.telegramUpdateId || input.clientKey)
      ) {
        let conflictHit: MealRecord | null
        try {
          conflictHit = await this.findIdempotentMeal(input)
        } catch (lookupError) {
          await cleanupImages()
          throw lookupError
        }
        if (conflictHit) {
          await cleanupImages()
          return {
            meal: this.toDto(await this.ensurePersistedVersions(conflictHit)),
            created: false,
            mentorNotify: 'skipped' as const,
          }
        }
      }
      await cleanupImages()
      throw error
    }
  }

  async createMealFromGeminiCard(input: {
    userId: string
    telegramUpdateId?: string
    clientKey?: string
    recordedAt?: Date
    imageBase64?: string
    imageMime?: CreateMealFromBotRequest['imageMime']
    extraImages?: Array<{
      imageBase64: string
      imageMime?: CreateMealFromBotRequest['imageMime']
    }>
    card: Parameters<typeof mapGeminiCardToMealFields>[0]
    source?: CreateMealFromBotRequest['source']
  }) {
    const fields = mapGeminiCardToMealFields(input.card)
    return this.createMeal({
      userId: input.userId,
      actorUserId: input.userId,
      title: fields.title,
      ingredients: fields.ingredients,
      category: fields.category,
      meal: fields.meal,
      recordedAt: (input.recordedAt ?? new Date()).toISOString(),
      kcal: fields.kcal,
      protein: fields.protein,
      fat: fields.fat,
      carbs: fields.carbs,
      portionItems: fields.portionItems,
      clientComment: fields.clientComment,
      assumptions: fields.assumptions,
      micronutrients: fields.micronutrients,
      source: input.source ?? 'telegram',
      telegramUpdateId: input.telegramUpdateId,
      clientKey: input.clientKey,
      imageBase64: input.imageBase64,
      imageMime: input.imageMime,
      extraImages: input.extraImages,
    })
  }

  private async findIdempotentMeal(input: {
    userId: string
    telegramUpdateId?: string
    clientKey?: string
  }): Promise<MealRecord | null> {
    if (input.clientKey) {
      const meal = await this.dependencies.repository.findMealByClientKey(
        input.userId,
        input.clientKey,
      )
      return this.requireIdempotencyOwner(meal, input.userId)
    }
    if (input.telegramUpdateId) {
      const meal = await this.dependencies.repository.findMealByTelegramUpdateId(
        input.telegramUpdateId,
      )
      return this.requireIdempotencyOwner(meal, input.userId)
    }
    return null
  }

  private requireIdempotencyOwner(meal: MealRecord | null, userId: string): MealRecord | null {
    if (meal && meal.userId !== userId) {
      throw new MealsFailure('conflict', 'Idempotency key is already owned by another user')
    }
    return meal
  }

  async refineMeal(
    actor: { id: string; role: string },
    mealId: string,
    input: RefineMealRequest,
    ownerUserId?: string,
  ) {
    const meal = await this.requireEditableMeal(actor, mealId, ownerUserId)
    const ensured = await this.ensurePersistedVersions(meal)
    if (!canRefineMeal(this.toVersioned(ensured))) {
      throw new MealsFailure('bad_request', 'Достигнут лимит уточнений (5)')
    }
    const images = refineImages(input)
    const message =
      input.message.trim()
      || (images.length > 0 ? REFINE_ATTACH_PHOTO_INSTRUCTION : '')
    if (!message && images.length === 0) {
      throw new MealsFailure('bad_request', 'message or image required')
    }
    // Text-only refine: card JSON already has title/portion/macros — skip cover
    // photo to cut Gemini latency (often several seconds for the image alone).
    const needsCoverPhoto = images.length > 0
    let coverBase64: string | undefined
    let coverMime: string | undefined
    if (needsCoverPhoto && ensured.imageKey) {
      const bytes = await this.dependencies.imageStore.readImage(ensured.imageKey)
      if (bytes) {
        coverBase64 = bytes.toString('base64')
        coverMime = ensured.imageMime ?? 'image/jpeg'
      }
    }
    const result = await this.dependencies.analyzer.refine({
      card: this.toGeminiCard(ensured),
      message,
      coverBase64,
      coverMime,
      attachBase64: images[0]?.imageBase64,
      attachMime: images[0]?.imageMime,
      attachImages: images.map((image) => ({
        base64: image.imageBase64,
        mime: image.imageMime,
      })),
    })
    const analyzed = mapGeminiCardToMealFields(result.meal)
    const current = this.toVersioned(ensured)
    const fields = images.length > 0
      ? applyAdditivePhotoRefine(
          {
            title: current.title,
            ingredients: current.ingredients,
            category: current.category,
            meal: current.mealSlot,
            kcal: current.kcal,
            protein: current.protein,
            fat: current.fat,
            carbs: current.carbs,
            portionItems: current.portionItems,
            clientComment: current.clientComment,
            assumptions: analyzed.assumptions,
            micronutrients: analyzed.micronutrients,
          },
          analyzed,
        )
      : analyzed
    const extraImageKeys = await this.extraImageKeysAfterRefine(ensured, mealId, input)
    let assumptions = preserveMealShareAssumptions(ensured.assumptions, fields.assumptions)
    if (images.length > 0) assumptions = withAuthorPhotoMark(assumptions)
    const refinedBase = ensureMealVersions({
      ...current,
      title: fields.title,
      ingredients: fields.ingredients,
      category: fields.category,
      mealSlot: fields.meal,
      kcal: fields.kcal,
      protein: fields.protein,
      fat: fields.fat,
      carbs: fields.carbs,
      portionItems: fields.portionItems,
      clientComment: fields.clientComment,
      assumptions,
      micronutrients: fields.micronutrients,
    })
    const withHistory = appendMealVersion(
      { ...refinedBase, extraImageKeys },
      input.message.trim() || (images.length > 0 ? 'фото' : 'уточнение'),
    )
    const saved = await this.dependencies.repository.updateMealContent(mealId, {
      title: withHistory.title,
      ingredients: withHistory.ingredients,
      category: withHistory.category,
      mealSlot: withHistory.mealSlot,
      kcal: withHistory.kcal,
      protein: withHistory.protein,
      fat: withHistory.fat,
      carbs: withHistory.carbs,
      portionItems: withHistory.portionItems,
      clientComment: withHistory.clientComment,
      assumptions: withHistory.assumptions,
      micronutrients: withHistory.micronutrients,
      versions: withHistory.versions,
      activeVersionId: withHistory.activeVersionId!,
      expectedActiveVersionId: ensured.activeVersionId,
    })
    return { meal: this.toDto(saved) }
  }

  async selectMealVersion(
    actor: { id: string; role: string },
    mealId: string,
    versionId: string,
    ownerUserId?: string,
  ) {
    const meal = await this.requireEditableMeal(actor, mealId, ownerUserId)
    const ensured = await this.ensurePersistedVersions(meal)
    const selected = selectMealVersion(this.toVersioned(ensured), versionId)
    if (!selected) {
      throw new MealsFailure('not_found', 'Meal version not found')
    }
    const saved = await this.dependencies.repository.updateMealContent(mealId, {
      title: selected.title,
      ingredients: selected.ingredients,
      category: selected.category,
      mealSlot: selected.mealSlot,
      kcal: selected.kcal,
      protein: selected.protein,
      fat: selected.fat,
      carbs: selected.carbs,
      portionItems: selected.portionItems,
      clientComment: selected.clientComment,
      assumptions: selected.assumptions,
      micronutrients: selected.micronutrients,
      versions: selected.versions,
      activeVersionId: selected.activeVersionId!,
      expectedActiveVersionId: ensured.activeVersionId,
    })
    return { meal: this.toDto(saved) }
  }

  async deleteMeal(actor: { id: string; role: string }, mealId: string) {
    const meal = await this.dependencies.repository.findMealById(mealId)
    if (!meal) {
      throw new MealsFailure('not_found', 'Meal not found')
    }
    if (meal.userId !== actor.id) {
      throw new MealsFailure('forbidden', 'Only the meal owner can delete it')
    }
    await this.dependencies.repository.deleteMeal(mealId)
    const extraKeys = meal.versions.flatMap((version) => extraImageKeysOf(version))
    const imageKeys = [meal.imageKey, ...extraKeys].filter(
      (key, index, all): key is string => Boolean(key) && all.indexOf(key) === index,
    )
    if (this.dependencies.imageStore.deleteImage) {
      for (const imageKey of imageKeys) {
        await this.dependencies.imageStore.deleteImage(imageKey)
      }
    }
    return { ok: true as const }
  }

  async deleteImagesForUser(userId: string) {
    const meals = await this.dependencies.repository.listMealsForUser(userId)
    if (!this.dependencies.imageStore.deleteImage) return
    const imageKeys: string[] = []
    for (const meal of meals) {
      if (meal.imageKey) imageKeys.push(meal.imageKey)
      for (const key of this.extraImageKeysForClient(this.hydrateVersions(meal))) {
        imageKeys.push(key)
      }
      for (const version of meal.versions) {
        imageKeys.push(...extraImageKeysOf(version))
      }
    }
    const unique = [...new Set(imageKeys.filter(Boolean))]
    for (const imageKey of unique) {
      await this.dependencies.imageStore.deleteImage(imageKey)
    }
  }

  async readMealImage(
    actor: { id: string; role: string } | null,
    mealId: string,
    signedAccess: boolean,
    sizeRaw?: string,
  ) {
    const meal = await this.dependencies.repository.findMealById(mealId)
    if (!meal || !meal.imageKey) {
      throw new MealsFailure('not_found', 'Meal image not found')
    }
    if (!signedAccess) {
      if (!actor) {
        throw new MealsFailure('forbidden', 'Meal image access denied')
      }
      if (meal.userId !== actor.id) {
        if (actor.role !== 'mentor') {
          throw new MealsFailure('forbidden', 'Meal image access denied')
        }
        const allowed = await this.dependencies.repository.isMentorOf(actor.id, meal.userId)
        if (!allowed) {
          throw new MealsFailure('forbidden', 'Meal image access denied')
        }
      }
    }
    return this.readStoredMealImage(meal.imageKey, meal.imageMime, sizeRaw)
  }

  async readMealExtraImage(
    actor: { id: string; role: string } | null,
    mealId: string,
    index: number,
    signedAccess: boolean,
    sizeRaw?: string,
  ) {
    const meal = await this.dependencies.repository.findMealById(mealId)
    if (!meal) {
      throw new MealsFailure('not_found', 'Meal extra image not found')
    }
    if (!signedAccess) {
      if (!actor) {
        throw new MealsFailure('forbidden', 'Meal image access denied')
      }
      if (meal.userId !== actor.id) {
        if (actor.role !== 'mentor') {
          throw new MealsFailure('forbidden', 'Meal image access denied')
        }
        const allowed = await this.dependencies.repository.isMentorOf(actor.id, meal.userId)
        if (!allowed) {
          throw new MealsFailure('forbidden', 'Meal image access denied')
        }
      }
    }
    const keys = this.extraImageKeysForClient(meal)
    const imageKey = keys[index]
    if (!imageKey) {
      throw new MealsFailure('not_found', 'Meal extra image not found')
    }
    return this.readStoredMealImage(imageKey, meal.imageMime, sizeRaw)
  }

  private async readStoredMealImage(
    imageKey: string,
    storedMime: string | null,
    sizeRaw?: string,
  ) {
    const size = parseMealImageSize(sizeRaw)
    const bytes = await this.dependencies.imageStore.readImage(imageKey, size)
    if (!bytes) {
      throw new MealsFailure('not_found', 'Meal image file missing')
    }
    const mime = detectMealImageMime(bytes) ?? storedMime ?? 'image/jpeg'
    const filename =
      size === 'card' && mime === 'image/webp'
        ? path.basename(mealImageCardKey(imageKey))
        : path.basename(imageKey)
    return { bytes, mime, filename }
  }

  private async requireEditableMeal(
    actor: { id: string; role: string },
    mealId: string,
    ownerUserId?: string,
  ) {
    const meal = await this.dependencies.repository.findMealById(mealId)
    if (!meal) {
      throw new MealsFailure('not_found', 'Meal not found')
    }
    if (ownerUserId && meal.userId !== ownerUserId) {
      throw new MealsFailure('not_found', 'Meal not found')
    }
    if (meal.userId === actor.id) return meal
    if (actor.role !== 'mentor') {
      throw new MealsFailure('forbidden', 'Meal access denied')
    }
    const allowed = await this.dependencies.repository.isMentorOf(actor.id, meal.userId)
    if (!allowed) {
      throw new MealsFailure('forbidden', 'Meal access denied')
    }
    return meal
  }

  private hydrateVersions(meal: MealRecord): MealRecord {
    const ensured = ensureMealVersions(this.toVersioned(meal))
    return {
      ...meal,
      title: ensured.title,
      ingredients: ensured.ingredients,
      category: ensured.category,
      mealSlot: ensured.mealSlot,
      kcal: ensured.kcal,
      protein: ensured.protein,
      fat: ensured.fat,
      carbs: ensured.carbs,
      portionItems: ensured.portionItems,
      clientComment: ensured.clientComment,
      assumptions: ensured.assumptions,
      micronutrients: ensured.micronutrients,
      versions: ensured.versions,
      activeVersionId: ensured.activeVersionId,
    }
  }

  private async ensurePersistedVersions(meal: MealRecord): Promise<MealRecord> {
    const ensured = ensureMealVersions(this.toVersioned(meal))
    const alreadyPersisted =
      meal.versions.length > 0
      && meal.activeVersionId === ensured.activeVersionId
      && meal.versions.length === ensured.versions.length
    if (alreadyPersisted) {
      return {
        ...meal,
        assumptions: ensured.assumptions,
        micronutrients: ensured.micronutrients,
        versions: ensured.versions,
        activeVersionId: ensured.activeVersionId,
      }
    }
    return this.dependencies.repository.updateMealContent(meal.id, {
      title: ensured.title,
      ingredients: ensured.ingredients,
      category: ensured.category,
      mealSlot: ensured.mealSlot,
      kcal: ensured.kcal,
      protein: ensured.protein,
      fat: ensured.fat,
      carbs: ensured.carbs,
      portionItems: ensured.portionItems,
      clientComment: ensured.clientComment,
      assumptions: ensured.assumptions,
      micronutrients: ensured.micronutrients,
      versions: ensured.versions,
      activeVersionId: ensured.activeVersionId!,
    })
  }

  private toVersioned(meal: MealRecord): MealWithVersions {
    return {
      title: meal.title,
      ingredients: meal.ingredients,
      category: mealCategorySchema.parse(meal.category),
      mealSlot: mealSlotSchema.parse(meal.mealSlot),
      kcal: meal.kcal,
      protein: meal.protein,
      fat: meal.fat,
      carbs: meal.carbs,
      portionItems: meal.portionItems,
      clientComment: meal.clientComment,
      assumptions: meal.assumptions,
      micronutrients: meal.micronutrients,
      createdAt: meal.createdAt,
      extraImageKeys: extraImageKeysForActiveVersion(meal.versions, meal.activeVersionId),
      versions: meal.versions,
      activeVersionId: meal.activeVersionId,
    }
  }

  private toGeminiCard(meal: MealRecord) {
    return {
      title: meal.title,
      excerpt: meal.ingredients,
      body: '',
      category: meal.category,
      mealType: meal.mealSlot,
      tags: [],
      nutrition: {
        kcal: meal.kcal,
        protein: meal.protein,
        fat: meal.fat,
        carbs: meal.carbs,
      },
      clientNoteStructured: meal.clientComment,
      composition: meal.portionItems,
      assumptions: meal.assumptions,
      micronutrients: meal.micronutrients,
    }
  }

  private async extraImageKeysAfterRefine(
    meal: MealRecord,
    mealId: string,
    input: RefineMealRequest,
  ) {
    const inherited = extraImageKeysForActiveVersion(meal.versions, meal.activeVersionId)
    const images = refineImages(input)
    if (images.length === 0) return inherited
    const keys = [...inherited]
    for (const image of images) {
      const saved = await this.dependencies.imageStore.saveImage({
        userId: meal.userId,
        mealId,
        imageBase64: image.imageBase64,
        imageMime: image.imageMime,
        variant: 'extra',
      })
      if (saved.imageKey === meal.imageKey || keys.includes(saved.imageKey)) continue
      keys.push(saved.imageKey)
    }
    return keys
  }

  private extraImageKeysForClient(meal: MealRecord) {
    return extraImageKeysForActiveVersion(meal.versions, meal.activeVersionId).filter(
      (key) => key !== meal.imageKey,
    )
  }

  private publicVersions(versions: MealVersionRecord[]) {
    return versions.map((version) => ({
      id: version.id,
      createdAt: version.createdAt,
      label: version.label,
      note: version.note,
      snapshot: version.snapshot,
    }))
  }

  private toDto(
    meal: MealRecord,
    extras?: { authorName?: string; likeCount?: number; liked?: boolean; unread?: boolean },
  ): MealDto {
    const ensured = ensureMealVersions(this.toVersioned(meal))
    const extraImageKeys = this.extraImageKeysForClient({
      ...meal,
      versions: ensured.versions,
      activeVersionId: ensured.activeVersionId,
    })
    return {
      id: meal.id,
      userId: meal.userId,
      title: ensured.title,
      ingredients: ensured.ingredients,
      category: ensured.category,
      meal: ensured.mealSlot,
      recordedAt: meal.recordedAt.toISOString(),
      kcal: ensured.kcal,
      protein: ensured.protein,
      fat: ensured.fat,
      carbs: ensured.carbs,
      imageUrl: meal.imageKey
        ? this.dependencies.imageUrlBuilder.build(meal.id)
        : `/api/meals/${meal.id}/image`,
      extraImageUrls: extraImageKeys.map((_, index) =>
        this.dependencies.imageUrlBuilder.buildExtra(meal.id, index),
      ),
      portionItems: ensured.portionItems,
      clientComment: ensured.clientComment,
      assumptions: ensured.assumptions,
      micronutrients: ensured.micronutrients,
      versions: this.publicVersions(ensured.versions),
      activeVersionId: ensured.activeVersionId!,
      source: meal.source,
      createdAt: meal.createdAt.toISOString(),
      shared: meal.sharedAt != null,
      likeCount: extras?.likeCount ?? 0,
      liked: extras?.liked ?? false,
      ...(extras?.authorName ? { authorName: extras.authorName } : {}),
      ...(typeof extras?.unread === 'boolean' ? { unread: extras.unread } : {}),
    }
  }
}
