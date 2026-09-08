import { describe, expect, test } from 'bun:test'

import {
  addPhotoToSession,
  appendNote,
  canCancelSession,
  createEmptySession,
  hasPendingMealContent,
  isCancelText,
  looksLikeTelegramPhone,
  looksLikeTelegramUsername,
  MEAL_MAX_PHOTOS,
  normalizeTelegramPhoneInput,
  normalizeTelegramUsernameInput,
  queueAlbumItem,
  registrationLinkMessage,
  removePhotoFromSession,
  setSessionAudio,
  isOwnTelegramContact,
  provenTelegramIdentity,
  telegramBindHelpMessage,
} from './telegram-meal-session'

describe('telegram meal session helpers', () => {
  test('isCancelText recognizes cancel commands and labels', () => {
    expect(isCancelText('/cancel')).toBe(true)
    expect(isCancelText('Отмена')).toBe(true)
    expect(isCancelText('❌ Отменить загрузку')).toBe(true)
    expect(isCancelText('привет')).toBe(false)
  })

  test('addPhotoToSession keeps at most MAX photos and merges captions into note', () => {
    const session = createEmptySession('user-1')
    for (let index = 0; index < MEAL_MAX_PHOTOS + 2; index += 1) {
      addPhotoToSession(session, { base64: `img-${index}`, mime: 'image/jpeg' })
    }
    expect(session.photos).toHaveLength(MEAL_MAX_PHOTOS)
    expect(session.photos[0]?.base64).toBe('img-2')

    addPhotoToSession(
      session,
      { base64: 'captioned', mime: 'image/jpeg' },
      '  вес 200 г ',
    )
    expect(session.note).toBe('вес 200 г')
    expect(session.photos.at(-1)?.base64).toBe('captioned')
  })

  test('removePhotoFromSession drops the chosen photo and ignores a bad index', () => {
    const session = createEmptySession('user-1')
    addPhotoToSession(session, { base64: 'a', mime: 'image/jpeg' })
    addPhotoToSession(session, { base64: 'b', mime: 'image/jpeg' })
    expect(removePhotoFromSession(session, 0)).toBe(true)
    expect(session.photos.map((photo) => photo.base64)).toEqual(['b'])
    expect(removePhotoFromSession(session, 4)).toBe(false)
    expect(removePhotoFromSession(session, 0)).toBe(true)
    expect(session.photos).toHaveLength(0)
  })

  test('voice/text pending without photos still counts as pending content', () => {
    const session = createEmptySession('user-1')
    expect(hasPendingMealContent(session)).toBe(false)
    appendNote(session, 'курица')
    expect(hasPendingMealContent(session)).toBe(true)
    setSessionAudio(session, 'aaa', 'audio/ogg')
    expect(session.audioMime).toBe('audio/ogg')
  })

  test('busy session cannot be cancelled', () => {
    const session = createEmptySession('user-1')
    expect(canCancelSession(session)).toBe(true)
    session.busy = true
    expect(canCancelSession(session)).toBe(false)
  })

  test('queueAlbumItem groups photos by media_group_id', () => {
    const buffers = new Map()
    queueAlbumItem(buffers, 'g1', 10, 'user-1', 'f1', '')
    queueAlbumItem(buffers, 'g1', 10, 'user-1', 'f2', 'этикетка')
    expect(buffers.get('g1')?.items).toEqual([
      { fileId: 'f1', caption: '' },
      { fileId: 'f2', caption: 'этикетка' },
    ])
  })

  test('normalizes typed telegram usernames and builds registration copy', () => {
    expect(looksLikeTelegramUsername('@dmitry_7r')).toBe(true)
    expect(looksLikeTelegramUsername('hi')).toBe(false)
    expect(normalizeTelegramUsernameInput('@Dmitry_7r')).toBe('dmitry_7r')
    expect(normalizeTelegramUsernameInput('bad')).toBeNull()
    const message = registrationLinkMessage({
      webappOrigin: 'https://25nutrition.site/',
      username: 'dmitry_7r',
    })
    expect(message).toContain('@dmitry_7r')
    expect(message).toContain('https://25nutrition.site/signup')
    expect(message).not.toContain('Пришлите ваш ник')
  })

  test('normalizes telegram phones for linking', () => {
    expect(looksLikeTelegramPhone('+7 (900) 123-45-67')).toBe(true)
    expect(looksLikeTelegramPhone('89001234567')).toBe(true)
    expect(looksLikeTelegramPhone('@food_user')).toBe(false)
    expect(normalizeTelegramPhoneInput('8 (900) 123-45-67')).toBe('79001234567')
    expect(normalizeTelegramPhoneInput('123')).toBeNull()
    const message = registrationLinkMessage({
      webappOrigin: 'https://25nutrition.site/',
      phone: '79001234567',
    })
    expect(message).toContain('+7 (900) 123-45-67')
    expect(message).toContain('ник или телефон')
  })

  test('only the sender’s own Telegram contact counts as phone proof', () => {
    expect(isOwnTelegramContact(42, { user_id: 42 })).toBe(true)
    expect(isOwnTelegramContact(42, { user_id: 99 })).toBe(false)
    expect(isOwnTelegramContact(42, {})).toBe(false)
    expect(isOwnTelegramContact(undefined, { user_id: 42 })).toBe(false)
  })

  test('account lookup accepts only Telegram-attested username or own contact', () => {
    expect(
      provenTelegramIdentity({ profileUsername: '@Dmitry_7r' }),
    ).toEqual({ kind: 'username', username: 'dmitry_7r' })
    expect(
      provenTelegramIdentity({
        fromUserId: 42,
        contact: { phone_number: '+7 900 123-45-67', user_id: 42 },
      }),
    ).toEqual({ kind: 'phone', phone: '79001234567' })
    expect(
      provenTelegramIdentity({
        fromUserId: 42,
        contact: { phone_number: '+7 900 123-45-67', user_id: 99 },
      }),
    ).toBeNull()
    expect(provenTelegramIdentity({ profileUsername: 'victim_user' })).toEqual({
      kind: 'username',
      username: 'victim_user',
    })
    expect(provenTelegramIdentity({})).toBeNull()
    const help = telegramBindHelpMessage({
      webappOrigin: 'https://24nutrition.site/',
      hasMealPayload: true,
    })
    expect(help).toContain('6-значный код')
    expect(help).not.toContain('Пришлите ник')
    expect(help).toContain('Чужой ник или номер')
  })
})
