import type { MealsService } from './application/meals-service'
import { notifyBotHelpMessage, notifyBotLinkedMessage } from './domain/mentor-meal-notify'
import {
  identityRequestKeyboard,
  isOwnTelegramContact,
  normalizeTelegramPhoneInput,
  normalizeTelegramUsernameInput,
  provenTelegramIdentity,
  shareTelegramPhonePrompt,
} from './domain/telegram-meal-session'
import { createTelegramPollerLock } from './infrastructure/telegram-poller-lock'

type TelegramNotifyPollerEnv = {
  TELEGRAM_NOTIFY_BOT_TOKEN?: string
  DATABASE_URL?: string
}

type TelegramLinkComplete = (
  code: string,
  proof: { telegramUsername?: string | null; telegramPhone?: string | null },
  extras?: { telegramChatId?: string },
) => Promise<{ ok: true; userId: string } | { ok: false; reason: 'invalid' | 'mismatch' | 'phone_proof_required' }>

type TelegramUpdate = {
  update_id: number
  message?: {
    chat: { id: number }
    from?: { id: number; username?: string }
    text?: string
    contact?: { phone_number: string; user_id?: number }
  }
}

type NotifyPollerContext = {
  token: string
  service: MealsService
  completeTelegramLink?: TelegramLinkComplete
  report: (error: unknown) => void
  pendingPhoneCodes: Map<number, string>
}

export type TelegramNotifyPoller = {
  stop(): void
}

export function startTelegramNotifyPoller(options: {
  env: TelegramNotifyPollerEnv
  service: MealsService
  completeTelegramLink?: TelegramLinkComplete
  onError?: (error: unknown) => void
}): TelegramNotifyPoller {
  const token = options.env.TELEGRAM_NOTIFY_BOT_TOKEN
  if (!token) {
    return { stop() {} }
  }

  const pendingPhoneCodes = new Map<number, string>()
  const report =
    options.onError ?? ((error: unknown) => console.error('Telegram notify poller', error))
  let stopped = false
  let offset = 0
  const cursorId = 'telegram-notify'
  const lock = options.env.DATABASE_URL
    ? createTelegramPollerLock(options.env.DATABASE_URL, 'telegram-notify-poller')
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
      offset = await options.service.getTelegramPollerOffset(cursorId)
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
            await handleUpdate(update, {
              token,
              service: options.service,
              completeTelegramLink: options.completeTelegramLink,
              report,
              pendingPhoneCodes,
            })
            offset = update.update_id + 1
            await options.service.advanceTelegramPollerOffset(cursorId, offset)
          } catch (error) {
            report(error)
            offset = update.update_id + 1
            try {
              await options.service.advanceTelegramPollerOffset(cursorId, offset)
            } catch (cursorError) {
              report(cursorError)
            }
          }
        }
      } catch (error) {
        report(error)
        await sleep(3_000)
      }
    }
  })()

  return {
    stop() {
      stopped = true
      void lock?.release().catch(() => undefined)
    },
  }
}

async function handleUpdate(
  update: TelegramUpdate,
  context: NotifyPollerContext,
) {
  const msg = update.message
  if (!msg) return
  const chatId = msg.chat.id
  const text = (msg.text || '').trim()
  const chatIdValue = String(chatId)
  const username = msg.from?.username
    ? normalizeTelegramUsernameInput(msg.from.username)
    : null
  const ownPhone = isOwnTelegramContact(msg.from?.id, msg.contact)
    ? normalizeTelegramPhoneInput(msg.contact?.phone_number || '')
    : null

  if (!text && !ownPhone && !msg.contact) {
    await send(context.token, chatId, notifyBotHelpMessage())
    return
  }

  if (text === '/help' || text === '/start') {
    await send(context.token, chatId, notifyBotHelpMessage())
    return
  }

  const pendingCode = context.pendingPhoneCodes.get(chatId)
  const linkCode = telegramLinkCodeFromText(text) || (ownPhone ? pendingCode : undefined)

  if (linkCode && context.completeTelegramLink) {
    try {
      const result = await context.completeTelegramLink(
        linkCode,
        { telegramUsername: username, telegramPhone: ownPhone },
        { telegramChatId: chatIdValue },
      )
      if (result.ok) {
        context.pendingPhoneCodes.delete(chatId)
        await context.service.setTelegramChatId(result.userId, chatIdValue)
        await send(context.token, chatId, notifyBotLinkedMessage(), {
          reply_markup: { remove_keyboard: true },
        })
        return
      }
      if (result.reason === 'phone_proof_required') {
        context.pendingPhoneCodes.set(chatId, linkCode)
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
            : 'Ник Telegram не совпадает с тем, что указано в приложении. Проверьте данные и отправьте код ещё раз.',
        )
        return
      }
    } catch (error) {
      context.report(error)
      await send(
        context.token,
        chatId,
        'Не удалось привязать Telegram. Этот ник или телефон уже занят, либо произошла ошибка.',
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

  const proof = provenTelegramIdentity({
    profileUsername: msg.from?.username,
    fromUserId: msg.from?.id,
    contact: msg.contact,
  })

  if (proof?.kind === 'username') {
    const lookup = await context.service.lookupTelegramUser(proof.username)
    if (lookup.user) {
      await context.service.setTelegramChatId(lookup.user.id, chatIdValue)
      await send(context.token, chatId, notifyBotLinkedMessage(), {
        reply_markup: { remove_keyboard: true },
      })
      return
    }
  }

  if (proof?.kind === 'phone') {
    const lookup = await context.service.lookupTelegramPhone(proof.phone)
    if (lookup.user) {
      await context.service.setTelegramChatId(lookup.user.id, chatIdValue)
      await send(context.token, chatId, notifyBotLinkedMessage(), {
        reply_markup: { remove_keyboard: true },
      })
      return
    }
  }

  await send(context.token, chatId, notifyBotHelpMessage())
}

async function getUpdates(token: string, offset: number): Promise<TelegramUpdate[]> {
  const payload = await tg(token, 'getUpdates', {
    offset,
    timeout: 25,
    allowed_updates: ['message'],
  })
  if (!payload.ok) {
    throw new Error(payload.description || 'Telegram getUpdates failed')
  }
  return (payload.result as TelegramUpdate[]) ?? []
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

async function tg(token: string, method: string, body?: Record<string, unknown>) {
  const response = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body ?? {}),
    signal: AbortSignal.timeout(35_000),
  })
  return (await response.json()) as {
    ok?: boolean
    result?: unknown
    description?: string
  }
}

function telegramLinkCodeFromText(text: string) {
  const start = text.match(/^\/start(?:\s+|_)(\d{6})$/i)
  if (start?.[1]) return start[1]
  if (/^\d{6}$/.test(text)) return text
  return null
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
