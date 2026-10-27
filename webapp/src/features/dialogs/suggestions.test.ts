import { expect, test } from 'bun:test'

import { followUpPrompts, lastExchange } from './suggestions'
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

test('a food answer does not keep weather prompts from an earlier turn', () => {
  const thread = [
    { role: 'user' as const, text: 'Какая погода завтра в Новосибирске?' },
    { role: 'assistant' as const, text: 'Завтра пасмурно, около +4.' },
    { role: 'user' as const, text: 'Что за блюдо на фото? Дай состав и ссылку.' },
    { role: 'assistant' as const, text: 'На фото блинчики с бананом и вареньем.' },
  ]
  expect(lastExchange(thread).map((turn) => turn.text)).toEqual([
    'Что за блюдо на фото? Дай состав и ссылку.',
    'На фото блинчики с бананом и вареньем.',
  ])
  expect(followUpPrompts([
    'Какая температура сейчас в Новосибирске?',
    'Какой состав у этих блинчиков?',
    'Найди ещё один рецепт',
  ].join('\n'), thread[3]?.text)).toEqual([
    'Какой состав у этих блинчиков?',
    'Найди ещё один рецепт',
  ])
})

test('interview questions become the next thing to ask Nora', () => {
  expect(followUpPrompts([
    'Как тебя зовут?',
    'Что ты хочешь обсудить сегодня?',
    'Можно ли мне рассказать о себе подробнее?',
  ].join('\n'), 'Привет! Я Нора. Чем могу помочь?')).toEqual([
    'Что ты умеешь?',
    'Расскажи о себе',
    'С чего нам начать?',
  ])
  expect(followUpPrompts('Как тебя зовут?\nКакой состав у этих блинчиков?', 'На фото блинчики.')).toEqual([
    'Какой состав у этих блинчиков?',
  ])
})

test('suggestions stay on until they are switched off', () => {
  expect(suggestionsEnabledFrom(null)).toBe(true)
  expect(suggestionsEnabledFrom('1')).toBe(true)
  expect(suggestionsEnabledFrom('0')).toBe(false)
})
