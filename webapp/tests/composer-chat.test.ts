import { expect, test } from 'bun:test'

import { appendAssistantMessage, mergeComposerChat } from '../src/features/diary/composer-chat'

test('open snapshot fills an empty local transcript with the assistant welcome', () => {
  expect(
    mergeComposerChat([], [{ text: 'Пришлите фото еды.' }]),
  ).toEqual([{ role: 'assistant', text: 'Пришлите фото еды.' }])
})

test('keeps user photo turns in place when the server returns assistant lines', () => {
  expect(
    mergeComposerChat(
      [
        { role: 'assistant', text: 'Пришлите фото еды.' },
        { role: 'user', text: 'Добавил фото', imageUrl: 'blob:photo' },
        { role: 'assistant', text: '📷 Фото принято.' },
      ],
      [{ text: 'Пришлите фото еды.' }, { text: '📷 Фото принято.' }],
    ),
  ).toEqual([
    { role: 'assistant', text: 'Пришлите фото еды.' },
    { role: 'user', text: 'Добавил фото', imageUrl: 'blob:photo' },
    { role: 'assistant', text: '📷 Фото принято.' },
  ])
})

test('keeps a local assistant photo reply until the server catches up', () => {
  expect(
    mergeComposerChat(
      [
        { role: 'assistant', text: 'Пришлите фото еды.' },
        { role: 'user', text: 'Добавил фото' },
        { role: 'assistant', text: '📷 Фото принято.' },
      ],
      [{ text: 'Пришлите фото еды.' }],
    ),
  ).toEqual([
    { role: 'assistant', text: 'Пришлите фото еды.' },
    { role: 'user', text: 'Добавил фото' },
    { role: 'assistant', text: '📷 Фото принято.' },
  ])
})

test('keeps the local photo thumbnail when the server repeats the accepted line', () => {
  expect(
    mergeComposerChat(
      [
        { role: 'assistant', text: 'Пришлите фото еды.' },
        { role: 'assistant', text: '📷 Фото принято.', imageUrl: 'blob:meal' },
      ],
      [{ text: 'Пришлите фото еды.' }, { text: '📷 Фото принято.' }],
    ),
  ).toEqual([
    { role: 'assistant', text: 'Пришлите фото еды.' },
    { role: 'assistant', text: '📷 Фото принято.', imageUrl: 'blob:meal' },
  ])
})

test('does not append the same assistant photo reply twice', () => {
  const first = appendAssistantMessage([], {
    role: 'assistant',
    text: '📷 Фото принято.',
    imageUrl: 'blob:meal',
  })
  expect(
    appendAssistantMessage(first, {
      role: 'assistant',
      text: '📷 Фото принято.',
      imageUrl: 'blob:meal',
    }),
  ).toEqual(first)
})

test('keeps a grayscale thumbnail when the server repeats the deleted-photo line', () => {
  expect(
    mergeComposerChat(
      [
        { role: 'assistant', text: 'Пришлите фото еды.' },
        {
          role: 'assistant',
          text: '📷 Фото удалено. Пришлите фото еды, затем голос или текст.',
          imageUrl: 'blob:meal',
          imageFilter: 'grayscale',
        },
      ],
      [
        { text: 'Пришлите фото еды.' },
        { text: '📷 Фото удалено. Пришлите фото еды, затем голос или текст.' },
      ],
    ),
  ).toEqual([
    { role: 'assistant', text: 'Пришлите фото еды.' },
    {
      role: 'assistant',
      text: '📷 Фото удалено. Пришлите фото еды, затем голос или текст.',
      imageUrl: 'blob:meal',
      imageFilter: 'grayscale',
    },
  ])
})
