import path from 'node:path'

import type { MiddlewareHandler } from 'hono'

import { type TaskDeferrer } from '../../background-tasks'
import type { DbClient } from '../../db'
import type { AppEnv } from '../../env'
import { createStorageServiceFromEnv } from '../../storage/service'
import type { AuthHttpEnv } from '../auth'
import { AppMealComposer } from './application/app-meal-composer'
import { MealsService } from './application/meals-service'
import { extractMealWithGemini, refineMealWithGemini, transcribeAudioWithGemini } from './infrastructure/gemini-client'
import { createMealEngineStore } from './infrastructure/meal-engine-store'
import { completeNoraChat } from './infrastructure/nora-chat-client'
import { extractMealWithNora, refineMealWithNora } from './infrastructure/nora-llm-client'
import { analyzeMealWithWebhook } from './infrastructure/meal-analyze-webhook'
import { notifyMentorMealViaWebhook } from './infrastructure/meal-mentor-notify-webhook'
import { createLocalMealImageStore } from './infrastructure/meal-image-store'
import { sharpMealImageProcessor } from './infrastructure/sharp-meal-image'
import {
  createMealImageUrlBuilder,
  verifyMealExtraImageSignature,
  verifyMealImageSignature,
} from './infrastructure/meal-image-urls'
import { createPrismaMealsRepository } from './infrastructure/meals-repository'
import { createSpacesMealImageStore } from './infrastructure/spaces-meal-image-store'
import { transcribeMealVoice } from './infrastructure/voice-transcribe'
import {
  startTelegramMealsPoller,
  type TelegramMealsPoller,
} from './telegram-meals-poller'
import {
  startTelegramNotifyPoller,
  type TelegramNotifyPoller,
} from './telegram-notify-poller'
import { createMealsRoutes } from './transport/routes'

type CreateMealsModuleOptions = {
  backgroundTasks?: TaskDeferrer
  completeTelegramLink?: (
    code: string,
    proof: { telegramUsername?: string | null; telegramPhone?: string | null },
    extras?: { telegramChatId?: string },
  ) => Promise<{ ok: true; userId: string } | { ok: false; reason: 'invalid' | 'mismatch' | 'phone_proof_required' }>
  db: DbClient
  env: AppEnv
  requireAuth: MiddlewareHandler<AuthHttpEnv>
  requireMentor: MiddlewareHandler<AuthHttpEnv>
  startPoller?: boolean
}

export function createMealsModule(options: CreateMealsModuleOptions) {
  const uploadDir =
    options.env.MEALS_UPLOAD_DIR
    ?? path.join(process.cwd(), 'uploads', 'meals')
  const repository = createPrismaMealsRepository(options.db)
  const mealEngine = createMealEngineStore(options.db)
  const storage = createStorageServiceFromEnv(options.env)
  const imageStore = storage
    ? createSpacesMealImageStore(storage, sharpMealImageProcessor)
    : createLocalMealImageStore(uploadDir, sharpMealImageProcessor)
  const imageUrlBuilder = createMealImageUrlBuilder(options.env.JWT_SECRET)
  const service = new MealsService({
    generationModel: options.env.GEMINI_MEAL_MODEL ?? options.env.GEMINI_MODEL,
    analyzer: {
      analyze: (input) => extractMealWithGemini(options.env, input),
      refine: (input) => refineMealWithGemini(options.env, input),
      transcribe: (input) => transcribeAudioWithGemini(options.env, input),
    },
    backgroundTasks: options.backgroundTasks,
    imageStore,
    imageUrlBuilder,
    repository,
    mentorMealNotifier: {
      notify: (payload) =>
        notifyMentorMealViaWebhook(options.env.N8N_MENTOR_NOTIFY_WEBHOOK_URL, payload),
    },
    mealEngine: (userId) => mealEngine.get(userId),
    geminiThinking: (userId) => mealEngine.thinking(userId),
    noraRefine: (input) => refineMealWithNora(options.env, input),
  })

  const composer = new AppMealComposer({
    analyze: (input) =>
      analyzeMealWithWebhook(
        options.env.N8N_APP_MEAL_WEBHOOK_URL ?? options.env.N8N_MEAL_WEBHOOK_URL,
        (payload) => service.analyzeMeal(payload),
        input,
      ),
    analyzeNora: (input) =>
      analyzeMealWithWebhook(
        options.env.N8N_NORA_MEAL_WEBHOOK_URL,
        (payload) =>
          extractMealWithNora(options.env, payload, (audio) =>
            transcribeAudioWithGemini(options.env, audio),
          ),
        input,
      ),
    engineFor: (userId) => mealEngine.get(userId),
    thinkingFor: (userId) => mealEngine.thinking(userId),
    persist: (input) => service.createMealFromGeminiCard(input),
  })

  const routes = createMealsRoutes({
    composer,
    mealEngine,
    analyzeNora: (input) =>
      extractMealWithNora(options.env, input, (audio) => transcribeAudioWithGemini(options.env, audio)),
    chatWithNora: (input) => completeNoraChat(options.env, input.messages),
    internalServiceToken: options.env.INTERNAL_SERVICE_TOKEN,
    requireAuth: options.requireAuth,
    requireMentor: options.requireMentor,
    service,
    transcribeUserVoice: (input) =>
      transcribeMealVoice(options.env, (audio) => transcribeAudioWithGemini(options.env, audio), input),
    verifyImageSignature: (mealId, exp, sig) =>
      verifyMealImageSignature(mealId, exp, sig, options.env.JWT_SECRET),
    verifyExtraImageSignature: (mealId, index, exp, sig) =>
      verifyMealExtraImageSignature(mealId, index, exp, sig, options.env.JWT_SECRET),
  })

  let poller: TelegramMealsPoller = { stop() {} }
  let notifyPoller: TelegramNotifyPoller = { stop() {} }
  if (options.startPoller !== false) {
    poller = startTelegramMealsPoller({
      completeTelegramLink: options.completeTelegramLink,
      env: options.env,
      service,
    })
    notifyPoller = startTelegramNotifyPoller({
      completeTelegramLink: options.completeTelegramLink,
      env: options.env,
      service,
    })
  }

  return {
    ...routes,
    service,
    dispose: async () => {
      composer.dispose()
      poller.stop()
      notifyPoller.stop()
    },
  }
}

export { MealsService }
export {
  backfillMealClientKeys,
  type MealClientKeyBackfillResult,
} from './infrastructure/meal-client-key-backfill'
export {
  backfillMealVersions,
  type MealVersionsBackfillResult,
} from './infrastructure/meal-versions-backfill'
export { mapGeminiCardToMealFields } from './domain/mapping'
export {
  addGenerationUsage,
  cachedUsdRub,
  ensureUsdRub,
  generationSpend,
  generationSpendFromAccount,
  parseGenerationAccount,
  parseGenerationLedger,
  sumSettledGenerationSpend,
} from './domain/generation-spend'
export { settleLegacyGenerationLedgers } from './infrastructure/meals-repository'
