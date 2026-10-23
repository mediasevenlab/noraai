import { describe, expect, test } from 'bun:test'

import { consumeChatDelta, emptyChatStream } from './chat-stream'

describe('chat stream', () => {
  test('appends reasoning tokens as they arrive and keeps the answer separate', () => {
    const first = consumeChatDelta(emptyChatStream, { reasoning_content: '17 × 20' })
    const second = consumeChatDelta(first.state, { reasoning_content: ' = 340' })
    const answer = consumeChatDelta(second.state, { content: '408' })
    expect(first.reasoningDelta).toBe('17 × 20')
    expect(second.reasoningDelta).toBe(' = 340')
    expect(answer.replyDelta).toBe('408')
    expect(answer.state.reasoning).toBe('17 × 20 = 340')
    expect(answer.state.reply).toBe('408')
  })

  test('types a think tag that arrives in pieces', () => {
    const steps = ['<thi', 'nk>Считаю ', '17.</thi', 'nk>\n408']
    let state = emptyChatStream
    const reasoning: string[] = []
    const reply: string[] = []
    for (const content of steps) {
      const next = consumeChatDelta(state, { content })
      state = next.state
      if (next.reasoningDelta) reasoning.push(next.reasoningDelta)
      if (next.replyDelta) reply.push(next.replyDelta)
    }
    expect(reasoning.join('')).toBe('Считаю 17.')
    expect(reply.join('')).toBe('\n408')
    expect(state.reply).not.toContain('think')
  })
})
