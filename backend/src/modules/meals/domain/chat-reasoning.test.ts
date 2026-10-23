import { describe, expect, test } from 'bun:test'

import { splitChatReasoning } from './chat-reasoning'

describe('chat reasoning', () => {
  test('keeps a plain answer and leaves reasoning empty', () => {
    expect(splitChatReasoning({ content: 'Ответ без хода мыслей.' })).toEqual({
      reply: 'Ответ без хода мыслей.',
      reasoning: '',
    })
  })

  test('lifts closed and unclosed think tags out of the answer', () => {
    const split = splitChatReasoning({
      content: '<think>Сначала 17 на 20.</think>\n\n408.\n<think>Потом остаток',
    })
    expect(split.reply).toBe('408.')
    expect(split.reasoning).toContain('Сначала 17 на 20.')
    expect(split.reasoning).toContain('Потом остаток')
  })

  test('reads a separate reasoning field and does not repeat it in the answer', () => {
    expect(splitChatReasoning({ content: '408.', reasoning_content: 'Умножаю 17 на 24.' })).toEqual({
      reply: '408.',
      reasoning: 'Умножаю 17 на 24.',
    })
  })
})
