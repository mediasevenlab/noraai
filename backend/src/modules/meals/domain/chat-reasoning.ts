const THINK_BLOCK = /<think>([\s\S]*?)<\/think>/gi

function textField(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

/** Pulls a model's hidden reasoning out of the reply so the chat can show it apart from the answer. */
export function splitChatReasoning(message: {
  content?: unknown
  reasoning?: unknown
  reasoning_content?: unknown
  thinking?: unknown
}) {
  const aside = [message.reasoning, message.reasoning_content, message.thinking]
    .map(textField)
    .filter(Boolean)
  let reply = ''
  if (typeof message.content === 'string') reply = message.content
  else if (Array.isArray(message.content)) {
    reply = message.content
      .map((part) => {
        if (typeof part === 'string') return part
        if (part && typeof part === 'object' && 'text' in part) return String((part as { text?: unknown }).text ?? '')
        return ''
      })
      .join('\n')
  }

  const blocks: string[] = []
  reply = reply.replace(THINK_BLOCK, (_match, inner: string) => {
    const text = inner.trim()
    if (text) blocks.push(text)
    return ''
  })
  const unclosed = /<think>([\s\S]*)$/i.exec(reply)
  if (unclosed) {
    const text = unclosed[1]?.trim() ?? ''
    if (text) blocks.push(text)
    reply = reply.slice(0, unclosed.index)
  }

  return {
    reply: reply.trim(),
    reasoning: [...aside, ...blocks].join('\n\n').trim(),
  }
}
