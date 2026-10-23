import { randomUUID } from 'node:crypto'

import type {
  MealComposerTurnRequest,
  MealComposerTurnResponse,
  MealsGeminiRequest,
  MealsGeminiResponse,
} from '@web-app-demo/contracts'

import { MealsFailure } from '../domain/errors'
import { isHollowMealAnalysis } from '../domain/mapping'
import {
  applyComposerTurn,
  composerAnalyzeErrorMessage,
  composerSavedMessage,
  type ComposerEvent,
  type ComposerMessage,
} from '../domain/meal-composer'
import type { MealChatSession, MealSessionPhoto } from '../domain/telegram-meal-session'
import type { MealsService } from './meals-service'

type ComposerEntry = {
  session: MealChatSession
  messages: ComposerMessage[]
  status: MealComposerTurnResponse['status']
  meal?: MealComposerTurnResponse['meal']
  created?: boolean
}

export class AppMealComposer {
  private readonly entries = new Map<string, ComposerEntry>()
  private readonly tails = new Map<string, Promise<void>>()

  constructor(
    private readonly options: {
      analyze: (input: MealsGeminiRequest) => Promise<MealsGeminiResponse>
      persist: MealsService['createMealFromGeminiCard']
    },
  ) {}

  snapshot(userId: string): MealComposerTurnResponse {
    return this.toResponse(this.entries.get(userId))
  }

  async applyTurn(
    userId: string,
    input: MealComposerTurnRequest,
  ): Promise<MealComposerTurnResponse> {
    const previous = this.tails.get(userId) ?? Promise.resolve()
    const run = previous.catch(() => undefined).then(() => this.applyTurnUnlocked(userId, input))
    this.tails.set(
      userId,
      run.then(
        () => undefined,
        () => undefined,
      ),
    )
    return run
  }

  dispose() {
    this.entries.clear()
    this.tails.clear()
  }

  private async applyTurnUnlocked(
    userId: string,
    input: MealComposerTurnRequest,
  ): Promise<MealComposerTurnResponse> {
    const current = this.entries.get(userId)
    const event = toComposerEvent(input)
    const turn = applyComposerTurn(current?.session, userId, event, 'app', {
      allowTextOnly: false,
    })
    const entry: ComposerEntry = {
      session: turn.session,
      messages:
        turn.clear && event.type === 'open'
          ? turn.messages
          : [...(turn.clear ? [] : current?.messages ?? []), ...turn.messages],
      status: nextStatus(turn, current),
      meal: turn.clear ? undefined : current?.meal,
      created: turn.clear ? undefined : current?.created,
    }
    this.entries.set(userId, entry)

    if (!turn.finalize) {
      return this.toResponse(entry)
    }

    return this.finalize(userId)
  }

  private async finalize(userId: string): Promise<MealComposerTurnResponse> {
    const entry = this.entries.get(userId)
    if (!entry) return this.toResponse(undefined)
    if (entry.session.busy) return this.toResponse(entry)
    const photos = entry.session.photos
    const hasText = Boolean(entry.session.note?.trim() || entry.session.audioBase64)
    if (!photos.length && !hasText) {
      entry.status = 'idle'
      return this.toResponse(entry)
    }

    entry.session.busy = true
    entry.status = 'busy'

    try {
      const primary = photos[0]
      const payload = {
        ...(photos.length
          ? {
              images: photos.map((image) => ({ base64: image.base64, mime: image.mime })),
              imageBase64: primary!.base64,
              imageMime: primary!.mime,
            }
          : {}),
        note: entry.session.note,
        audioBase64: entry.session.audioBase64,
        audioMime: entry.session.audioMime,
      }
      const analyzed = await this.options.analyze(payload)
      if (isHollowMealAnalysis(analyzed.meal)) {
        throw new MealsFailure('upstream', 'empty meal analysis')
      }
      if (!entry.session.clientKey) {
        entry.session.clientKey = `app-${userId}-${randomUUID()}`.slice(0, 64)
      }
      const persisted = await this.options.persist({
        userId,
        clientKey: entry.session.clientKey,
        imageBase64: primary?.base64,
        imageMime: primary?.mime,
        extraImages: photos.slice(1).map((image) => ({
          imageBase64: image.base64,
          imageMime: image.mime,
        })),
        card: analyzed.meal,
        source: 'manual',
        usage: analyzed.usage,
      })
      entry.meal = persisted.meal
      entry.created = persisted.created
      entry.status = 'done'
      entry.messages = [
        ...entry.messages,
        {
          role: 'assistant',
          text: composerSavedMessage({
            created: persisted.created,
            title: persisted.meal.title,
            kcal: persisted.meal.kcal,
            protein: persisted.meal.protein,
            fat: persisted.meal.fat,
            carbs: persisted.meal.carbs,
            photoCount: photos.length,
            mentorNotify: persisted.mentorNotify,
            fallbackFrom: analyzed.fallbackFrom,
          }),
        },
      ]
      entry.session = { userId, photos: [] }
      return this.toResponse(entry)
    } catch (error) {
      entry.session.busy = false
      entry.status = 'collecting'
      entry.messages = [
        ...entry.messages,
        { role: 'assistant', text: composerAnalyzeErrorMessage(error) },
      ]
      return this.toResponse(entry)
    }
  }

  private toResponse(entry: ComposerEntry | undefined): MealComposerTurnResponse {
    if (!entry) {
      return {
        status: 'idle',
        messages: [],
        photoCount: 0,
        flushAfterMs: null,
      }
    }
    return {
      status: entry.status,
      messages: entry.messages,
      photoCount: entry.session.photos.length,
      flushAfterMs: null,
      meal: entry.meal,
      created: entry.created,
    }
  }
}

function nextStatus(
  turn: ReturnType<typeof applyComposerTurn>,
  current: ComposerEntry | undefined,
): ComposerEntry['status'] {
  if (turn.cancelled) return 'cancelled'
  if (turn.finalize) return 'busy'
  if (turn.session.photos.length || turn.session.note || turn.session.audioBase64) {
    return 'collecting'
  }
  if (current?.status === 'done' && !turn.clear) return 'done'
  return 'idle'
}

function toComposerEvent(input: MealComposerTurnRequest): ComposerEvent {
  if (input.action === 'open') return { type: 'open' }
  if (input.action === 'cancel') return { type: 'cancel' }
  if (input.action === 'flush') return { type: 'flush' }
  if (input.action === 'photo') {
    const photo: MealSessionPhoto = {
      base64: input.imageBase64!,
      mime: input.imageMime ?? 'image/jpeg',
    }
    return { type: 'photo', photo, caption: input.note }
  }
  if (input.action === 'remove-photo') {
    return { type: 'remove-photo', index: input.photoIndex! }
  }
  if (input.action === 'voice') {
    return {
      type: 'voice',
      audioBase64: input.audioBase64!,
      audioMime: input.audioMime,
    }
  }
  return { type: 'note', text: input.note ?? '' }
}
