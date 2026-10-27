import { expect, test } from 'bun:test'

import { followUpPrompts } from './suggestions'
import { suggestionsEnabledFrom } from './suggestions-open'

test('follow-up lines stay short and drop numbering', () => {
  const prompts = followUpPrompts('1. Какая погода будет завтра\n- Прогноз на неделю\nА какая погода в моём городе?\n' + 'слишком длинная строка '.repeat(12))
  expect(prompts).toEqual([
    'Какая погода будет завтра',
    'Прогноз на неделю',
    'А какая погода в моём городе?',
  ])
})

test('follow-ups stay on the subject and drop offers about the app', () => {
  const prompts = followUpPrompts([
    'Попробуем настроить профиль?',
    'Хочешь узнать мои возможности?',
    'Давай сразу перейдём к делу?',
    'Какая погода будет завтра в Новосибирске',
    'Прогноз на неделю',
    'А какая погода в моём городе?',
  ].join('\n'))
  expect(prompts).toEqual([
    'Какая погода будет завтра в Новосибирске',
    'Прогноз на неделю',
    'А какая погода в моём городе?',
  ])
})

test('suggestions stay on until they are switched off', () => {
  expect(suggestionsEnabledFrom(null)).toBe(true)
  expect(suggestionsEnabledFrom('1')).toBe(true)
  expect(suggestionsEnabledFrom('0')).toBe(false)
})
