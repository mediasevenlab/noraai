import type { NoraModelChatMessage } from '@web-app-demo/contracts'

import type { AppEnv } from '../../../env'
import { MealsFailure } from '../domain/errors'
import {
  buildNoraChatRequest,
  NORA_WEB_SEARCH_TOOL,
  readWebSearchCalls,
  webSearchQuery,
  type NoraChatTurn,
} from '../domain/nora-chat'
import { searchOfficeWeb } from './nora-office'
import { encodeJpeg } from './sharp-meal-image'

type NoraEnv = Pick<
  AppEnv,
  'LLM_BASE_URL' | 'LLM_API_KEY' | 'LLM_TEXT_MODEL' | 'LLM_VISION_MODEL' | 'LLM_SEARCH_URL'
>

type ChatMessage = {
  role: string
  content?: unknown
  tool_calls?: unknown
  tool_call_id?: string
}

const REQUEST_TIMEOUT_MS = 240_000
const VISION_EDGE = 448

function completionText(payload: { choices?: Array<{ message?: { content?: unknown } }> }) {
  const content = payload.choices?.[0]?.message?.content
  if (typeof content === 'string') return content
  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (typeof part === 'string') return part
        if (part && typeof part === 'object' && 'text' in part) {
          return String((part as { text?: unknown }).text ?? '')
        }
        return ''
      })
      .join('\n')
  }
  return ''
}

async function shrinkChatImage(image: { base64: string; mime?: string }) {
  try {
    const bytes = Buffer.from(image.base64, 'base64')
    if (bytes.length === 0) return image
    const jpeg = await encodeJpeg(bytes, { maxEdge: VISION_EDGE, quality: 72 })
    return { base64: jpeg.toString('base64'), mime: 'image/jpeg' }
  } catch {
    return image
  }
}

async function prepareTurns(messages: readonly NoraModelChatMessage[]): Promise<NoraChatTurn[]> {
  return Promise.all(
    messages.map(async (message) => ({
      role: message.role,
      text: message.text,
      images: message.images
        ? await Promise.all(message.images.map((image) => shrinkChatImage(image)))
        : undefined,
    })),
  )
}

export async function completeNoraChat(
  env: NoraEnv,
  messages: readonly NoraModelChatMessage[],
  search?: boolean,
) {
  const baseUrl = env.LLM_BASE_URL?.replace(/\/$/, '')
  if (!baseUrl || !env.LLM_API_KEY) {
    throw new MealsFailure(
      'misconfigured',
      'Своя модель пока не настроена. Выберите Gemini или попробуйте позже.',
    )
  }

  const request = buildNoraChatRequest(await prepareTurns(messages), {
    text: env.LLM_TEXT_MODEL,
    vision: env.LLM_VISION_MODEL,
    search: search !== false && Boolean(env.LLM_SEARCH_URL),
  })
  const thread: ChatMessage[] = request.messages.map((message) => ({
    role: message.role,
    content: message.content,
  }))
  let reply = ''
  for (let round = 0; round < 3; round += 1) {
    const allowTools = request.tools && round < 2
    const payload = await postNoraCompletion(baseUrl, env.LLM_API_KEY, {
      model: request.model,
      temperature: 0.4,
      max_tokens: 1024,
      messages: thread,
      ...(allowTools ? { tools: [NORA_WEB_SEARCH_TOOL] } : {}),
    })
    const message = payload.choices?.[0]?.message
    const calls = allowTools ? readWebSearchCalls(message?.tool_calls) : []
    reply = completionText({ choices: [{ message }] }).trim()
    if (calls.length === 0) break
    thread.push({
      role: 'assistant',
      content: reply || null,
      tool_calls: calls.map((call) => ({
        id: call.id,
        type: 'function',
        function: { name: call.name, arguments: call.arguments },
      })),
    })
    for (const call of calls) {
      const query = webSearchQuery(call)
      const content = query
        ? await searchOfficeWeb(env.LLM_SEARCH_URL!, query, env.LLM_API_KEY).catch(() => 'Поиск сейчас недоступен.')
        : 'Этот инструмент недоступен.'
      thread.push({ role: 'tool', tool_call_id: call.id, content })
    }
  }
  if (!reply) {
    throw new MealsFailure('upstream', 'Модель ничего не ответила. Попробуйте ещё раз.')
  }
  return { reply, model: request.model }
}

async function postNoraCompletion(
  baseUrl: string,
  apiKey: string,
  body: Record<string, unknown>,
) {
  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  })
  const raw = await response.text()
  if (!response.ok) {
    throw new MealsFailure('upstream', `Модель ${response.status}: ${raw.slice(0, 240)}`)
  }
  try {
    return JSON.parse(raw) as { choices?: Array<{ message?: { content?: unknown; tool_calls?: unknown } }> }
  } catch {
    throw new MealsFailure('upstream', 'Модель вернула не ответ, а обрывок')
  }
}
