import { describe, expect, test } from 'bun:test'

import { COMPOSER_APP_WELCOME_TEXT } from './composer-chat'
import { splitComposerChatLead } from './composer-chat-lead'

describe('composer chat lead icons', () => {
  test('strips a leading camera emoji for the in-app bubble', () => {
    expect(splitComposerChatLead('📷 Фото принято. Можно прислать ещё.')).toEqual({
      lead: '📷',
      body: 'Фото принято. Можно прислать ещё.',
    })
  })

  test('maps the other composer prefixes used in the add-meal chat', () => {
    expect(splitComposerChatLead('🎤 Голос к фото принят. Распознаю…').lead).toBe('🎤')
    expect(splitComposerChatLead('📝 Пояснение к фото принято. Считаю КБЖУ…').lead).toBe('📝')
    expect(splitComposerChatLead('⏳ Распознаю еду по фото и считаю КБЖУ…').lead).toBe('⏳')
    expect(splitComposerChatLead('❌ Загрузка приёма отменена.').lead).toBe('❌')
    expect(splitComposerChatLead('✅ Запись в дневник\n«Овсянка»')).toEqual({
      lead: '✅',
      body: 'Запись в дневник\n«Овсянка»',
    })
  })

  test('leaves welcome copy without a lead icon', () => {
    expect(splitComposerChatLead(COMPOSER_APP_WELCOME_TEXT)).toEqual({
      lead: null,
      body: COMPOSER_APP_WELCOME_TEXT,
    })
  })
})
