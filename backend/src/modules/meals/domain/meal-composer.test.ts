import { describe, expect, test } from 'bun:test'

import {
  applyComposerTurn,
  composerAnalyzingMessage,
  composerAnalyzeErrorMessage,
  composerPhotoContinue,
  composerPhotoRemoved,
  composerSavedMessage,
  composerWelcomeMessage,
  MEAL_MAX_PHOTOS,
} from './meal-composer'
import { MealsFailure } from './errors'
import { createEmptySession } from './telegram-meal-session'

const photo = { base64: 'img', mime: 'image/jpeg' as const }

describe('in-app meal composer turns', () => {
  test('nora accepts a description without a photo and gemini still asks for one', () => {
    const gemini = applyComposerTurn(undefined, 'user-1', { type: 'note', text: 'овсянка с ягодами' })
    expect(gemini.finalize).toBe(false)
    expect(gemini.messages[0]?.text).toContain('Пришлите фото')

    const nora = applyComposerTurn(
      undefined,
      'user-1',
      { type: 'note', text: 'овсянка с ягодами' },
      'app',
      { allowTextOnly: true },
    )
    expect(nora.finalize).toBe(true)
    expect(nora.session.photos).toHaveLength(0)
    expect(nora.session.note).toContain('овсянка')
  })

  test('open starts a chat with the same photo prompt as Telegram, without bot commands', () => {
    const turn = applyComposerTurn(undefined, 'user-1', { type: 'open' })
    expect(turn.messages[0]?.text).toBe(composerWelcomeMessage('app'))
    expect(turn.messages[0]?.text).not.toContain('/cancel')
    expect(turn.finalize).toBe(false)
  })

  test('photo without caption waits for more input instead of analyzing immediately', () => {
    const turn = applyComposerTurn(undefined, 'user-1', { type: 'photo', photo })
    expect(turn.session.photos).toHaveLength(1)
    expect(turn.messages[0]?.text).toBe(composerPhotoContinue(1, 'app'))
    expect(turn.messages[0]?.text).not.toContain('20 сек')
    expect(turn.scheduleFlush).toBe(false)
    expect(turn.finalize).toBe(false)
  })

  test('remove-photo drops a draft image without analyzing', () => {
    const first = applyComposerTurn(undefined, 'user-1', { type: 'photo', photo })
    const second = applyComposerTurn(first.session, 'user-1', {
      type: 'photo',
      photo: { base64: 'img-2', mime: 'image/jpeg' },
    })
    expect(second.session.photos).toHaveLength(2)

    const removed = applyComposerTurn(second.session, 'user-1', {
      type: 'remove-photo',
      index: 0,
    })
    expect(removed.finalize).toBe(false)
    expect(removed.session.photos).toHaveLength(1)
    expect(removed.session.photos[0]?.base64).toBe('img-2')
    expect(removed.messages[0]?.text).toBe(composerPhotoRemoved(1))

    const empty = applyComposerTurn(removed.session, 'user-1', {
      type: 'remove-photo',
      index: 0,
    })
    expect(empty.session.photos).toHaveLength(0)
    expect(empty.messages[0]?.text).toBe(composerPhotoRemoved(0))
    expect(empty.finalize).toBe(false)
  })

  test('app photo with caption waits for send; telegram still analyzes immediately', () => {
    const appTurn = applyComposerTurn(undefined, 'user-1', {
      type: 'photo',
      photo,
      caption: '200 г курицы',
    })
    expect(appTurn.session.note).toBe('200 г курицы')
    expect(appTurn.finalize).toBe(false)
    expect(appTurn.messages[0]?.text).toBe(composerPhotoContinue(1, 'app'))

    const telegramTurn = applyComposerTurn(
      undefined,
      'user-1',
      {
        type: 'photo',
        photo,
        caption: '200 г курицы',
      },
      'telegram',
    )
    expect(telegramTurn.session.note).toBe('200 г курицы')
    expect(telegramTurn.messages[0]?.text).toContain('с подписью принято')
    expect(telegramTurn.finalize).toBe(true)
  })

  test('text after photos analyzes; text first asks for a photo', () => {
    const waiting = applyComposerTurn(undefined, 'user-1', { type: 'note', text: 'овсянка' })
    expect(waiting.finalize).toBe(false)
    expect(waiting.messages[0]?.text).toContain('Пришлите фото')

    const withPhoto = applyComposerTurn(waiting.session, 'user-1', { type: 'photo', photo })
    const analyze = applyComposerTurn(withPhoto.session, 'user-1', { type: 'note', text: 'без сахара' })
    expect(analyze.finalize).toBe(true)
    expect(analyze.messages[0]?.text).toContain('Пояснение к фото принято')
  })

  test('voice after photos analyzes; voice first asks for a photo', () => {
    const waiting = applyComposerTurn(undefined, 'user-1', {
      type: 'voice',
      audioBase64: 'aaa',
      audioMime: 'audio/webm',
    })
    expect(waiting.finalize).toBe(false)
    expect(waiting.session.audioBase64).toBe('aaa')

    const withPhoto = applyComposerTurn(waiting.session, 'user-1', { type: 'photo', photo })
    const analyze = applyComposerTurn(withPhoto.session, 'user-1', {
      type: 'voice',
      audioBase64: 'bbb',
    })
    expect(analyze.finalize).toBe(true)
    expect(analyze.messages[0]?.text).toContain('Голос к фото принят')
  })

  test('app ignores the Telegram wait timer; empty send with photos still analyzes', () => {
    const collecting = applyComposerTurn(undefined, 'user-1', { type: 'photo', photo })
    const timeout = applyComposerTurn(collecting.session, 'user-1', {
      type: 'flush',
      fromTimeout: true,
    })
    expect(timeout.finalize).toBe(false)
    expect(timeout.messages).toEqual([])

    const sendNow = applyComposerTurn(collecting.session, 'user-1', { type: 'note', text: '  ' })
    expect(sendNow.finalize).toBe(true)
    expect(sendNow.fromTimeout).toBe(false)
  })

  test('telegram timeout flush still analyzes without a note', () => {
    const collecting = applyComposerTurn(undefined, 'user-1', { type: 'photo', photo }, 'telegram')
    expect(collecting.scheduleFlush).toBe(true)
    const timeout = applyComposerTurn(
      collecting.session,
      'user-1',
      { type: 'flush', fromTimeout: true },
      'telegram',
    )
    expect(timeout.finalize).toBe(true)
    expect(timeout.messages[0]?.text).toBe(
      composerAnalyzingMessage({
        photoCount: 1,
        fromTimeout: true,
        hasNote: false,
        hasAudio: false,
      }),
    )
  })

  test('cancel clears a draft and keeps a busy session', () => {
    const collecting = applyComposerTurn(undefined, 'user-1', { type: 'photo', photo })
    const cancelled = applyComposerTurn(collecting.session, 'user-1', { type: 'cancel' })
    expect(cancelled.clear).toBe(true)
    expect(cancelled.cancelled).toBe(true)
    expect(cancelled.session.photos).toHaveLength(0)

    const busy = createEmptySession('user-1')
    busy.busy = true
    const blocked = applyComposerTurn(busy, 'user-1', { type: 'cancel' })
    expect(blocked.clear).toBe(false)
    expect(blocked.messages[0]?.text).toContain('отменить нельзя')
  })

  test('saved copy matches the Telegram diary confirmation', () => {
    expect(
      composerSavedMessage({
        created: true,
        title: 'Овсянка',
        kcal: 420,
        protein: 28,
        fat: 10,
        carbs: 55,
        photoCount: 2,
      }),
    ).toBe(
      [
        '✅ Запись в дневник',
        '«Овсянка»',
        '≈ 420 ккал · Б 28 · Ж 10 · У 55',
        '(учтено фото: 2)',
      ].join('\n'),
    )
    expect(
      composerSavedMessage({
        created: true,
        title: 'Овсянка',
        kcal: 420,
        protein: 28,
        fat: 10,
        carbs: 55,
        photoCount: 2,
        mentorNotify: 'failed',
        fallbackFrom: 'n8n',
      }),
    ).toBe(
      [
        '✅ Запись в дневник',
        '«Овсянка»',
        '≈ 420 ккал · Б 28 · Ж 10 · У 55',
        '(учтено фото: 2)',
        'Разбор пошёл напрямую через ИИ.',
        'Наставник пока не получил уведомление — приём в дневнике есть.',
      ].join('\n'),
    )
    expect(MEAL_MAX_PHOTOS).toBe(8)
  })
})

describe('composer analyze errors', () => {
  test('asks the user to retry shortly when the recognizer drops the connection', () => {
    expect(
      composerAnalyzeErrorMessage(new Error('The socket connection was closed unexpectedly.')),
    ).toBe('Не удалось разобрать приём. Попробуйте ещё раз через минуту.')
  })

  test('shows a photo-read failure instead of hiding it as a short outage', () => {
    expect(
      composerAnalyzeErrorMessage(
        new MealsFailure('upstream', 'Не удалось разобрать фото. Опишите приём текстом или попробуйте ещё снимок.'),
      ),
    ).toBe('Не удалось разобрать фото. Опишите приём текстом или попробуйте ещё снимок.')
  })
})
