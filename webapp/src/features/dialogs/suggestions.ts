import type { SuggestionAdapter } from '@assistant-ui/core'
import type { ThreadMessage } from '@assistant-ui/react'

import type { AuthenticatedTransport } from '@/platform/api'

import { chatWithNoraModel } from './api'
import { suggestionsEnabled } from './suggestions-open'

type TransportSource = { current: AuthenticatedTransport }

const APP_OFFER = /настро(ить|им|йки)|профил|возможност|раздел приложения|баз[аеуы] знан/i
const ASSISTANT_OFFER = /^(хочешь|давай|попробуем|могу |я помогу|расскажу)/i

export function followUpPrompts(raw: string, count = 3) {
  return raw
    .split('\n')
    .map((line) => line.replace(/^\s*(?:[-*•]|\d+[.)])\s*/, '').replace(/^["«]|["»]$/g, '').trim())
    .filter((line) => line.length > 1 && line.length <= 140)
    .filter((line) => !APP_OFFER.test(line) && !ASSISTANT_OFFER.test(line))
    .slice(0, count)
}

function messageText(message: ThreadMessage) {
  return message.content
    .map((part) => (part.type === 'text' ? part.text.trim() : ''))
    .filter(Boolean)
    .join('\n')
}

export function noraSuggestionAdapter(transport: TransportSource, enabled: boolean): SuggestionAdapter {
  return {
    key: enabled ? 'on' : 'off',
    async generate({ messages, signal }) {
      if (!enabled || !suggestionsEnabled()) return []
      const transcript = messages
        .slice(-4)
        .map((message) => {
          const text = messageText(message)
          if (!text) return null
          return { role: message.role === 'user' ? 'user' as const : 'assistant' as const, text: text.slice(0, 500) }
        })
        .filter((message): message is { role: 'user' | 'assistant'; text: string } => message != null)
      if (!transcript.some((message) => message.role === 'assistant' && message.text)) return []
      try {
        const result = await chatWithNoraModel(
          transport.current,
          transcript,
          signal,
          false,
          [],
          false,
          [],
          true,
        )
        return followUpPrompts(result.reply).map((prompt) => ({ prompt }))
      } catch {
        return []
      }
    },
  }
}
