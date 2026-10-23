import {
  mealsTranscribeResponseSchema,
  noraModelChatResponseSchema,
  type MealsTranscribeResponse,
  type NoraModelChatMessage,
  type NoraModelChatResponse,
} from '@web-app-demo/contracts'

import type { AuthenticatedTransport } from '@/platform/api'

export function chatWithNoraModel(
  transport: AuthenticatedTransport,
  messages: NoraModelChatMessage[],
  signal?: AbortSignal,
  search = true,
  knowledgeBaseIds: string[] = [],
  think = false,
): Promise<NoraModelChatResponse> {
  return transport.request('/api/users/me/model-chat', noraModelChatResponseSchema, {
    method: 'POST',
    body: {
      messages,
      search,
      think,
      ...(knowledgeBaseIds.length > 0 ? { knowledgeBaseIds } : {}),
    },
    signal,
  })
}

export async function* streamNoraModel(
  transport: AuthenticatedTransport,
  messages: NoraModelChatMessage[],
  signal: AbortSignal,
  search = true,
  knowledgeBaseIds: string[] = [],
  think = false,
): AsyncGenerator<{ reasoning?: string; reply?: string; resetReply?: boolean; searched?: boolean }> {
  const response = await transport.raw('/api/users/me/model-chat', {
    method: 'POST',
    body: {
      messages,
      search,
      stream: true,
      think,
      ...(knowledgeBaseIds.length > 0 ? { knowledgeBaseIds } : {}),
    },
    headers: { Accept: 'application/x-ndjson' },
    signal,
  })
  const reader = response.body?.getReader()
  if (!reader) throw new Error('Модель ничего не ответила. Попробуйте ещё раз.')
  const decoder = new TextDecoder()
  let buffered = ''
  while (true) {
    const chunk = await reader.read()
    if (chunk.value) buffered += decoder.decode(chunk.value, { stream: !chunk.done })
    const lines = buffered.split('\n')
    buffered = lines.pop() ?? ''
    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed) continue
      const event = JSON.parse(trimmed) as {
        reasoning?: string
        reply?: string
        resetReply?: boolean
        searched?: boolean
        error?: string
      }
      if (event.error) throw new Error(event.error)
      yield event
    }
    if (chunk.done) break
  }
}

export function transcribeMyVoice(
  transport: AuthenticatedTransport,
  body: { audioBase64: string; audioMime?: string },
): Promise<MealsTranscribeResponse> {
  return transport.request('/api/users/me/meals/transcribe', mealsTranscribeResponseSchema, {
    method: 'POST',
    body,
  })
}
