import { MealsFailure } from './errors'
import {
  addPhotoToSession,
  appendNote,
  canCancelSession,
  createEmptySession,
  hasPendingMealContent,
  isCancelText,
  MEAL_MAX_PHOTOS,
  MEAL_SESSION_MS,
  removePhotoFromSession,
  setSessionAudio,
  type MealChatSession,
  type MealSessionPhoto,
} from './telegram-meal-session'

export { MEAL_MAX_PHOTOS, MEAL_SESSION_MS }

export type ComposerChannel = 'app' | 'telegram'

export type ComposerEvent =
  | { type: 'open' }
  | { type: 'photo'; photo: MealSessionPhoto; caption?: string }
  | { type: 'remove-photo'; index: number }
  | { type: 'note'; text: string }
  | { type: 'voice'; audioBase64: string; audioMime?: string }
  | { type: 'flush'; fromTimeout?: boolean }
  | { type: 'cancel' }

export type ComposerMessage = {
  role: 'assistant'
  text: string
}

export type ComposerTurn = {
  session: MealChatSession
  messages: ComposerMessage[]
  finalize: boolean
  fromTimeout: boolean
  scheduleFlush: boolean
  cancelled: boolean
  clear: boolean
}

export function composerWelcomeMessage(channel: ComposerChannel = 'app') {
  if (channel === 'telegram') {
    return [
      'Пришлите фото еды (можно альбом: несколько блюд или продукт + этикетка), затем голос или текст.',
      '/help — подсказка, /cancel — отменить текущую загрузку.',
    ].join('\n')
  }
  return 'Пришлите фото вашего приёма пищи — можно несколько блюд или этикетку продукта. Затем отправьте текст или голосовое сообщение. Если знаете размер или вес порции, укажите их для более точного расчёта.'
}

export function composerPhotoAcceptedWithCaption(count: number) {
  return `📷 Фото ${count}/${MEAL_MAX_PHOTOS} с подписью принято. Считаю КБЖУ…`
}

export function composerPhotoContinue(count: number, channel: ComposerChannel = 'telegram') {
  if (channel === 'app') {
    return count > 1
      ? `📷 Фото ${count}/${MEAL_MAX_PHOTOS}. Можно ещё фото блюд или этикетки, затем голос, текст или отправку.`
      : '📷 Фото принято. Можно прислать ещё блюдо или этикетку, затем голос, текст или нажмите отправку.'
  }
  return count > 1
    ? `📷 Фото ${count}/${MEAL_MAX_PHOTOS}. Можно ещё фото блюд или этикетки, голос/текст — или подождите.`
    : '📷 Фото принято. Можно прислать ещё блюдо или этикетку, голос или текст (до 20 сек).'
}

export function composerPhotoRemoved(count: number) {
  if (count <= 0) {
    return '📷 Фото удалено. Пришлите фото еды, затем голос или текст.'
  }
  return `📷 Фото удалено. Осталось ${count}/${MEAL_MAX_PHOTOS}. Можно добавить ещё или отправить.`
}

export function composerVoiceNeedsPhoto() {
  return '🎤 Голос принял. Теперь пришлите фото еды (можно несколько) — приложу расшифровку.'
}

export function composerVoiceAnalyzing() {
  return '🎤 Голос к фото принят. Распознаю…'
}

export function composerNoteNeedsPhoto() {
  return '📝 Текст принял. Пришлите фото еды (можно несколько) — учту пояснение при КБЖУ.'
}

export function composerNoteAnalyzing() {
  return '📝 Пояснение к фото принято. Считаю КБЖУ…'
}

export function composerTextAnalyzingMessage() {
  return '⏳ Разбираю описание и считаю КБЖУ…'
}

export function composerAnalyzingMessage(input: {
  photoCount: number
  fromTimeout: boolean
  hasNote: boolean
  hasAudio: boolean
}) {
  const n = input.photoCount
  return input.fromTimeout && !input.hasNote && !input.hasAudio
    ? `⏳ Обрабатываю ${n > 1 ? `${n} фото` : 'фото'} (пояснения не дождался)…`
    : `⏳ Распознаю еду по ${n > 1 ? `${n} фото` : 'фото'} и считаю КБЖУ…`
}

export function composerSavedMessage(input: {
  created: boolean
  title: string
  kcal: number
  protein: number
  fat: number
  carbs: number
  photoCount: number
  mentorNotify?: 'skipped' | 'sent' | 'failed'
  fallbackFrom?: 'n8n'
}) {
  return [
    input.created ? '✅ Запись в дневник' : '✅ Уже было сохранено',
    `«${input.title}»`,
    `≈ ${input.kcal} ккал · Б ${input.protein} · Ж ${input.fat} · У ${input.carbs}`,
    input.photoCount > 1 ? `(учтено фото: ${input.photoCount})` : '',
    input.fallbackFrom === 'n8n' ? 'Разбор пошёл напрямую через ИИ.' : '',
    input.mentorNotify === 'failed'
      ? 'Наставник пока не получил уведомление — приём в дневнике есть.'
      : '',
  ]
    .filter(Boolean)
    .join('\n')
}

export function composerBusyMessage() {
  return '⏳ Уже обрабатываю этот приём — отменить нельзя. Дождитесь результата.'
}

export function composerCancelledMessage(hadContent: boolean) {
  return hadContent
    ? '❌ Загрузка приёма отменена. Можете прислать новое фото, когда будете готовы.'
    : 'Нечего отменять — активной загрузки нет. Пришлите фото еды.'
}

export function composerCancelFooter() {
  return 'Чтобы передумать: /cancel или кнопка ниже.'
}

export function withComposerCancelPrompt(text: string) {
  return `${text}\n\n${composerCancelFooter()}`
}

function assistant(text: string): ComposerMessage[] {
  return [{ role: 'assistant', text }]
}

function emptyTurn(session: MealChatSession, extras: Partial<ComposerTurn> = {}): ComposerTurn {
  return {
    session,
    messages: [],
    finalize: false,
    fromTimeout: false,
    scheduleFlush: false,
    cancelled: false,
    clear: false,
    ...extras,
  }
}

export function composerAnalyzeErrorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : String(error)
  if (/location is not supported|FAILED_PRECONDITION/i.test(message)) {
    return 'Сервис распознавания временно недоступен в этом регионе. Уже чиним — попробуйте чуть позже.'
  }
  if (/Unsupported MIME type/i.test(message)) {
    return 'Не удалось прочитать фото. Пришлите снимок ещё раз как обычное изображение.'
  }
  if (error instanceof MealsFailure && /^(Своя модель|Не удалось разобрать (фото|описание))/.test(message)) {
    return message
  }
  if (
    error instanceof MealsFailure && error.kind === 'upstream'
    || /ECONNRESET|socket connection was closed|fetch failed|ETIMEDOUT/i.test(message)
  ) {
    return 'Не удалось разобрать приём. Попробуйте ещё раз через минуту.'
  }
  if (error instanceof MealsFailure) return error.message
  return 'Не удалось разобрать приём. Попробуйте ещё раз.'
}

export function applyComposerTurn(
  current: MealChatSession | undefined,
  userId: string,
  event: ComposerEvent,
  channel: ComposerChannel = 'app',
  options: { allowTextOnly?: boolean } = {},
): ComposerTurn {
  if (event.type === 'open') {
    return emptyTurn(createEmptySession(userId), {
      messages: assistant(composerWelcomeMessage(channel)),
      clear: true,
    })
  }

  if (event.type === 'cancel') {
    const had = hasPendingMealContent(current)
    if (!canCancelSession(current)) {
      return emptyTurn(current ?? createEmptySession(userId), {
        messages: assistant(composerBusyMessage()),
      })
    }
    return emptyTurn(createEmptySession(userId), {
      messages: assistant(composerCancelledMessage(had)),
      cancelled: true,
      clear: true,
    })
  }

  const session = current && current.userId === userId ? current : createEmptySession(userId)

  if (session.busy) {
    return emptyTurn(session, {
      messages: assistant(composerBusyMessage()),
    })
  }

  if (event.type === 'flush') {
    if (channel === 'app' && event.fromTimeout) {
      return emptyTurn(session)
    }
    if (!session.photos.length) {
      if (options.allowTextOnly && (session.note?.trim() || session.audioBase64)) {
        return emptyTurn(session, {
          messages: assistant(composerTextAnalyzingMessage()),
          finalize: true,
        })
      }
      return emptyTurn(session, { clear: Boolean(event.fromTimeout) })
    }
    return emptyTurn(session, {
      messages: assistant(
        composerAnalyzingMessage({
          photoCount: session.photos.length,
          fromTimeout: Boolean(event.fromTimeout),
          hasNote: Boolean(session.note),
          hasAudio: Boolean(session.audioBase64),
        }),
      ),
      finalize: true,
      fromTimeout: Boolean(event.fromTimeout),
    })
  }

  if (event.type === 'photo') {
    const count = addPhotoToSession(session, event.photo, event.caption)
    if (event.caption?.trim() && channel === 'telegram') {
      return emptyTurn(session, {
        messages: assistant(composerPhotoAcceptedWithCaption(count)),
        finalize: true,
        scheduleFlush: true,
      })
    }
    return emptyTurn(session, {
      messages: assistant(composerPhotoContinue(count, channel)),
      scheduleFlush: channel === 'telegram',
    })
  }

  if (event.type === 'remove-photo') {
    const removed = removePhotoFromSession(session, event.index)
    if (!removed) {
      return emptyTurn(session, {
        messages: assistant('Не удалось удалить фото. Попробуйте ещё раз.'),
      })
    }
    return emptyTurn(session, {
      messages: assistant(composerPhotoRemoved(session.photos.length)),
    })
  }

  if (event.type === 'voice') {
    setSessionAudio(session, event.audioBase64, event.audioMime)
    if (!session.photos.length) {
      if (options.allowTextOnly) {
        return emptyTurn(session, {
          messages: assistant(composerTextAnalyzingMessage()),
          finalize: true,
        })
      }
      return emptyTurn(session, {
        messages: assistant(composerVoiceNeedsPhoto()),
        scheduleFlush: channel === 'telegram',
      })
    }
    return emptyTurn(session, {
      messages: assistant(composerVoiceAnalyzing()),
      finalize: true,
      scheduleFlush: channel === 'telegram',
    })
  }

  const text = event.text.trim()
  if (!text) {
    if (session.photos.length) {
      return applyComposerTurn(session, userId, { type: 'flush' }, channel, options)
    }
    return emptyTurn(session, {
      messages: assistant(composerWelcomeMessage(channel)),
    })
  }
  if (isCancelText(text)) {
    return applyComposerTurn(session, userId, { type: 'cancel' }, channel, options)
  }
  appendNote(session, text)
  if (!session.photos.length) {
    if (options.allowTextOnly) {
      return emptyTurn(session, {
        messages: assistant(composerTextAnalyzingMessage()),
        finalize: true,
      })
    }
    return emptyTurn(session, {
      messages: assistant(composerNoteNeedsPhoto()),
      scheduleFlush: channel === 'telegram',
    })
  }
  return emptyTurn(session, {
    messages: assistant(composerNoteAnalyzing()),
    finalize: true,
    scheduleFlush: channel === 'telegram',
  })
}
