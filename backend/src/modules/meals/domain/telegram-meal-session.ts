import {
  formatTelegramPhoneDisplay,
  looksLikeTelegramPhone,
  normalizeTelegramPhoneDigits,
  telegramPhoneSchema,
} from '@web-app-demo/contracts'

/** Wait after photo-without-caption before auto-finalize (extra photos / voice / text). */
export const MEAL_SESSION_MS = 20_000
export const MEAL_MAX_PHOTOS = 8
export const MEAL_ALBUM_WAIT_MS = 900

export { looksLikeTelegramPhone, formatTelegramPhoneDisplay }

export type MealSessionPhoto = {
  base64: string
  mime: 'image/jpeg' | 'image/png' | 'image/webp'
}

export type MealChatSession = {
  userId: string
  photos: MealSessionPhoto[]
  note?: string
  audioBase64?: string
  audioMime?: string
  busy?: boolean
  clientKey?: string
  /** Last Telegram update id that contributed to this session. */
  lastUpdateId?: number
}

export type AlbumBufferItem = {
  fileId: string
  caption: string
}

export type AlbumBuffer = {
  chatId: number
  userId: string
  items: AlbumBufferItem[]
}

export function isCancelText(text: string | undefined) {
  const t = String(text || '')
    .trim()
    .toLowerCase()
  return (
    t === '/cancel'
    || t === '/otmena'
    || t === '/отмена'
    || t === 'отмена'
    || t === 'отменить'
    || t === 'cancel'
    || t === '❌ отменить'
    || t === '❌ отменить загрузку'
  )
}

export function hasPendingMealContent(session: MealChatSession | undefined) {
  return Boolean(session && (session.photos.length || session.audioBase64 || session.note))
}

export function createEmptySession(userId: string): MealChatSession {
  return { userId, photos: [] }
}

/** Append photo; drops oldest when over MAX. Returns new count. */
export function addPhotoToSession(
  session: MealChatSession,
  photo: MealSessionPhoto,
  caption?: string,
) {
  if (session.photos.length >= MEAL_MAX_PHOTOS) {
    session.photos.shift()
  }
  session.photos.push(photo)
  if (caption?.trim()) {
    session.note = [session.note, caption.trim()].filter(Boolean).join('\n')
  }
  return session.photos.length
}

export function removePhotoFromSession(session: MealChatSession, index: number) {
  if (!Number.isInteger(index) || index < 0 || index >= session.photos.length) {
    return false
  }
  session.photos.splice(index, 1)
  return true
}

export function appendNote(session: MealChatSession, text: string) {
  const trimmed = text.trim()
  if (!trimmed) return
  session.note = [session.note, trimmed].filter(Boolean).join('\n')
}

export function setSessionAudio(
  session: MealChatSession,
  audioBase64: string,
  audioMime?: string,
) {
  session.audioBase64 = audioBase64
  session.audioMime = audioMime || 'audio/ogg'
}

export function canCancelSession(session: MealChatSession | undefined) {
  if (!session) return true
  return !session.busy
}

export function queueAlbumItem(
  buffers: Map<string, AlbumBuffer>,
  mediaGroupId: string,
  chatId: number,
  userId: string,
  fileId: string,
  caption: string,
) {
  let buf = buffers.get(mediaGroupId)
  if (!buf) {
    buf = { chatId, userId, items: [] }
    buffers.set(mediaGroupId, buf)
  }
  buf.items.push({ fileId, caption })
  return buf
}

export function helpMessage() {
  return [
    'Дневник питания Nutrition Nora',
    '',
    '1) Одно или несколько фото (альбом): блюда приёма и/или этикетка/состав',
    `   (до ${MEAL_MAX_PHOTOS} фото на приём)`,
    '2) Голос или текст: вес, состав (можно подписью к фото)',
    '3) Передумали — /cancel или кнопка «Отменить загрузку»',
    '',
    'В дневнике приложения появится карточка:',
    '• название + краткий состав',
    '• КБЖУ',
    '• Состав порции / комментарий / допущения',
    '',
    'Нужен аккаунт в приложении с тем же ником Telegram в Настройках — либо код привязки, либо свой контакт кнопкой.',
    'Если аккаунта ещё нет — бот пришлёт ссылку на регистрацию.',
  ].join('\n')
}

/** Loose check for a Telegram @username typed in chat. */
export function looksLikeTelegramUsername(raw: string): boolean {
  const value = raw.trim().replace(/^@/, '')
  return /^[A-Za-z][A-Za-z0-9_]{4,31}$/.test(value)
}

export function normalizeTelegramUsernameInput(raw: string): string | null {
  const value = raw.trim().replace(/^@/, '').toLowerCase()
  if (!/^[a-z][a-z0-9_]{4,31}$/.test(value)) return null
  return value
}

export function normalizeTelegramPhoneInput(raw: string): string | null {
  const parsed = telegramPhoneSchema.safeParse(raw)
  return parsed.success ? parsed.data : null
}

export function linkedIdentityLabel(user: {
  telegramUsername?: string | null
  telegramPhone?: string | null
}): string {
  if (user.telegramUsername) return `@${user.telegramUsername}`
  if (user.telegramPhone) return formatTelegramPhoneDisplay(user.telegramPhone)
  return 'аккаунт'
}

export function identityRequestKeyboard() {
  return {
    keyboard: [[{ text: '📱 Отправить номер Telegram', request_contact: true }]],
    resize_keyboard: true,
    one_time_keyboard: true,
  }
}

export function isOwnTelegramContact(
  fromId: number | undefined,
  contact?: { user_id?: number } | null,
) {
  return contact?.user_id != null && fromId != null && contact.user_id === fromId
}

export type ProvenTelegramIdentity =
  | { kind: 'username'; username: string }
  | { kind: 'phone'; phone: string }

/** Telegram-attested identity only: profile username or the sender's own contact card. Typed text is never proof. */
export function provenTelegramIdentity(input: {
  profileUsername?: string | null
  fromUserId?: number
  contact?: { phone_number?: string; user_id?: number } | null
}): ProvenTelegramIdentity | null {
  const username = input.profileUsername
    ? normalizeTelegramUsernameInput(input.profileUsername)
    : null
  if (username) return { kind: 'username', username }

  if (!isOwnTelegramContact(input.fromUserId, input.contact)) return null
  const phone = normalizeTelegramPhoneInput(input.contact?.phone_number || '')
  return phone ? { kind: 'phone', phone } : null
}

export function telegramBindHelpMessage(options: {
  webappOrigin: string
  profileUsername?: string | null
  hasMealPayload?: boolean
}) {
  const origin = options.webappOrigin.replace(/\/$/, '')
  const signupUrl = `${origin}/signup`
  const nick = options.profileUsername
    ? normalizeTelegramUsernameInput(options.profileUsername)
    : null
  return [
    nick
      ? `Ник @${nick} в приложении не найден.`
      : 'Этот Telegram-аккаунт ещё не привязан к приложению.',
    '',
    'Откройте Настройки → Telegram и пришлите сюда 6-значный код или свой контакт кнопкой ниже.',
    'Чужой ник или номер в сообщении аккаунт не привяжет.',
    '',
    options.hasMealPayload
      ? `После привязки отправьте фото еды ещё раз. Если аккаунта нет — ${signupUrl}`
      : `Если аккаунта нет — зарегистрируйтесь:\n${signupUrl}`,
  ].join('\n')
}

export function shareTelegramPhonePrompt() {
  return 'Код принят. Чтобы подтвердить номер, нажмите кнопку и отправьте свой контакт Telegram — в обычном сообщении телефона нет.'
}

export function registrationLinkMessage(options: {
  webappOrigin: string
  username?: string
  phone?: string
}) {
  const origin = options.webappOrigin.replace(/\/$/, '')
  const signupUrl = `${origin}/signup`
  const nick = options.username ? `@${options.username}` : null
  const phone = options.phone
    ? formatTelegramPhoneDisplay(normalizeTelegramPhoneDigits(options.phone))
    : null
  const identity = nick || phone
  return [
    identity
      ? `Аккаунт с контактом ${identity} в приложении не найден.`
      : 'Этот Telegram-аккаунт ещё не привязан к приложению.',
    '',
    'Зарегистрируйтесь (или войдите) и укажите ник или телефон Telegram в Настройках:',
    signupUrl,
    '',
    'После этого снова пришлите фото еды сюда — запись появится в дневнике.',
  ].join('\n')
}
