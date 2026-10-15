import { expect, test } from 'bun:test'

import { parseChatMarkdown } from '../src/features/diary/chat-markdown'

test('a workout plan becomes headings, bold names, and a list', () => {
  const blocks = parseChatMarkdown([
    '### Понедельник: Грудь и трицепс',
    '',
    '- **Подтягивания** (4 сета по 8-12 повторений)',
    '- **Жим штангой лежа** (4 сета по 8-12',
    'повторений)',
  ].join('\n'))

  expect(blocks[0]).toMatchObject({
    kind: 'heading',
    level: 3,
    inlines: [{ kind: 'text', text: 'Понедельник: Грудь и трицепс' }],
  })
  expect(blocks[1]).toMatchObject({ kind: 'list', ordered: false })
  const list = blocks[1]
  if (list?.kind !== 'list') throw new Error('expected a list')
  expect(list.items[0]?.[0]).toEqual({ kind: 'strong', text: 'Подтягивания' })
  expect(list.items[1]?.map((part) => part.text).join('')).toContain('повторений')
})

test('angle-bracket and bare addresses become links', () => {
  const blocks = parseChatMarkdown('1. <https://www.tasty.co/>\n2. https://www.epicurious.com/')
  const list = blocks[0]
  if (list?.kind !== 'list') throw new Error('expected a list')
  expect(list.items[0]).toEqual([{ kind: 'link', text: 'https://www.tasty.co/', href: 'https://www.tasty.co/' }])
  expect(list.items[1]?.[0]).toMatchObject({ kind: 'link', href: 'https://www.epicurious.com/' })
  const unsafe = parseChatMarkdown('[рецепты](javascript:alert(1))')
  expect(JSON.stringify(unsafe)).not.toContain('"kind":"link"')
})

test('a blank line splits paragraphs and leaves ordinary text untouched', () => {
  const blocks = parseChatMarkdown('Да, ограничения есть.\n\nЯ не помогаю с вредом.')
  expect(blocks).toHaveLength(2)
  expect(blocks[0]).toMatchObject({
    kind: 'paragraph',
    lines: [[{ kind: 'text', text: 'Да, ограничения есть.' }]],
  })
  expect(blocks[1]).toMatchObject({
    kind: 'paragraph',
    lines: [[{ kind: 'text', text: 'Я не помогаю с вредом.' }]],
  })
})
