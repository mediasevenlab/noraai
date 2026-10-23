import { expect, test } from 'bun:test'

import { toNoraMessages } from '../src/features/dialogs/nora-messages'

const photo = 'data:image/jpeg;base64,abc'

test('keeps user and assistant text and drops other roles', () => {
  expect(
    toNoraMessages([
      { role: 'system', content: [{ type: 'text', text: 'скрыто' }] },
      { role: 'user', content: [{ type: 'text', text: '  Привет  ' }] },
      { role: 'assistant', content: [{ type: 'text', text: 'Здравствуйте' }] },
      { role: 'user', content: [{ type: 'text', text: 'Что на ужин?' }] },
    ]),
  ).toEqual([
    { role: 'user', text: 'Привет' },
    { role: 'assistant', text: 'Здравствуйте' },
    { role: 'user', text: 'Что на ужин?' },
  ])
})

test('sends a photo that stays on the message attachment', () => {
  expect(
    toNoraMessages([
      {
        role: 'user',
        content: [{ type: 'text', text: 'что на изображении?' }],
        attachments: [{ content: [{ type: 'image', image: photo }] }],
      },
    ]),
  ).toEqual([
    {
      role: 'user',
      text: 'что на изображении?',
      images: [{ base64: 'abc', mime: 'image/jpeg' }],
    },
  ])
})

test('sends one attached document and keeps it on an earlier turn', () => {
  expect(
    toNoraMessages([
      {
        role: 'user',
        content: [{ type: 'text', text: 'какие там есть таблицы?' }],
        attachments: [{ content: [{ type: 'file', data: 'cGRm', filename: 'график.pdf', mimeType: 'application/pdf' }] }],
      },
      { role: 'assistant', content: [{ type: 'text', text: 'В файле две таблицы.' }] },
      { role: 'user', content: [{ type: 'text', text: 'построй вторую?' }] },
    ]),
  ).toEqual([
    {
      role: 'user',
      text: 'какие там есть таблицы?',
      files: [{ name: 'график.pdf', base64: 'cGRm' }],
    },
    { role: 'assistant', text: 'В файле две таблицы.' },
    { role: 'user', text: 'построй вторую?' },
  ])
})

test('sends a photo without text and ignores a trailing empty assistant turn', () => {
  expect(
    toNoraMessages([
      { role: 'user', content: [{ type: 'image', image: photo }] },
      { role: 'assistant', content: [{ type: 'text', text: '   ' }] },
    ]),
  ).toEqual([{ role: 'user', text: '', images: [{ base64: 'abc', mime: 'image/jpeg' }] }])
})

test('keeps the latest 30 turns and the last one is the person', () => {
  const messages = Array.from({ length: 40 }, (_, index) => ({
    role: index % 2 === 0 ? 'user' : 'assistant',
    content: [{ type: 'text', text: `сообщение ${index}` }],
  }))
  const turns = toNoraMessages(messages)
  expect(turns).toHaveLength(30)
  expect(turns[0]?.text).toBe('сообщение 9')
  expect(turns.at(-1)).toEqual({ role: 'user', text: 'сообщение 38' })
})
