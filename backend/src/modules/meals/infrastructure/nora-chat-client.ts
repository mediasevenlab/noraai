import type { NoraModelChatMessage } from '@web-app-demo/contracts'

import type { AppEnv } from '../../../env'
import { MealsFailure } from '../domain/errors'
import { buildNoraChatRequest, type NoraChatTurn } from '../domain/nora-chat'
import { encodeJpeg } from './sharp-meal-image'

type NoraEnv = Pick<
  AppEnv,
  'LLM_BASE_URL' | 'LLM_API_KEY' | 'LLM_TEXT_MODEL' | 'LLM_VISION_MODEL'
>

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

export async function completeNoraChat(env: NoraEnv, messages: readonly NoraModelChatMessage[]) {
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
  })
  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.LLM_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: request.model,
      temperature: 0.4,
      max_tokens: 1024,
      messages: request.messages,
    }),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  })
  const body = await response.text()
  if (!response.ok) {
    throw new MealsFailure('upstream', `Модель ${response.status}: ${body.slice(0, 240)}`)
  }

  let payload: { choices?: Array<{ message?: { content?: unknown } }> }
  try {
    payload = JSON.parse(body) as typeof payload
  } catch {
    throw new MealsFailure('upstream', 'Модель вернула не ответ, а обрывок')
  }
  const reply = completionText(payload).trim()
  if (!reply) {
    throw new MealsFailure('upstream', 'Модель ничего не ответила. Попробуйте ещё раз.')
  }
  return { reply, model: request.model }
}
