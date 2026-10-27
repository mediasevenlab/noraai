import type { NoraModelChatMessage } from '@web-app-demo/contracts'

import type { AppEnv } from '../../../env'
import { directKnowledgeReply } from '../../knowledge'
import { MealsFailure } from '../domain/errors'
import { splitChatReasoning } from '../domain/chat-reasoning'
import { consumeChatDelta, emptyChatStream, type ChatStreamState } from '../domain/chat-stream'
import {
  answerNeedsVisionReading,
  buildNoraChatRequest,
  buildVisionGlance,
  followUpLines,
  noteVisionForText,
  NORA_WEB_SEARCH_TOOL,
  photoLookupQuery,
  readWebSearchCalls,
  webSearchQuery,
  type NoraChatTurn,
  type NoraWebSearchCall,
} from '../domain/nora-chat'
import { SEARCH_UNAVAILABLE, searchOfficeWeb } from './nora-office'
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

const REASONING_LIMIT = 20_000
const TEXT_MAX_TOKENS = 1024
const THINK_MAX_TOKENS = 8192
const TEXT_NUM_CTX = 32_768
const VISION_NUM_CTX = 16_384
const VISION_MAX_TOKENS = 2048

export type NoraChatEvent = { reasoning?: string; reply?: string; resetReply?: boolean; searched?: boolean }

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
  knowledge?: string,
  signal?: AbortSignal,
  think?: boolean,
) {
  let reply = ''
  let reasoning = ''
  let model = ''
  for await (const event of streamNoraChat(env, messages, search, knowledge, signal, think)) {
    if (event.resetReply) reply = ''
    if (event.reasoning) reasoning += event.reasoning
    if (event.reply) reply += event.reply
    if (event.model) model = event.model
  }
  reply = reply.trim()
  reasoning = reasoning.trim().slice(0, REASONING_LIMIT)
  if (!reply) {
    throw new MealsFailure('upstream', 'Модель ничего не ответила. Попробуйте ещё раз.')
  }
  return {
    reply,
    model,
    ...(reasoning ? { reasoning } : {}),
  }
}

const WORD_PAUSE_MS = 28
const ROW_PAUSE_MS = 30

function pause(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/** A ready table list used to arrive as one block. Words and rows now print in order. */
async function* pacedReply(text: string, model: string): AsyncGenerator<NoraChatEvent & { model?: string }> {
  const lines = text.split('\n')
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index] ?? ''
    const newline = index === lines.length - 1 ? '' : '\n'
    if (line.startsWith('|')) {
      yield { reply: `${line}${newline}`, model }
      await pause(ROW_PAUSE_MS)
      continue
    }
    const words = line.match(/\S+\s*/g) ?? []
    if (words.length === 0) {
      if (newline) yield { reply: newline, model }
      continue
    }
    for (let wordIndex = 0; wordIndex < words.length; wordIndex += 1) {
      const last = wordIndex === words.length - 1
      yield { reply: `${words[wordIndex] ?? ''}${last ? newline : ''}`, model }
      await pause(WORD_PAUSE_MS)
    }
  }
}

export async function* streamNoraChat(
  env: NoraEnv,
  messages: readonly NoraModelChatMessage[],
  search?: boolean,
  knowledge?: string,
  signal?: AbortSignal,
  think?: boolean,
): AsyncGenerator<NoraChatEvent & { model?: string }> {
  const lastUser = [...messages].reverse().find((message) => message.role === 'user')
  const ready = directKnowledgeReply(knowledge ?? '')
  if (ready && !lastUser?.images?.length && search !== true) {
    yield* pacedReply(ready, env.LLM_TEXT_MODEL)
    return
  }
  const baseUrl = env.LLM_BASE_URL?.replace(/\/$/, '')
  if (!baseUrl || !env.LLM_API_KEY) {
    throw new MealsFailure(
      'misconfigured',
      'Своя модель пока не настроена. Выберите Gemini или попробуйте позже.',
    )
  }

  const models = {
    text: env.LLM_TEXT_MODEL,
    vision: env.LLM_VISION_MODEL,
    search: search === true && Boolean(env.LLM_SEARCH_URL),
  }
  let turns = await prepareTurns(messages)
  let photoSubject = ''
  if (answerNeedsVisionReading(turns, models, knowledge)) {
    const note = await readVisionNote(env, turns, signal).catch(() => '')
    turns = noteVisionForText(turns, note)
    if (search === true && env.LLM_SEARCH_URL && note.trim() && note.trim() !== 'Снимок разобрать не удалось.') {
      photoSubject = await readPhotoSubject(env, lastUser?.text.trim() ?? '', note, signal).catch(() => '')
    }
  }
  const request = buildNoraChatRequest(turns, models, knowledge)
  const thread: ChatMessage[] = request.messages.map((message) => ({
    role: message.role,
    content: message.content,
  }))
  if (search === true && env.LLM_SEARCH_URL) {
    const typed = lastUser?.text.trim() ?? ''
    const noted = turns.at(-1)?.text ?? ''
    const marker = 'Что видно на изображении:\n'
    const fromPhoto = noted.includes(marker) ? noted.slice(noted.indexOf(marker) + marker.length).trim() : ''
    const readablePhoto = Boolean(fromPhoto) && !fromPhoto.startsWith('Снимок разобрать не удалось')
    const question = readablePhoto ? photoLookupQuery(typed, photoSubject || fromPhoto) : fromPhoto ? '' : typed
    if (fromPhoto) request.tools = false
    if (question) {
      const findings = await searchOfficeWeb(
        env.LLM_SEARCH_URL,
        question.slice(0, 300),
        env.LLM_API_KEY,
      ).catch(() => SEARCH_UNAVAILABLE)
      const system = thread.find((message) => message.role === 'system')
      if (system && typeof system.content === 'string') {
        system.content += `\n\nРезультаты поиска:\n${findings}`
      }
      if (findings !== SEARCH_UNAVAILABLE) yield { searched: true }
    }
  }
  const thinking = request.model === env.LLM_TEXT_MODEL
  const thinkOn = Boolean(think) && thinking
  const writingTable = (knowledge ?? '').includes('| --- |')
  const meetingTranscript = (knowledge ?? '').startsWith('Расшифровки выбранных встреч.')
  const textNumCtx = meetingTranscript ? 65_536 : TEXT_NUM_CTX
  const answerTokens = thinkOn
    ? THINK_MAX_TOKENS
    : writingTable
      ? 4096
      : meetingTranscript
        ? 3072
        : turns.at(-1)?.text.includes('Что видно на изображении:')
          ? 2048
          : TEXT_MAX_TOKENS
  let reply = ''
  for (let round = 0; round < 3; round += 1) {
    const allowTools = request.tools && round < 2
    const useNative = !allowTools
    const response = useNative
      ? await postOllamaChat(baseUrl, env.LLM_API_KEY, {
          model: request.model,
          messages: thinking ? plainChatMessages(thread) : nativeVisionMessages(thread),
          stream: true,
          think: thinkOn,
          options: {
            num_ctx: thinking ? textNumCtx : VISION_NUM_CTX,
            num_predict: thinking ? answerTokens : VISION_MAX_TOKENS,
            temperature: 0.4,
          },
        }, signal)
      : await postNoraCompletion(baseUrl, env.LLM_API_KEY, {
          model: request.model,
          temperature: 0.4,
          max_tokens: thinking ? answerTokens : VISION_MAX_TOKENS,
          messages: thread,
          stream: true,
          ...(thinking ? { think: thinkOn, options: { num_ctx: textNumCtx } } : {}),
          ...(allowTools ? { tools: [NORA_WEB_SEARCH_TOOL] } : {}),
        }, signal)
    const roundStream = useNative ? readOllamaChat(response) : readCompletion(response, allowTools ? undefined : [])
    let step = await roundStream.next()
    const calls: NoraWebSearchCall[] = []
    while (!step.done) {
      if (step.value.reply) reply += step.value.reply
      const visible = visibleChatEvent(step.value, thinkOn)
      if (visible) yield visible
      step = await roundStream.next()
    }
    calls.push(...step.value)
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
    reply = ''
    yield { resetReply: true }
    for (const call of calls) {
      const query = webSearchQuery(call)
      const content = query
        ? await searchOfficeWeb(env.LLM_SEARCH_URL!, query, env.LLM_API_KEY).catch(() => SEARCH_UNAVAILABLE)
        : 'Этот инструмент недоступен.'
      if (query && content !== SEARCH_UNAVAILABLE) yield { searched: true }
      thread.push({ role: 'tool', tool_call_id: call.id, content })
    }
  }
  if (!reply.trim()) {
    const response = thinking
      ? await postOllamaChat(baseUrl, env.LLM_API_KEY, {
          model: request.model,
          messages: [
            ...plainChatMessages(thread),
            { role: 'user', content: 'Дай итоговый ответ на языке пользователя по тем же правилам.' },
          ],
          stream: true,
          think: false,
          options: { num_ctx: textNumCtx, num_predict: answerTokens, temperature: 0.2 },
        }, signal)
      : await postOllamaChat(baseUrl, env.LLM_API_KEY, {
          model: request.model,
          messages: nativeVisionMessages([
            ...thread,
            { role: 'user', content: 'Дай итоговый ответ на языке пользователя по тем же правилам.' },
          ]),
          stream: true,
          think: false,
          options: { num_ctx: VISION_NUM_CTX, num_predict: VISION_MAX_TOKENS, temperature: 0.2 },
        }, signal)
    const roundStream = readOllamaChat(response)
    let step = await roundStream.next()
    while (!step.done) {
      if (step.value.reply) reply += step.value.reply
      const visible = visibleChatEvent(step.value, false)
      if (visible) yield visible
      step = await roundStream.next()
    }
  }
  yield { model: request.model }
}

function visibleChatEvent(event: NoraChatEvent, thinkOn: boolean): NoraChatEvent | null {
  if (thinkOn || !event.reasoning) return event
  if (!event.reply && !event.resetReply) return null
  return { reply: event.reply, resetReply: event.resetReply }
}

function ollamaOrigin(baseUrl: string) {
  return baseUrl.replace(/\/$/, '').replace(/\/v1$/, '')
}

function plainChatMessages(messages: readonly ChatMessage[]) {
  return messages.map((message) => ({
    role: message.role,
    content: typeof message.content === 'string' ? message.content : '',
  }))
}

function nativeVisionMessages(messages: readonly ChatMessage[]) {
  return messages.map((message) => {
    if (typeof message.content === 'string' || message.content == null) {
      return { role: message.role, content: typeof message.content === 'string' ? message.content : '' }
    }
    if (!Array.isArray(message.content)) return { role: message.role, content: '' }
    const texts: string[] = []
    const images: string[] = []
    for (const part of message.content) {
      if (!part || typeof part !== 'object') continue
      const record = part as { type?: unknown; text?: unknown; image_url?: { url?: unknown } }
      if (record.type === 'text' && typeof record.text === 'string' && record.text.trim()) texts.push(record.text)
      const url = typeof record.image_url?.url === 'string' ? record.image_url.url : ''
      if (record.type === 'image_url' && url) {
        const base64 = url.includes(',') ? url.slice(url.indexOf(',') + 1) : url
        if (base64) images.push(base64)
      }
    }
    return {
      role: message.role,
      content: texts.join('\n') || 'Посмотри на изображение.',
      ...(images.length > 0 ? { images } : {}),
    }
  })
}

async function readPhotoSubject(env: NoraEnv, userAsk: string, visionNote: string, signal?: AbortSignal) {
  const baseUrl = env.LLM_BASE_URL?.replace(/\/$/, '')
  if (!baseUrl || !env.LLM_API_KEY) return ''
  const response = await postOllamaChat(baseUrl, env.LLM_API_KEY, {
    model: env.LLM_TEXT_MODEL,
    messages: [
      {
        role: 'system',
        content:
          'По разбору снимка назови предмет одной короткой фразой для поиска. Если это еда — название блюда. Если точное имя неясно, назови ближайшее похожее. Только фраза, без пояснений.',
      },
      { role: 'user', content: `Вопрос: ${userAsk}\n\nРазбор:\n${visionNote}` },
    ],
    stream: true,
    think: false,
    options: { num_ctx: 4096, num_predict: 64, temperature: 0.1 },
  }, signal)
  return (await collectReply(response)).trim()
}

export async function completeFollowUps(
  env: NoraEnv,
  messages: readonly NoraModelChatMessage[],
  signal?: AbortSignal,
) {
  const baseUrl = env.LLM_BASE_URL?.replace(/\/$/, '')
  if (!baseUrl || !env.LLM_API_KEY) {
    throw new MealsFailure('misconfigured', 'Своя модель пока не настроена. Выберите Gemini или попробуйте позже.')
  }
  const transcript = messages
    .slice(-4)
    .map((message) => {
      const text = message.text.trim()
      if (!text) return ''
      return `${message.role === 'user' ? 'Пользователь' : 'Nora'}: ${text.slice(0, 500)}`
    })
    .filter(Boolean)
    .join('\n')
  if (!transcript) return { reply: ' ', model: env.LLM_TEXT_MODEL }
  const response = await postOllamaChat(baseUrl, env.LLM_API_KEY, {
    model: env.LLM_TEXT_MODEL,
    messages: [
      {
        role: 'system',
        content:
          'Ты пишешь три следующих сообщения пользователя. Они продолжают тему последнего ответа. Каждая строка — короткий вопрос или просьба, которую человек отправит в чат. Не пиши от лица ассистента, не предлагай настроить приложение, профиль или свои возможности. Пример, если речь о погоде в Новосибирске:\nКакая погода будет завтра в Новосибирске\nПрогноз на неделю\nА какая погода в моём городе?\nВерни ровно 3 строки, без нумерации.',
      },
      { role: 'user', content: transcript },
    ],
    stream: true,
    think: false,
    options: { num_ctx: 4096, num_predict: 180, temperature: 0.3 },
  }, signal)
  const lines = followUpLines(await collectReply(response))
  return { reply: lines.join('\n') || ' ', model: env.LLM_TEXT_MODEL }
}

async function collectReply(response: Response) {
  const roundStream = readOllamaChat(response)
  let reply = ''
  let step = await roundStream.next()
  while (!step.done) {
    if (step.value.reply) reply += step.value.reply
    step = await roundStream.next()
  }
  return reply
}

async function readVisionNote(env: NoraEnv, turns: readonly NoraChatTurn[], signal?: AbortSignal) {
  const baseUrl = env.LLM_BASE_URL?.replace(/\/$/, '')
  if (!baseUrl || !env.LLM_API_KEY) return ''
  const glance = buildVisionGlance(turns, {
    text: env.LLM_TEXT_MODEL,
    vision: env.LLM_VISION_MODEL,
  })
  const response = await postOllamaChat(baseUrl, env.LLM_API_KEY, {
    model: glance.model,
    messages: nativeVisionMessages(glance.messages),
    stream: true,
    think: false,
    options: {
      num_ctx: VISION_NUM_CTX,
      num_predict: 512,
      temperature: 0.2,
    },
  }, signal)
  return (await collectReply(response)).trim()
}

function modelFailureText(status: number, raw: string) {
  if (raw.includes('exceed_context_size_error') || raw.includes('exceeds the available context size')) {
    return 'Разговор с фото не поместился в контекст модели. Начните новый диалог и пришлите снимок ещё раз.'
  }
  return `Модель ${status}: ${raw.slice(0, 240)}`
}

async function postOllamaChat(
  baseUrl: string,
  apiKey: string,
  body: Record<string, unknown>,
  signal?: AbortSignal,
) {
  const timeout = AbortSignal.timeout(REQUEST_TIMEOUT_MS)
  const response = await fetch(`${ollamaOrigin(baseUrl)}/api/chat`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
    signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
  })
  if (!response.ok) {
    const raw = await response.text()
    throw new MealsFailure('upstream', modelFailureText(response.status, raw))
  }
  return response
}

async function* readOllamaChat(response: Response): AsyncGenerator<NoraChatEvent, NoraWebSearchCall[]> {
  const reader = response.body?.getReader()
  if (!reader) throw new MealsFailure('upstream', 'Модель вернула не ответ, а обрывок')
  const decoder = new TextDecoder()
  let buffered = ''
  let state = emptyChatStream
  while (true) {
    const chunk = await reader.read()
    if (chunk.value) buffered += decoder.decode(chunk.value, { stream: !chunk.done })
    const lines = buffered.split('\n')
    buffered = chunk.done ? '' : (lines.pop() ?? '')
    if (chunk.done && buffered) lines.push(buffered)
    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed) continue
      let payload: { message?: { content?: unknown; thinking?: unknown; reasoning?: unknown } }
      try {
        payload = JSON.parse(trimmed) as typeof payload
      } catch {
        continue
      }
      const message = payload.message ?? {}
      const aside = `${typeof message.thinking === 'string' ? message.thinking : ''}${typeof message.reasoning === 'string' ? message.reasoning : ''}`
      if (aside) yield { reasoning: aside }
      const consumed = consumeChatDelta(state, { content: message.content })
      state = consumed.state
      if (consumed.reasoningDelta) yield { reasoning: consumed.reasoningDelta }
      if (consumed.replyDelta) yield { reply: consumed.replyDelta }
    }
    if (chunk.done) break
  }
  return []
}

async function postNoraCompletion(
  baseUrl: string,
  apiKey: string,
  body: Record<string, unknown>,
  signal?: AbortSignal,
) {
  const timeout = AbortSignal.timeout(REQUEST_TIMEOUT_MS)
  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
    signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
  })
  if (!response.ok) {
    const raw = await response.text()
    throw new MealsFailure('upstream', modelFailureText(response.status, raw))
  }
  return response
}

async function* readCompletion(
  response: Response,
  blockedTools?: NoraWebSearchCall[],
): AsyncGenerator<NoraChatEvent, NoraWebSearchCall[]> {
  const reader = response.body?.getReader()
  if (!reader) throw new MealsFailure('upstream', 'Модель вернула не ответ, а обрывок')
  const decoder = new TextDecoder()
  let buffered = ''
  let mode: 'unknown' | 'sse' | 'json' = 'unknown'
  let stream = emptyChatStream
  const tools = new Map<number, { id: string; name: string; arguments: string }>()

  const emitJson = function* (raw: string): Generator<NoraChatEvent, NoraWebSearchCall[]> {
    let payload: { choices?: Array<{ message?: { content?: unknown; tool_calls?: unknown; reasoning?: unknown; reasoning_content?: unknown; thinking?: unknown } }> }
    try {
      payload = JSON.parse(raw) as typeof payload
    } catch {
      throw new MealsFailure('upstream', 'Модель вернула не ответ, а обрывок')
    }
    const message = payload.choices?.[0]?.message ?? {}
    const failure = completionError((payload as { error?: unknown }).error)
    if (failure) throw new MealsFailure('upstream', failure)
    const split = splitChatReasoning(message)
    if (split.reasoning) yield { reasoning: split.reasoning }
    if (split.reply) yield { reply: split.reply }
    return blockedTools ?? readWebSearchCalls(message.tool_calls)
  }

  while (true) {
    const chunk = await reader.read()
    if (chunk.value) buffered += decoder.decode(chunk.value, { stream: !chunk.done })
    if (mode === 'unknown' && buffered.trim()) {
      mode = buffered.trimStart().startsWith('data:') ? 'sse' : 'json'
    }
    if (mode === 'sse') {
      const lines = buffered.split('\n')
      buffered = lines.pop() ?? ''
      for (const line of lines) {
        const emitted = applySseLine(line, stream, tools)
        stream = emitted.state
        if (emitted.reasoning) yield { reasoning: emitted.reasoning }
        if (emitted.reply) yield { reply: emitted.reply }
      }
    }
    if (chunk.done) break
  }

  if (mode === 'json') return yield* emitJson(buffered)
  if (buffered.trim()) {
    const emitted = applySseLine(buffered, stream, tools)
    stream = emitted.state
    if (emitted.reasoning) yield { reasoning: emitted.reasoning }
    if (emitted.reply) yield { reply: emitted.reply }
  }
  if (blockedTools) return blockedTools
  return [...tools.values()]
    .filter((call) => call.name)
    .map((call, index) => ({
      id: call.id || `call-${index + 1}`,
      name: call.name,
      arguments: call.arguments || '{}',
    }))
}

function completionError(error: unknown) {
  if (typeof error === 'string' && error.trim()) return error.trim().slice(0, 240)
  if (error && typeof error === 'object' && 'message' in error) {
    const message = (error as { message?: unknown }).message
    if (typeof message === 'string' && message.trim()) return message.trim().slice(0, 240)
  }
  return ''
}

function applySseLine(
  line: string,
  state: ChatStreamState,
  tools: Map<number, { id: string; name: string; arguments: string }>,
) {
  const trimmed = line.trim()
  if (!trimmed.startsWith('data:')) return { state, reasoning: '', reply: '' }
  const data = trimmed.slice(5).trim()
  if (!data || data === '[DONE]') return { state, reasoning: '', reply: '' }
  let payload: {
    error?: unknown
    choices?: Array<{
      delta?: {
        content?: unknown
        reasoning?: unknown
        reasoning_content?: unknown
        thinking?: unknown
        tool_calls?: Array<{ index?: number; id?: string; function?: { name?: string; arguments?: string } }>
      }
    }>
  }
  try {
    payload = JSON.parse(data) as typeof payload
  } catch {
    return { state, reasoning: '', reply: '' }
  }
  const failure = completionError(payload.error)
  if (failure) throw new MealsFailure('upstream', failure)
  const delta = payload.choices?.[0]?.delta
  for (const call of delta?.tool_calls ?? []) {
    const index = call.index ?? tools.size
    const current = tools.get(index) ?? { id: '', name: '', arguments: '' }
    if (call.id) current.id = call.id
    if (call.function?.name) current.name += call.function.name
    if (typeof call.function?.arguments === 'string') current.arguments += call.function.arguments
    tools.set(index, current)
  }
  const consumed = consumeChatDelta(state, delta ?? {})
  return { state: consumed.state, reasoning: consumed.reasoningDelta, reply: consumed.replyDelta }
}
