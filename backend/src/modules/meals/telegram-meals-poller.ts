import type { MealsGeminiResponse } from '@web-app-demo/contracts'

import type { MealsService } from './application/meals-service'
import { MealsFailure } from './domain/errors'
import {
  composerAnalyzeErrorMessage,
  composerAnalyzingMessage,
  composerBusyMessage,
  composerCancelledMessage,
  composerNoteAnalyzing,
  composerNoteNeedsPhoto,
  composerPhotoAcceptedWithCaption,
  composerPhotoContinue,
  composerSavedMessage,
  composerVoiceAnalyzing,
  composerVoiceNeedsPhoto,
  composerWelcomeMessage,
  withComposerCancelPrompt,
} from './domain/meal-composer'
import { analyzeMealWithWebhook } from './infrastructure/meal-analyze-webhook'
import { createTelegramPollerLock } from './infrastructure/telegram-poller-lock'
import {
  addPhotoToSession,
  appendNote,
  canCancelSession,
  createEmptySession,
  hasPendingMealContent,
  helpMessage,
  identityRequestKeyboard,
  isCancelText,
  isOwnTelegramContact,
  MEAL_ALBUM_WAIT_MS,
  MEAL_MAX_PHOTOS,
  MEAL_SESSION_MS,
  normalizeTelegramPhoneInput,
  normalizeTelegramUsernameInput,
  provenTelegramIdentity,
  queueAlbumItem,
  registrationLinkMessage,
  setSessionAudio,
  shareTelegramPhonePrompt,
  telegramBindHelpMessage,
  type AlbumBuffer,
  type MealChatSession,
  type MealSessionPhoto,
} from './domain/telegram-meal-session'

type TelegramPollerEnv = {
  TELEGRAM_MEALS_BOT_TOKEN?: string
  N8N_MEAL_WEBHOOK_URL?: string
  WEBAPP_ORIGIN?: string
  DATABASE_URL?: string
}

type LinkedAppUser = {
  id: string
  publicId: number
}

type TelegramLinkComplete = (
  code: string,
  proof: { telegramUsername?: string | null; telegramPhone?: string | null },
  extras?: { telegramChatId?: string },
) => Promise<{ ok: true; userId: string } | { ok: false; reason: 'invalid' | 'mismatch' | 'phone_proof_required' }>

type TelegramUser = {
  id: number
  username?: string
}

type TelegramContact = {
  phone_number: string
  user_id?: number
  first_name?: string
}

type TelegramPhotoSize = {
  file_id: string
  file_size?: number
}

type TelegramVoice = {
  file_id: string
  mime_type?: string
}

type TelegramDocument = {
  file_id: string
  mime_type?: string
  file_name?: string
}

type TelegramMessage = {
  message_id: number
  chat: { id: number }
  from?: TelegramUser
  date: number
  text?: string
  caption?: string
  photo?: TelegramPhotoSize[]
  voice?: TelegramVoice
  audio?: TelegramVoice
  document?: TelegramDocument
  contact?: TelegramContact
  media_group_id?: string
}

type TelegramCallbackQuery = {
  id: string
  data?: string
  message?: { chat?: { id: number } }
  from?: TelegramUser
}

type TelegramUpdate = {
  update_id: number
  message?: TelegramMessage
  callback_query?: TelegramCallbackQuery
}

export type TelegramMealsPoller = {
  stop: () => void
}

const CANCEL_KEYBOARD = {
  inline_keyboard: [[{ text: '❌ Отменить загрузку', callback_data: 'cancel_meal' }]],
}

type PollerContext = {
  env: TelegramPollerEnv
  service: MealsService
  token: string
  report: (error: unknown) => void
  sessions: Map<number, MealChatSession>
  albumBuffers: Map<string, AlbumBuffer>
  sessionTimers: Map<number, ReturnType<typeof setTimeout>>
  albumTimers: Map<string, ReturnType<typeof setTimeout>>
  /** Resolved app users for chats (survives missing Telegram profile username). */
  linkedByChat: Map<number, LinkedAppUser>
  processedUpdateIds: Set<number>
  pendingPhoneCodes: Map<number, string>
  completeTelegramLink?: TelegramLinkComplete
}

export function isRetryableTelegramPollerError(error: unknown) {
  if (error instanceof MealsFailure) {
    return error.kind === 'upstream' || error.kind === 'misconfigured'
  }
  if (!(error instanceof Error)) return false
  return /ECONNRESET|ETIMEDOUT|fetch failed|socket connection was closed/i.test(error.message)
}

export function startTelegramMealsPoller(options: {
  env: TelegramPollerEnv
  service: MealsService
  completeTelegramLink?: TelegramLinkComplete
  onError?: (error: unknown) => void
}): TelegramMealsPoller {
  const token = options.env.TELEGRAM_MEALS_BOT_TOKEN
  if (!token) {
    return { stop() {} }
  }

  const report =
    options.onError ?? ((error: unknown) => console.error('Telegram meals poller', error))
  const context: PollerContext = {
    env: options.env,
    service: options.service,
    token,
    report,
    sessions: new Map(),
    albumBuffers: new Map(),
    sessionTimers: new Map(),
    albumTimers: new Map(),
    linkedByChat: new Map(),
    processedUpdateIds: new Set(),
    pendingPhoneCodes: new Map(),
    completeTelegramLink: options.completeTelegramLink,
  }

  let stopped = false
  let offset = 0
  const cursorId = 'telegram-meals'
  const lock = options.env.DATABASE_URL
    ? createTelegramPollerLock(options.env.DATABASE_URL)
    : null

  void (async () => {
    if (lock) {
      while (!stopped) {
        try {
          if (await lock.tryAcquire()) break
        } catch (error) {
          report(error)
        }
        await sleep(5_000)
      }
      if (stopped) {
        await lock.release().catch(() => undefined)
        return
      }
    }
    try {
      offset = await context.service.getTelegramPollerOffset(cursorId)
    } catch (error) {
      report(error)
    }
    try {
      await tg(token, 'deleteWebhook', { drop_pending_updates: false })
    } catch (error) {
      report(error)
    }

    while (!stopped) {
      try {
        const updates = await getUpdates(token, offset)
        for (const update of updates) {
          try {
            await handleUpdate(update, context)
            offset = update.update_id + 1
            await context.service.advanceTelegramPollerOffset(cursorId, offset)
          } catch (error) {
            report(error)
            if (isRetryableTelegramPollerError(error)) break
            offset = update.update_id + 1
            try {
              await context.service.advanceTelegramPollerOffset(cursorId, offset)
            } catch (advanceError) {
              report(advanceError)
            }
          }
        }
      } catch (error) {
        if (stopped) break
        report(error)
        await sleep(2_000)
      }
    }

    for (const timer of context.sessionTimers.values()) clearTimeout(timer)
    for (const timer of context.albumTimers.values()) clearTimeout(timer)
    context.sessionTimers.clear()
    context.albumTimers.clear()
    context.sessions.clear()
    context.albumBuffers.clear()
    await lock?.release().catch(() => undefined)
  })()

  return {
    stop() {
      stopped = true
    },
  }
}

async function handleUpdate(update: TelegramUpdate, context: PollerContext) {
  const cb = update.callback_query
  if (cb) {
    const chatId = cb.message?.chat?.id
    if (!chatId) return
    if (cb.data === 'cancel_meal') {
      await answerCallback(context.token, cb.id, 'Отменено')
      await cancelMealUpload(chatId, context)
      return
    }
    await answerCallback(context.token, cb.id)
    return
  }

  const msg = update.message
  if (!msg?.from) return
  const chatId = msg.chat.id
  const caption = (msg.caption || '').trim()
  const text = (msg.text || '').trim()
  const photos = Array.isArray(msg.photo) ? msg.photo : null
  const voice = msg.voice || msg.audio || null
  const doc = msg.document
  const isImageDoc =
    Boolean(doc)
    && (/^image\//i.test(doc?.mime_type || '')
      || /\.(jpe?g|png|webp)$/i.test(doc?.file_name || ''))

  if (isCancelText(text)) {
    await cancelMealUpload(chatId, context)
    return
  }

  if (text === '/help' || text === '/start') {
    await send(context.token, chatId, helpMessage())
    return
  }

  const linkCode = telegramLinkCodeFromText(text)
  const ownPhone = isOwnTelegramContact(msg.from?.id, msg.contact)
    ? normalizeTelegramPhoneInput(msg.contact?.phone_number || '')
    : null
  const pendingPhoneCode = context.pendingPhoneCodes.get(chatId)
  const phoneLinkCode = linkCode || (ownPhone ? pendingPhoneCode : undefined)
  if (phoneLinkCode && context.completeTelegramLink && !hasPendingMealContent(context.sessions.get(chatId))) {
    try {
      const result = await context.completeTelegramLink(phoneLinkCode, {
        telegramUsername: msg.from.username
          ? normalizeTelegramUsernameInput(msg.from.username)
          : null,
        telegramPhone: ownPhone,
      })
      if (result.ok) {
        context.pendingPhoneCodes.delete(chatId)
        context.linkedByChat.set(chatId, { id: result.userId, publicId: 0 })
        await send(
          context.token,
          chatId,
          '✅ Telegram привязан к аккаунту. Пришлите фото еды, чтобы записать приём.',
          { reply_markup: { remove_keyboard: true } },
        )
        return
      }
      if (result.reason === 'phone_proof_required') {
        context.pendingPhoneCodes.set(chatId, phoneLinkCode)
        await send(context.token, chatId, shareTelegramPhonePrompt(), {
          reply_markup: identityRequestKeyboard(),
        })
        return
      }
      if (result.reason === 'mismatch') {
        context.pendingPhoneCodes.delete(chatId)
        await send(
          context.token,
          chatId,
          ownPhone
            ? 'Этот номер не совпадает с тем, что указано в приложении. Проверьте телефон в Настройках и отправьте код ещё раз.'
            : 'Ник или телефон Telegram не совпадает с тем, что указано в приложении. Проверьте данные и отправьте код ещё раз.',
        )
        return
      }
    } catch (error) {
      context.report(error)
      await send(
        context.token,
        chatId,
        'Не удалось привязать Telegram. Этот ник или телефон уже занят, либо произошла ошибка. Попробуйте ещё раз.',
      )
      return
    }
  }

  if (msg.contact && !ownPhone) {
    await send(
      context.token,
      chatId,
      'Нужен ваш собственный контакт Telegram, не чужая карточка.',
    )
    return
  }

  const linked = await resolveLinkedUser({
    profileUsername: msg.from.username,
    fromUserId: msg.from.id,
    contact: msg.contact,
    chatId,
    hasMealPayload: Boolean(photos?.length || voice || isImageDoc || msg.contact),
    context,
  })
  if (!linked) return
  if (linked.consumedTextAsNick) {
    await send(
      context.token,
      chatId,
      `✅ Аккаунт найден. Пришлите фото еды (можно альбом), затем голос или текст.`,
      { reply_markup: { remove_keyboard: true } },
    )
    return
  }
  const linkedUser = linked.user

  if (photos?.length) {
    const best = photos[photos.length - 1]!
    if (msg.media_group_id) {
      queueAlbumPhoto(chatId, linkedUser.id, msg.media_group_id, best.file_id, caption, context)
      return
    }
    if (context.processedUpdateIds.has(update.update_id)) {
      if (caption) await finalizeMeal(chatId, context, false)
      return
    }
    const photo = await downloadPhoto(context.token, best.file_id)
    const session = ensureSession(chatId, linkedUser.id, context)
    session.lastUpdateId = update.update_id
    const count = addPhotoToSession(session, photo, caption || undefined)
    markProcessedUpdate(context, update.update_id)
    scheduleFlush(chatId, context)
    if (caption) {
      await send(
        context.token,
        chatId,
        composerPhotoAcceptedWithCaption(count),
      )
      await finalizeMeal(chatId, context, false)
    } else {
      await promptContinueOrCancel(
        context.token,
        chatId,
        composerPhotoContinue(count),
      )
    }
    return
  }

  if (isImageDoc && doc) {
    const photo = await downloadPhoto(context.token, doc.file_id, doc.mime_type)
    const session = ensureSession(chatId, linkedUser.id, context)
    session.lastUpdateId = update.update_id
    const count = addPhotoToSession(session, photo, caption || undefined)
    scheduleFlush(chatId, context)
    await promptContinueOrCancel(
      context.token,
      chatId,
      `📷 Файл-фото ${count}/${MEAL_MAX_PHOTOS}. Можно ещё или голос/текст.`,
    )
    return
  }

  if (voice) {
    const session = ensureSession(chatId, linkedUser.id, context)
    session.lastUpdateId = update.update_id
    const downloaded = await downloadTelegramFile(context.token, voice.file_id)
    setSessionAudio(
      session,
      downloaded.base64,
      voice.mime_type || normalizeAudioMime(downloaded.mime, downloaded.filePath),
    )
    scheduleFlush(chatId, context)
    if (!session.photos.length) {
      await promptContinueOrCancel(
        context.token,
        chatId,
        composerVoiceNeedsPhoto(),
      )
      return
    }
    await send(context.token, chatId, composerVoiceAnalyzing())
    await finalizeMeal(chatId, context, false)
    return
  }

  if (text) {
    const session = ensureSession(chatId, linkedUser.id, context)
    session.lastUpdateId = update.update_id
    appendNote(session, text)
    scheduleFlush(chatId, context)
    if (!session.photos.length) {
      await promptContinueOrCancel(
        context.token,
        chatId,
        composerNoteNeedsPhoto(),
      )
      return
    }
    await send(context.token, chatId, composerNoteAnalyzing())
    await finalizeMeal(chatId, context, false)
    return
  }

  await send(
    context.token,
    chatId,
    composerWelcomeMessage('telegram'),
  )
}

async function resolveLinkedUser(options: {
  profileUsername: string | undefined
  fromUserId: number | undefined
  contact: { phone_number?: string; user_id?: number } | undefined
  chatId: number
  hasMealPayload: boolean
  context: PollerContext
}): Promise<{ user: LinkedAppUser; consumedTextAsNick: boolean } | null> {
  const { profileUsername, fromUserId, contact, chatId, hasMealPayload, context } = options
  const cached = context.linkedByChat.get(chatId)
  if (cached) {
    return { user: cached, consumedTextAsNick: false }
  }

  const proof = provenTelegramIdentity({
    profileUsername,
    fromUserId,
    contact,
  })

  if (proof?.kind === 'username') {
    const lookup = await context.service.lookupTelegramUser(proof.username)
    if (lookup.user) {
      context.linkedByChat.set(chatId, lookup.user)
      return { user: lookup.user, consumedTextAsNick: false }
    }
    await send(
      context.token,
      chatId,
      telegramBindHelpMessage({
        webappOrigin: webappOrigin(context),
        profileUsername: proof.username,
        hasMealPayload,
      }),
      { reply_markup: identityRequestKeyboard() },
    )
    return null
  }

  if (proof?.kind === 'phone') {
    const lookup = await context.service.lookupTelegramPhone(proof.phone)
    if (!lookup.user) {
      await send(
        context.token,
        chatId,
        registrationLinkMessage({
          webappOrigin: webappOrigin(context),
          phone: proof.phone,
        }),
        { reply_markup: { remove_keyboard: true } },
      )
      return null
    }
    context.linkedByChat.set(chatId, lookup.user)
    return { user: lookup.user, consumedTextAsNick: true }
  }

  await send(
    context.token,
    chatId,
    telegramBindHelpMessage({
      webappOrigin: webappOrigin(context),
      hasMealPayload,
    }),
    { reply_markup: identityRequestKeyboard() },
  )
  return null
}

function webappOrigin(context: PollerContext) {
  return context.env.WEBAPP_ORIGIN?.trim() || 'http://localhost:5173'
}

function ensureSession(chatId: number, userId: string, context: PollerContext) {
  let session = context.sessions.get(chatId)
  if (!session || session.userId !== userId) {
    session = createEmptySession(userId)
    context.sessions.set(chatId, session)
  }
  return session
}

function scheduleFlush(chatId: number, context: PollerContext) {
  const existing = context.sessionTimers.get(chatId)
  if (existing) clearTimeout(existing)
  const timer = setTimeout(() => {
    void finalizeMeal(chatId, context, true)
  }, MEAL_SESSION_MS)
  context.sessionTimers.set(chatId, timer)
}

function clearSession(chatId: number, context: PollerContext) {
  const timer = context.sessionTimers.get(chatId)
  if (timer) clearTimeout(timer)
  context.sessionTimers.delete(chatId)
  context.sessions.delete(chatId)
  clearAlbumBuffersForChat(chatId, context)
}

function clearAlbumBuffersForChat(chatId: number, context: PollerContext) {
  for (const [id, buf] of context.albumBuffers.entries()) {
    if (buf.chatId !== chatId) continue
    const timer = context.albumTimers.get(id)
    if (timer) clearTimeout(timer)
    context.albumTimers.delete(id)
    context.albumBuffers.delete(id)
  }
}

async function cancelMealUpload(chatId: number, context: PollerContext) {
  const session = context.sessions.get(chatId)
  const had =
    hasPendingMealContent(session)
    || [...context.albumBuffers.values()].some(
      (buf) => buf.chatId === chatId && buf.items.length > 0,
    )
  if (!canCancelSession(session)) {
    await send(
      context.token,
      chatId,
      composerBusyMessage(),
    )
    return
  }
  clearSession(chatId, context)
  await send(
    context.token,
    chatId,
    composerCancelledMessage(had),
  )
}

async function promptContinueOrCancel(token: string, chatId: number, text: string) {
  await send(token, chatId, withComposerCancelPrompt(text), {
    reply_markup: CANCEL_KEYBOARD,
  })
}

function queueAlbumPhoto(
  chatId: number,
  userId: string,
  mediaGroupId: string,
  fileId: string,
  caption: string,
  context: PollerContext,
) {
  queueAlbumItem(context.albumBuffers, mediaGroupId, chatId, userId, fileId, caption)
  const existing = context.albumTimers.get(mediaGroupId)
  if (existing) clearTimeout(existing)
  const timer = setTimeout(() => {
    void flushAlbum(mediaGroupId, context)
  }, MEAL_ALBUM_WAIT_MS)
  context.albumTimers.set(mediaGroupId, timer)
}

async function flushAlbum(mediaGroupId: string, context: PollerContext) {
  const buf = context.albumBuffers.get(mediaGroupId)
  if (!buf) return
  context.albumBuffers.delete(mediaGroupId)
  const timer = context.albumTimers.get(mediaGroupId)
  if (timer) clearTimeout(timer)
  context.albumTimers.delete(mediaGroupId)

  const chatId = buf.chatId
  const session = ensureSession(chatId, buf.userId, context)
  let added = 0
  let lastCaption = ''
  for (const item of buf.items) {
    const photo = await downloadPhoto(context.token, item.fileId)
    added = addPhotoToSession(session, photo, item.caption || undefined)
    if (item.caption) lastCaption = item.caption
  }
  scheduleFlush(chatId, context)
  if (lastCaption) {
    await send(
      context.token,
      chatId,
      `📷 Альбом (${added} фото) с подписью принят. Считаю КБЖУ…`,
    )
    await finalizeMeal(chatId, context, false)
  } else {
    await promptContinueOrCancel(
      context.token,
      chatId,
      `📷 Альбом: ${added} фото. Можно добавить ещё (до ${MEAL_MAX_PHOTOS}), голос/текст — или подождите, оценю по фото.`,
    )
  }
}

async function finalizeMeal(chatId: number, context: PollerContext, fromTimeout: boolean) {
  const session = context.sessions.get(chatId)
  if (!session || session.busy) return
  if (!session.photos.length) {
    if (fromTimeout) clearSession(chatId, context)
    return
  }

  session.busy = true
  const timer = context.sessionTimers.get(chatId)
  if (timer) clearTimeout(timer)
  context.sessionTimers.delete(chatId)

  const n = session.photos.length
  const telegramUpdateId = `tg-${chatId}-${session.lastUpdateId ?? Date.now()}`
  const alreadyPersisted = await context.service.findTelegramMeal(session.userId, telegramUpdateId)
  if (alreadyPersisted) {
    await send(context.token, chatId, '✅ Эта запись уже была сохранена в дневник.')
    clearSession(chatId, context)
    return
  }
  await send(
    context.token,
    chatId,
    composerAnalyzingMessage({
      photoCount: n,
      fromTimeout,
      hasNote: Boolean(session.note),
      hasAudio: Boolean(session.audioBase64),
    }),
  )

  try {
    const analyzed = await analyzeMealCard({
      env: context.env,
      service: context.service,
      images: session.photos,
      note: session.note,
      audioBase64: session.audioBase64,
      audioMime: session.audioMime,
    })

    const persisted = await context.service.createMealFromGeminiCard({
      userId: session.userId,
      telegramUpdateId,
      recordedAt: new Date(),
      imageBase64: session.photos[0]?.base64,
      imageMime: session.photos[0]?.mime,
      extraImages: session.photos.slice(1).map((image) => ({
        imageBase64: image.base64,
        imageMime: image.mime,
      })),
      card: analyzed.meal,
      usage: analyzed.usage,
    })

    const meal = persisted.meal
    await send(
      context.token,
      chatId,
      composerSavedMessage({
        created: persisted.created,
        title: meal.title,
        kcal: meal.kcal,
        protein: meal.protein,
        fat: meal.fat,
        carbs: meal.carbs,
        photoCount: n,
        mentorNotify: persisted.mentorNotify,
        fallbackFrom: analyzed.fallbackFrom,
      }),
    )
    clearSession(chatId, context)
  } catch (error) {
    context.report(error)
    await send(context.token, chatId, composerAnalyzeErrorMessage(error)).catch(() => undefined)
    session.busy = false
    if (isRetryableTelegramPollerError(error)) {
      if (fromTimeout) scheduleFlush(chatId, context)
      throw error
    }
    clearSession(chatId, context)
  }
}

async function analyzeMealCard(input: {
  env: TelegramPollerEnv
  service: MealsService
  images: MealSessionPhoto[]
  note?: string
  audioBase64?: string
  audioMime?: string
}): Promise<MealsGeminiResponse> {
  const primary = input.images[0]
  if (!primary) {
    throw new MealsFailure('upstream', 'images required')
  }
  return analyzeMealWithWebhook(input.env.N8N_MEAL_WEBHOOK_URL, (payload) => input.service.analyzeMeal(payload), {
    images: input.images.map((image) => ({
      base64: image.base64,
      mime: image.mime,
    })),
    imageBase64: primary.base64,
    imageMime: primary.mime,
    note: input.note,
    audioBase64: input.audioBase64,
    audioMime: input.audioMime,
  })
}

async function downloadPhoto(
  token: string,
  fileId: string,
  mimeHint?: string,
): Promise<MealSessionPhoto> {
  const downloaded = await downloadTelegramFile(token, fileId)
  return {
    base64: downloaded.base64,
    mime: normalizeImageMime(mimeHint || downloaded.mime, downloaded.filePath),
  }
}

async function getUpdates(token: string, offset: number): Promise<TelegramUpdate[]> {
  const payload = await tg(token, 'getUpdates', {
    offset,
    timeout: 25,
    allowed_updates: ['message', 'callback_query'],
  })
  if (!payload.ok) {
    throw new Error(payload.description || 'Telegram getUpdates failed')
  }
  return (payload.result as TelegramUpdate[]) ?? []
}

async function downloadTelegramFile(token: string, fileId: string) {
  const meta = await tg(token, 'getFile', { file_id: fileId })
  if (!meta.ok || !meta.result?.file_path) {
    throw new Error(meta.description || 'Telegram getFile failed')
  }
  const filePath = String(meta.result.file_path)
  const fileResponse = await fetch(
    `https://api.telegram.org/file/bot${token}/${filePath}`,
    { signal: AbortSignal.timeout(60_000) },
  )
  if (!fileResponse.ok) {
    throw new Error(`Telegram file download failed (${fileResponse.status})`)
  }
  const bytes = Buffer.from(await fileResponse.arrayBuffer())
  const mime = fileResponse.headers.get('content-type') || undefined
  return { base64: bytes.toString('base64'), mime, filePath }
}

async function send(
  token: string,
  chatId: number,
  text: string,
  extra: Record<string, unknown> = {},
) {
  const payload = await tg(token, 'sendMessage', {
    chat_id: chatId,
    text,
    disable_web_page_preview: true,
    ...extra,
  })
  if (!payload.ok) {
    throw new Error(payload.description || 'Telegram sendMessage failed')
  }
}

async function answerCallback(token: string, callbackQueryId: string, text?: string) {
  await tg(token, 'answerCallbackQuery', {
    callback_query_id: callbackQueryId,
    text: text || undefined,
  })
}

async function tg(token: string, method: string, body?: Record<string, unknown>) {
  const response = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body ?? {}),
    signal: AbortSignal.timeout(35_000),
  })
  return (await response.json()) as {
    ok?: boolean
    result?: any
    description?: string
  }
}

function telegramLinkCodeFromText(text: string) {
  const start = text.match(/^\/start(?:\s+|_)(\d{6})$/i)
  if (start?.[1]) return start[1]
  if (/^\d{6}$/.test(text)) return text
  return null
}

function markProcessedUpdate(context: PollerContext, updateId: number) {
  context.processedUpdateIds.add(updateId)
  if (context.processedUpdateIds.size <= 10_000) return
  const first = context.processedUpdateIds.values().next().value
  if (typeof first === 'number') context.processedUpdateIds.delete(first)
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function normalizeImageMime(
  mime: string | undefined,
  filePath?: string,
): 'image/jpeg' | 'image/png' | 'image/webp' {
  const normalized = (mime || '').split(';')[0]?.trim().toLowerCase()
  if (
    normalized === 'image/jpeg'
    || normalized === 'image/jpg'
    || normalized === 'image/png'
    || normalized === 'image/webp'
  ) {
    return normalized === 'image/jpg' ? 'image/jpeg' : normalized as 'image/jpeg' | 'image/png' | 'image/webp'
  }
  const lowerPath = (filePath || '').toLowerCase()
  if (lowerPath.endsWith('.png')) return 'image/png'
  if (lowerPath.endsWith('.webp')) return 'image/webp'
  return 'image/jpeg'
}

function normalizeAudioMime(mime: string | undefined, filePath?: string) {
  const normalized = (mime || '').split(';')[0]?.trim().toLowerCase()
  if (normalized.startsWith('audio/')) return normalized
  const lowerPath = (filePath || '').toLowerCase()
  if (lowerPath.endsWith('.mp3')) return 'audio/mpeg'
  if (lowerPath.endsWith('.wav')) return 'audio/wav'
  if (lowerPath.endsWith('.m4a')) return 'audio/mp4'
  return 'audio/ogg'
}
