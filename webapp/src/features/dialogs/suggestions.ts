import type { SuggestionAdapter } from '@assistant-ui/core'
import type { ThreadMessage } from '@assistant-ui/react'

import type { AuthenticatedTransport } from '@/platform/api'

import { chatWithNoraModel } from './api'
import { suggestionsEnabled } from './suggestions-open'

type TransportSource = { current: AuthenticatedTransport }

const APP_OFFER = /настро(ить|им|йки)|профил|возможност|раздел приложения|баз[аеуы] знан/i
const ASSISTANT_OFFER = /^(хочешь|давай|попробуем|могу |я помогу|расскажу)/i
const WEATHER_TOPIC = /погод|температур|осадк|дожд|прогноз|пасмур|ветер|градус|\+\d/i

export function followUpPrompts(raw: string, subject = '', count = 3) {
  const allowWeather = !subject || WEATHER_TOPIC.test(subject)
  return raw
    .split('\n')
    .map((line) => line.replace(/^\s*(?:[-*•]|\d+[.)])\s*/, '').replace(/^["«]|["»]$/g, '').trim())
    .filter((line) => line.length > 1 && line.length <= 140)
    .filter((line) => !APP_OFFER.test(line) && !ASSISTANT_OFFER.test(line))
    .filter((line) => allowWeather || !WEATHER_TOPIC.test(line))
    .slice(0, count)
}

export function lastExchange<T extends { role: 'user' | 'assistant'; text: string }>(messages: readonly T[]) {
  let answerAt = -1
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    if (messages[index]?.role === 'assistant' && messages[index].text.trim()) {
      answerAt = index
      break
    }
  }
  if (answerAt < 0) return []
  let questionAt = -1
  for (let index = answerAt - 1; index >= 0; index -= 1) {
    if (messages[index]?.role === 'user' && messages[index].text.trim()) {
      questionAt = index
      break
    }
  }
  const answer = messages[answerAt]
  if (!answer) return []
  return questionAt >= 0 && messages[questionAt] ? [messages[questionAt], answer] : [answer]
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
      const transcript = lastExchange(
        messages.flatMap((message) => {
          const text = messageText(message)
          if (!text || (message.role !== 'user' && message.role !== 'assistant')) return []
          return [{ role: message.role, text: text.slice(0, 700) }]
        }),
      )
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
        const topic = transcript.at(-1)?.text ?? ''
        return followUpPrompts(result.reply, topic).map((prompt) => ({ prompt }))
      } catch {
        return []
      }
    },
  }
}
