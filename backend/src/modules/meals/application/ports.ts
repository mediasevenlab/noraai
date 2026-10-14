import type { TaskDeferrer } from '../../../background-tasks'
import type {
  CreateMealFromBotRequest,
  MealCategory,
  MealDto,
  MealMicronutrient,
  MealPortionItem,
  MealSlot,
  MealsGeminiRequest,
  MealsGeminiResponse,
  MealsTranscribeRequest,
  MealsTranscribeResponse,
  MealSource,
  GenerationUsageLedger,
} from '@web-app-demo/contracts'

import type { GenerationAccount, SettledMoney } from '../domain/generation-spend'
import type { MealImageSize } from '../domain/meal-image-variants'
import type { MentorMealNotifyPayload } from '../domain/mentor-meal-notify'
import type { MealVersionRecord } from '../domain/meal-versions'

export type MealRecord = {
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
  portionItems: MealPortionItem[]
  clientComment: string
  assumptions: string[]
  micronutrients: MealMicronutrient[]
  versions: MealVersionRecord[]
  activeVersionId: string | null
  source: MealSource
  telegramUpdateId: string | null
  clientKey: string | null
  imageKey: string | null
  imageMime: string | null
  sharedAt: Date | null
  createdAt: Date
  generationUsage?: GenerationUsageLedger
  /** Money already billed for this meal. Later price or rate changes do not rewrite it. */
  generationSettled?: SettledMoney | null
}

export type MealContentUpdate = {
  title: string
  ingredients: string
  category: MealCategory
  mealSlot: MealSlot
  kcal: number
  protein: number
  fat: number
  carbs: number
  portionItems: MealPortionItem[]
  clientComment: string
  assumptions: string[]
  micronutrients: MealMicronutrient[]
  versions: MealVersionRecord[]
  activeVersionId: string
  recordedAt?: Date
  /** Reject the write when a newer version became active while this request ran. */
  expectedActiveVersionId?: string | null
  imageKey?: string | null
  imageMime?: string | null
}

export type MealsRepository = {
  getTelegramPollerOffset(cursorId: string): Promise<number>
  advanceTelegramPollerOffset(cursorId: string, offset: number): Promise<void>
  findUserByTelegramUsername(username: string): Promise<{
    id: string
    publicId: number
    displayName: string | null
    telegramUsername: string | null
    telegramPhone: string | null
  } | null>
  findUserByTelegramPhone(phone: string): Promise<{
    id: string
    publicId: number
    displayName: string | null
    telegramUsername: string | null
    telegramPhone: string | null
  } | null>
  findMealByTelegramUpdateId(telegramUpdateId: string): Promise<MealRecord | null>
  findMealByClientKey(userId: string, clientKey: string): Promise<MealRecord | null>
  findMealById(mealId: string): Promise<MealRecord | null>
  listMealsForUser(userId: string): Promise<MealRecord[]>
  listSharedMeals(
    limit: number,
    viewerUserId: string,
  ): Promise<Array<MealRecord & {
    authorName: string
    likeCount: number
    liked: boolean
    likedAt: Date | null
  }>>
  isMentorOf(mentorUserId: string, menteeUserId: string): Promise<boolean>
  listMenteeIdsForMentor(mentorUserId: string): Promise<string[]>
  findMentorMealNotifyTarget(menteeUserId: string): Promise<{
    mentorId: string
    telegramChatId: string
    mentee: {
      publicId: number
      nickname: string | null
      displayName: string | null
    }
  } | null>
  setTelegramChatId(userId: string, chatId: string): Promise<void>
  listMentorMealCursors(
    mentorUserId: string,
    menteeIds: string[],
  ): Promise<Array<{ menteeId: string; viewedAt: Date }>>
  upsertMentorMealCursor(
    mentorUserId: string,
    menteeUserId: string,
    viewedAt: Date,
  ): Promise<Date>
  listMentorViewedMealIds(mentorUserId: string): Promise<string[]>
  insertMentorMealViews(
    mentorUserId: string,
    menteeUserId: string,
    mealIds: string[],
  ): Promise<void>
  findMealsByIds(ids: string[]): Promise<
    Array<{
      id: string
      userId: string
      assumptions: string[]
      createdAt: Date
      updatedAt: Date
    }>
  >
  listMealUnreadScan(userIds: string[]): Promise<
    Array<{
      id: string
      userId: string
      assumptions: string[]
      createdAt: Date
      updatedAt: Date
    }>
  >
  createMeal(input: {
    id?: string
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
    portionItems: MealPortionItem[]
    clientComment: string
    assumptions: string[]
    micronutrients: MealMicronutrient[]
    versions?: MealVersionRecord[]
    activeVersionId?: string | null
    source: MealSource
    telegramUpdateId?: string | null
    clientKey?: string | null
    imageKey?: string | null
    imageMime?: string | null
  }): Promise<MealRecord>
  updateMealContent(mealId: string, content: MealContentUpdate): Promise<MealRecord>
  setMealShared(mealId: string, sharedAt: Date | null): Promise<MealRecord>
  setMealLike(
    mealId: string,
    userId: string,
    liked: boolean,
  ): Promise<{ likeCount: number; liked: boolean }>
  deleteMeal(mealId: string): Promise<void>
  readGenerationLedger?(userId: string): Promise<GenerationAccount>
  /** Clears the user ledger and every meal total. Used by the settings test reset. */
  resetGenerationSpend?(userId: string): Promise<void>
  addGenerationUsage?(input: {
    userId: string
    mealId?: string
    mealUsage: GenerationUsageLedger
    ledgerUsage: GenerationUsageLedger
    /** When set, this money is added instead of pricing `mealUsage` again. */
    mealSettled?: SettledMoney | null
    /** When set, this money is added instead of pricing `ledgerUsage` again. */
    ledgerSettled?: SettledMoney | null
  }): Promise<void>
}

export type MealImageStore = {
  saveImage(input: {
    userId: string
    mealId: string
    imageBase64: string
    imageMime?: string
    variant?: 'cover' | 'extra'
  }): Promise<{ imageKey: string; imageMime: string }>
  readImage(imageKey: string, size?: MealImageSize): Promise<Buffer | null>
  deleteImage?(imageKey: string): Promise<void>
}

export type MealAnalyzer = {
  analyze(input: MealsGeminiRequest): Promise<MealsGeminiResponse>
  refine(input: {
    card: Record<string, unknown>
    message: string
    coverBase64?: string
    coverMime?: string
    attachBase64?: string
    attachMime?: string
    attachImages?: Array<{ base64: string; mime?: string }>
    photoMode?: 'replace' | 'augment'
    thinking?: boolean
  }): Promise<MealsGeminiResponse>
  transcribe?(input: MealsTranscribeRequest): Promise<MealsTranscribeResponse>
}

export type MealImageUrlBuilder = {
  build(mealId: string): string
  buildExtra(mealId: string, index: number): string
}

export type MentorMealNotifier = {
  notify(payload: MentorMealNotifyPayload): Promise<void>
}

export type MentorNotifyTaskDeferrer = TaskDeferrer

export type CreateMealInput = CreateMealFromBotRequest
export type MealDtoMapper = (meal: MealRecord) => MealDto
