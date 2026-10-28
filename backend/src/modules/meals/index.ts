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
import { completeDocumentCompare, completeFollowUps, completeNoraChat, streamNoraChat } from './infrastructure/nora-chat-client'
import { extractMealWithNora } from './infrastructure/nora-llm-client'
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
import { MealsFailure } from './domain/errors'
import { createMealsRoutes } from './transport/routes'
import { attachedFileContext, chooseAttachedFile, combineKnowledgeContext } from '../knowledge'

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
  loadKnowledge: (input: {
    userId: string
    baseIds: readonly string[]
    query: string
  }) => Promise<string>
  loadMeetings: (input: {
    userId: string
    meetingIds: readonly string[]
    query: string
  }) => Promise<string>
  readDocument?: (name: string, bytes: Buffer) => Promise<string>
  startPoller?: boolean
}

export function createMealsModule(options: CreateMealsModuleOptions) {
  const uploadDir =
    options.env.MEALS_UPLOAD_DIR
    ?? path.join(process.cwd(), 'uploads', 'meals')
  const repository = createPrismaMealsRepository(options.db)
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
  })

  const composer = new AppMealComposer({
    analyze: (input) =>
      analyzeMealWithWebhook(
        options.env.N8N_APP_MEAL_WEBHOOK_URL ?? options.env.N8N_MEAL_WEBHOOK_URL,
        (payload) => service.analyzeMeal(payload),
        input,
      ),
    persist: (input) => service.createMealFromGeminiCard(input),
  })

  const routes = createMealsRoutes({
    composer,
    analyzeNora: (input) =>
      extractMealWithNora(options.env, input, (audio) => transcribeAudioWithGemini(options.env, audio)),
    chatWithNora: async (userId, input) => {
      if (input.suggestions) return completeFollowUps(options.env, input.messages)
      const prepared = await prepareNoraChat(options, userId, input)
      return completeNoraChat(options.env, prepared.messages, input.search, prepared.knowledge, undefined, input.think)
    },
    compareDocuments: async (
      left: { name: string; bytes: Buffer },
      right: { name: string; bytes: Buffer },
    ) => {
      if (!options.readDocument) throw new MealsFailure('misconfigured', 'Чтение документов не настроено')
      const read = options.readDocument
      async function side(file: { name: string; bytes: Buffer }) {
        if (file.bytes.length === 0) throw new MealsFailure('bad_request', 'Файл пустой')
        if (file.bytes.length > 20 * 1024 * 1024) throw new MealsFailure('bad_request', 'Файл больше 20 МБ')
        let text = ''
        try {
          text = await read(file.name, file.bytes)
        } catch (error) {
          const message = error instanceof Error && error.message.trim() ? error.message : 'Не удалось прочитать файл'
          throw new MealsFailure('bad_request', message)
        }
        const trimmed = text.replace(/\u0000/g, '').replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim().slice(0, 200_000)
        if (!trimmed) throw new MealsFailure('bad_request', `В файле «${file.name}» не нашлось текста`)
        return { name: file.name.slice(0, 180), text: trimmed }
      }
      const [leftSide, rightSide] = await Promise.all([side(left), side(right)])
      const summary = await completeDocumentCompare(options.env, {
        leftName: leftSide.name,
        leftText: leftSide.text,
        rightName: rightSide.name,
        rightText: rightSide.text,
      })
      return {
        leftName: leftSide.name,
        rightName: rightSide.name,
        leftText: leftSide.text,
        rightText: rightSide.text,
        summary,
      }
    },
    streamChatWithNora: async (userId, input, signal) => {
      const prepared = await prepareNoraChat(options, userId, input)
      return streamNoraChat(options.env, prepared.messages, input.search, prepared.knowledge, signal, input.think)
    },
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

const ATTACHED_FILE_BYTES = 20 * 1024 * 1024

type ChatTurn = {
  role: string
  text: string
  images?: ReadonlyArray<{ base64: string; mime?: string }>
  files?: ReadonlyArray<{ name: string; base64: string }>
}

function attachedFiles(messages: readonly ChatTurn[]) {
  return messages.flatMap((message) => message.files ?? []).filter((file) => file.base64.trim())
}

function modelTurnText(message: ChatTurn) {
  const name = message.files?.[0]?.name.trim()
  const text = message.text.trim()
  if (!name) return message.text
  if (!text) return `Что в файле «${name}»?`
  return `${text}\n(файл «${name}»)`
}

async function prepareNoraChat(
  options: CreateMealsModuleOptions,
  userId: string,
  input: {
    messages: readonly ChatTurn[]
    knowledgeBaseIds?: readonly string[]
    meetingIds?: readonly string[]
    search?: boolean
  },
) {
  const question = [...input.messages].reverse().find((message) => message.role === 'user')
  const files = attachedFiles(input.messages)
  const chosen = chooseAttachedFile(question?.text ?? '', files.map((file) => file.name))
  const file = chosen >= 0 ? files[chosen] : null
  let attached = ''
  if (file) {
    if (!options.readDocument) throw new MealsFailure('bad_request', 'Не удалось прочитать файл')
    const bytes = Buffer.from(file.base64, 'base64')
    if (bytes.length === 0 || bytes.length > ATTACHED_FILE_BYTES) {
      throw new MealsFailure('bad_request', 'Файл больше 20 МБ')
    }
    try {
      const text = await options.readDocument(file.name, bytes)
      attached = attachedFileContext(question?.text ?? '', file.name, text, files.map((item) => item.name))
    } catch (error) {
      if (error instanceof MealsFailure) throw error
      const message = error instanceof Error && error.message.trim() ? error.message : 'Не удалось прочитать файл'
      throw new MealsFailure('bad_request', message)
    }
  }
  const selected = await knowledgeForChat(options.loadKnowledge, userId, input)
  const meetings = await meetingsForChat(options.loadMeetings, userId, input)
  const knowledge = [combineKnowledgeContext(attached, selected), meetings].filter((part) => part.trim()).join('\n\n')
  const messages = input.messages.map((message) => ({
    role: message.role === 'assistant' ? 'assistant' as const : 'user' as const,
    text: modelTurnText(message),
    ...(message.images ? { images: [...message.images] } : {}),
  }))
  return { messages, knowledge }
}

async function knowledgeForChat(
  loadKnowledge: CreateMealsModuleOptions['loadKnowledge'],
  userId: string,
  input: { messages: ReadonlyArray<{ role: string; text: string }>; knowledgeBaseIds?: readonly string[] },
) {
  if (!input.knowledgeBaseIds?.length) return ''
  const question = [...input.messages].reverse().find((message) => message.role === 'user')
  return loadKnowledge({
    userId,
    baseIds: input.knowledgeBaseIds,
    query: question?.text ?? '',
  })
}

async function meetingsForChat(
  loadMeetings: CreateMealsModuleOptions['loadMeetings'],
  userId: string,
  input: { messages: ReadonlyArray<{ role: string; text: string }>; meetingIds?: readonly string[] },
) {
  if (!input.meetingIds?.length) return ''
  const question = [...input.messages].reverse().find((message) => message.role === 'user')
  return loadMeetings({
    userId,
    meetingIds: input.meetingIds,
    query: question?.text ?? '',
  })
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
