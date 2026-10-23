export type ChatStreamState = {
  reasoning: string
  reply: string
  carry: string
  inThink: boolean
}

export const emptyChatStream: ChatStreamState = {
  reasoning: '',
  reply: '',
  carry: '',
  inThink: false,
}

function textField(value: unknown) {
  return typeof value === 'string' ? value : ''
}

function tagTail(text: string, tag: string) {
  const lower = text.toLowerCase()
  const max = Math.min(tag.length - 1, text.length)
  for (let size = max; size > 0; size -= 1) {
    if (tag.startsWith(lower.slice(-size))) return text.slice(-size)
  }
  return ''
}

function take(state: ChatStreamState, chunk: string) {
  let reasoningDelta = ''
  let replyDelta = ''
  let carry = state.carry + chunk
  let inThink = state.inThink
  let reasoning = state.reasoning
  let reply = state.reply

  while (carry) {
    if (inThink) {
      const end = carry.toLowerCase().indexOf('</think>')
      if (end === -1) {
        const hold = tagTail(carry, '</think>')
        const emit = carry.slice(0, carry.length - hold.length)
        reasoning += emit
        reasoningDelta += emit
        carry = hold
        break
      }
      const emit = carry.slice(0, end)
      reasoning += emit
      reasoningDelta += emit
      carry = carry.slice(end + '</think>'.length)
      inThink = false
      continue
    }

    const start = carry.toLowerCase().indexOf('<think>')
    if (start === -1) {
      const hold = tagTail(carry, '<think>')
      const emit = carry.slice(0, carry.length - hold.length)
      reply += emit
      replyDelta += emit
      carry = hold
      break
    }
    const emit = carry.slice(0, start)
    reply += emit
    replyDelta += emit
    carry = carry.slice(start + '<think>'.length)
    inThink = true
  }

  return {
    state: { reasoning, reply, carry, inThink },
    reasoningDelta,
    replyDelta,
  }
}

/** Applies one streamed model delta. Reasoning fields and `<think>` tags stay out of the answer. */
export function consumeChatDelta(
  state: ChatStreamState,
  delta: {
    content?: unknown
    reasoning?: unknown
    reasoning_content?: unknown
    thinking?: unknown
  },
) {
  const aside = `${textField(delta.reasoning)}${textField(delta.reasoning_content)}${textField(delta.thinking)}`
  const withAside = aside
    ? {
        ...state,
        reasoning: state.reasoning + aside,
      }
    : state
  const content = take(withAside, textField(delta.content))
  return {
    state: content.state,
    reasoningDelta: aside + content.reasoningDelta,
    replyDelta: content.replyDelta,
  }
}
