import type { NoraModelChatMessage } from '@web-app-demo/contracts'

import type { AppEnv } from '../../../env'
import { attachedFileContext, directKnowledgeReply, schemeAnswer } from '../../knowledge'
import { MealsFailure } from '../domain/errors'
import { splitChatReasoning } from '../domain/chat-reasoning'
import { consumeChatDelta, emptyChatStream, type ChatStreamState } from '../domain/chat-stream'
import { askBitrix, createBitrixDocument, createBitrixMeeting, deleteBitrixMeeting, locateBitrixMeeting, placeBitrixFile, readBitrixClients, readBitrixOutcomes, readBitrixTree, takeBitrixFile } from './bitrix-client'
import {
  bitrixPrefetch,
  clientAsk,
  contentAsk,
  documentRequest,
  downloadAsk,
  fileTargetInThread,
  folderHint,
  meetingPlaceAsk,
  meetingPlaceReply,
  meetingPlaceTarget,
  meetingRequest,
  meetingsAsk,
  meetingToDelete,
  outcomeAsk,
  placeAsk,
  spreadsheetAsk,
  taskToDelete,
  treeAsk,
  treeDeep,
  NORA_BITRIX_TOOL,
  portalReached,
  readBitrixCall,
} from '../domain/bitrix'
import {
  answerNeedsVisionReading,
  buildNoraChatRequest,
  buildVisionGlance,
  followUpLines,
  followUpSubject,
  noteVisionForText,
  NORA_WEB_SEARCH_TOOL,
  calmVisionReading,
  seatVisionReading,
  screenTable,
  photoLookupQuery,
  readWebSearchCalls,
  turnForVision,
  VISION_FRAGMENT_SYSTEM,
  VISION_TABLE_SYSTEM,
  webSearchQuery,
  type NoraChatTurn,
  type NoraWebSearchCall,
} from '../domain/nora-chat'
import { DOCUMENT_COMPARE_SYSTEM, documentComparePrompt } from '../domain/document-compare'
import { SEARCH_UNAVAILABLE, searchOfficeWeb } from './nora-office'
import { chatVisionTiles } from './chat-image-tiles'

type NoraEnv = Pick<
  AppEnv,
  'LLM_BASE_URL' | 'LLM_API_KEY' | 'LLM_TEXT_MODEL' | 'LLM_VISION_MODEL' | 'LLM_SEARCH_URL' | 'BITRIX_WEBHOOK_URL'
>

type ChatMessage = {
  role: string
  content?: unknown
  tool_calls?: unknown
  tool_call_id?: string
}

const REQUEST_TIMEOUT_MS = 240_000

const REASONING_LIMIT = 20_000
const TEXT_MAX_TOKENS = 1024
const THINK_MAX_TOKENS = 8192
const TEXT_NUM_CTX = 32_768
const VISION_NUM_CTX = 16_384
const VISION_MAX_TOKENS = 2048

export type NoraChatEvent = {
  reasoning?: string
  reply?: string
  resetReply?: boolean
  searched?: boolean
  portal?: boolean
  file?: { name: string; mime: string; data: string }
}

async function prepareTurns(messages: readonly NoraModelChatMessage[]): Promise<NoraChatTurn[]> {
  return messages.map((message) => ({
    role: message.role,
    text: message.text,
    images: message.images,
  }))
}

export async function completeNoraChat(
  env: NoraEnv,
  messages: readonly NoraModelChatMessage[],
  search?: boolean,
  knowledge?: string,
  signal?: AbortSignal,
  think?: boolean,
  bitrix?: boolean,
) {
  let reply = ''
  let reasoning = ''
  let model = ''
  for await (const event of streamNoraChat(env, messages, search, knowledge, signal, think, bitrix)) {
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
async function* pacedReply(
  text: string,
  model: string,
  signal?: AbortSignal,
): AsyncGenerator<NoraChatEvent & { model?: string }> {
  const lines = text.split('\n')
  for (let index = 0; index < lines.length; index += 1) {
    if (signal?.aborted) return
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
      if (signal?.aborted) return
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
  bitrix?: boolean,
): AsyncGenerator<NoraChatEvent & { model?: string }> {
  const lastUser = [...messages].reverse().find((message) => message.role === 'user')
  const ready = directKnowledgeReply(knowledge ?? '')
  if (ready && !lastUser?.images?.length && search !== true && bitrix !== true) {
    yield* pacedReply(withSchemes(ready, knowledge), env.LLM_TEXT_MODEL, signal)
    return
  }
  const baseUrl = env.LLM_BASE_URL?.replace(/\/$/, '')
  if (!baseUrl || !env.LLM_API_KEY) {
    throw new MealsFailure(
      'misconfigured',
      'Своя модель пока не настроена. Выберите Gemini или попробуйте позже.',
    )
  }

  const bitrixMode = bitrix === true ? (env.BITRIX_WEBHOOK_URL ? 'ready' as const : 'missing' as const) : undefined
  const say = (text: string) => pacedReply(text, env.LLM_TEXT_MODEL, signal)
  if (bitrixMode === 'ready' && env.BITRIX_WEBHOOK_URL && downloadAsk(lastUser?.text ?? '')) {
    const query = fileTargetInThread(messages.map((message) => message.text))
    if (!query) {
      yield { reply: 'Назовите файл, который нужно скачать.' }
      return
    }
    const taken = await takeBitrixFile(env.BITRIX_WEBHOOK_URL, query, signal)
    yield { portal: true }
    if ('error' in taken) {
      yield { reply: taken.error }
      return
    }
    yield { file: { name: taken.name, mime: taken.mime, data: taken.bytes.toString('base64') } }
    yield { reply: `Файл «${taken.name}» приложен. Его можно скачать.` }
    return
  }
  if (bitrixMode === 'ready' && env.BITRIX_WEBHOOK_URL && placeAsk(lastUser?.text ?? '')) {
    const query = fileTargetInThread(messages.map((message) => message.text))
    if (!query) {
      yield { reply: 'Назовите файл, расположение которого нужно найти.' }
      return
    }
    const placed = await placeBitrixFile(env.BITRIX_WEBHOOK_URL, query, signal)
    yield { portal: true }
    yield { reply: placed }
    return
  }
  if (bitrixMode === 'ready' && env.BITRIX_WEBHOOK_URL && contentAsk(lastUser?.text ?? '')) {
    const query = fileTargetInThread(messages.map((message) => message.text))
    if (!query) {
      yield { reply: 'Назовите файл, который нужно прочитать.' }
      return
    }
    const text = await askBitrix(env.BITRIX_WEBHOOK_URL, { action: 'file', query }, signal)
    yield { portal: true }
    yield* say(text)
    return
  }
  const asked = lastUser?.text ?? ''
  const located = meetingPlaceTarget(messages)
  if (bitrixMode === 'ready' && env.BITRIX_WEBHOOK_URL && meetingPlaceAsk(asked)) {
    if (located) {
      const fresh = await locateBitrixMeeting(env.BITRIX_WEBHOOK_URL, located.id, signal)
      yield { portal: true }
      yield* say(fresh || meetingPlaceReply(messages))
      return
    }
    const listed = await askBitrix(env.BITRIX_WEBHOOK_URL, { action: 'events', query: 'planned' }, signal)
    yield { portal: true }
    yield* say(`Эти встречи в календаре Битрикс24. Откройте раздел «Календарь».\n${listed}`)
    return
  }
  const drop = meetingToDelete(messages)
  if (bitrixMode === 'ready' && env.BITRIX_WEBHOOK_URL && drop) {
    yield { portal: true }
    yield* say(drop.id ? await deleteBitrixMeeting(env.BITRIX_WEBHOOK_URL, drop.id, signal) : 'Назовите номер встречи.')
    return
  }
  if (bitrixMode === 'ready' && env.BITRIX_WEBHOOK_URL && meetingsAsk(asked)) {
    const query = /прошл|уже |прошед/i.test(asked) ? 'past' : 'planned'
    const text = await askBitrix(env.BITRIX_WEBHOOK_URL, { action: 'events', query }, signal)
    yield { portal: true }
    yield* say(text)
    return
  }
  const meeting = meetingRequest(asked)
  if (bitrixMode === 'ready' && env.BITRIX_WEBHOOK_URL && meeting) {
    const text = await createBitrixMeeting(env.BITRIX_WEBHOOK_URL, meeting, signal)
    yield { portal: true }
    yield* say(text)
    return
  }
  const sheetFile = spreadsheetAsk(asked)
  if (bitrixMode === 'ready' && env.BITRIX_WEBHOOK_URL && sheetFile) {
    const text = await askBitrix(env.BITRIX_WEBHOOK_URL, { action: 'file', query: sheetFile }, signal)
    yield { portal: true }
    const opened = text.match(/^Файл «([^»]*)»:\n([\s\S]*)$/)
    const ready = opened ? directKnowledgeReply(attachedFileContext(asked, opened[1] || sheetFile, opened[2] ?? '')) : ''
    yield* say(ready || text)
    return
  }
  if (bitrixMode === 'ready' && env.BITRIX_WEBHOOK_URL && clientAsk(asked)) {
    const text = await readBitrixClients(env.BITRIX_WEBHOOK_URL, signal)
    yield { portal: true }
    yield* say(text)
    return
  }
  if (bitrixMode === 'ready' && env.BITRIX_WEBHOOK_URL && outcomeAsk(asked)) {
    const text = await readBitrixOutcomes(env.BITRIX_WEBHOOK_URL, signal)
    yield { portal: true }
    yield* say(text)
    return
  }
  const removal = taskToDelete(asked)
  if (bitrixMode === 'ready' && env.BITRIX_WEBHOOK_URL && removal) {
    const text = await askBitrix(env.BITRIX_WEBHOOK_URL, { action: 'delete_task', title: removal.title, taskId: removal.taskId }, signal)
    yield { portal: true }
    yield* say(text)
    return
  }
  const document = documentRequest(asked)
  if (bitrixMode === 'ready' && env.BITRIX_WEBHOOK_URL && document) {
    const text = await createBitrixDocument(env.BITRIX_WEBHOOK_URL, document, signal)
    yield { portal: true }
    yield* say(text)
    return
  }
  const deep = treeDeep(asked)
  const folder = folderHint(asked)
  if (bitrixMode === 'ready' && env.BITRIX_WEBHOOK_URL && folder) {
    const text = await askBitrix(env.BITRIX_WEBHOOK_URL, { action: 'files', query: folder, deep }, signal)
    yield { portal: true }
    yield { reply: text }
    return
  }
  if (bitrixMode === 'ready' && env.BITRIX_WEBHOOK_URL && (treeAsk(asked) || deep)) {
    const text = await readBitrixTree(env.BITRIX_WEBHOOK_URL, signal, deep)
    yield { portal: true }
    yield { reply: text }
    return
  }
  const models = {
    text: env.LLM_TEXT_MODEL,
    vision: env.LLM_VISION_MODEL,
    search: search === true && Boolean(env.LLM_SEARCH_URL),
    bitrix: bitrixMode,
  }
  let turns = await prepareTurns(messages)
  let photoSubject = ''
  if (answerNeedsVisionReading(turns, models, knowledge)) {
    const note = await readVisionNote(env, turns, signal).catch(() => '')
    const table = /таблиц/i.test(lastUser?.text ?? '') ? screenTable(note) : ''
    if (table) {
      yield* pacedReply(table, env.LLM_TEXT_MODEL, signal)
      return
    }
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
  if (bitrixMode === 'ready' && env.BITRIX_WEBHOOK_URL) {
    const lines: string[] = []
    for (const call of bitrixPrefetch(lastUser?.text ?? '')) {
      const text = await askBitrix(env.BITRIX_WEBHOOK_URL, call, signal).catch((error: unknown) => {
        if (signal?.aborted || (error instanceof Error && error.name === 'AbortError')) throw error
        return 'Битрикс сейчас не отвечает.'
      })
      lines.push(text)
    }
    if (lines.length > 0) {
      const system = thread.find((message) => message.role === 'system')
      if (system && typeof system.content === 'string') {
        system.content += `\n\nДанные Битрикса:\n${lines.join('\n\n')}`
      }
      if (lines.some(portalReached)) yield { portal: true }
    }
  }
  const chatTools = [
    ...(models.search ? [NORA_WEB_SEARCH_TOOL] : []),
    ...(bitrixMode === 'ready' ? [NORA_BITRIX_TOOL] : []),
  ]
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
          ? (turns.at(-1)!.text.length > 1800 ? 4096 : 2048)
          : TEXT_MAX_TOKENS
  let reply = ''
  for (let round = 0; round < 3; round += 1) {
    const allowTools = request.tools && chatTools.length > 0 && round < 2
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
          ...(allowTools ? { tools: chatTools } : {}),
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
      if (call.name === 'bitrix') {
        const parsed = readBitrixCall(call)
        const content = !parsed
          ? 'Этот инструмент недоступен.'
          : 'error' in parsed
            ? parsed.error
            : env.BITRIX_WEBHOOK_URL
              ? await askBitrix(env.BITRIX_WEBHOOK_URL, parsed, signal).catch((error: unknown) => {
                  if (signal?.aborted || (error instanceof Error && error.name === 'AbortError')) throw error
                  return 'Битрикс сейчас не отвечает.'
                })
              : 'Портал не подключён.'
        if (portalReached(content)) yield { portal: true }
        thread.push({ role: 'tool', tool_call_id: call.id, content })
        continue
      }
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
  const figures = schemeAnswer(knowledge ?? '')
    .split('\n\n')
    .filter((line) => line && !reply.includes(line))
  if (figures.length > 0 && !signal?.aborted) yield { reply: `\n\n${figures.join('\n\n')}` }
  yield { model: request.model }
}

function withSchemes(answer: string, knowledge?: string) {
  const figures = schemeAnswer(knowledge ?? '')
    .split('\n\n')
    .filter((line) => line && !answer.includes(line))
  if (figures.length === 0) return answer
  return `${answer}\n\n${figures.join('\n\n')}`
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
  const subject = followUpSubject(messages)
  const topic = subject.at(-1)?.text ?? ''
  const transcript = subject
    .map((message) => `${message.role === 'user' ? 'Пользователь' : 'Nora'}: ${message.text.trim().slice(0, 700)}`)
    .join('\n')
  if (!transcript) return { reply: ' ', model: env.LLM_TEXT_MODEL }
  const response = await postOllamaChat(baseUrl, env.LLM_API_KEY, {
    model: env.LLM_TEXT_MODEL,
    messages: [
      {
        role: 'system',
        content:
          'Тема — только последний ответ Nora ниже. Напиши ровно 3 короткие реплики, которые человек нажмёт и отправит Норе следом. Это вопросы и просьбы к Норе по этому ответу, например «Расскажи подробнее» или «Какой состав». Не спрашивай имя человека, что он хочет обсудить, и не предлагай ему рассказать о себе. Не пиши от лица Норы. Не возвращайся к теме, которой нет в этом ответе. Не предлагай настройки, профиль или возможности приложения. Без нумерации и кавычек.',
      },
      { role: 'user', content: transcript },
    ],
    stream: true,
    think: false,
    options: { num_ctx: 4096, num_predict: 180, temperature: 0.3 },
  }, signal)
  const lines = followUpLines(await collectReply(response), topic)
  return { reply: lines.join('\n') || ' ', model: env.LLM_TEXT_MODEL }
}

export async function completeDocumentCompare(
  env: NoraEnv,
  input: { leftName: string; leftText: string; rightName: string; rightText: string },
  signal?: AbortSignal,
) {
  const baseUrl = env.LLM_BASE_URL?.replace(/\/$/, '')
  if (!baseUrl || !env.LLM_API_KEY) {
    throw new MealsFailure('misconfigured', 'Своя модель пока не настроена. Выберите Gemini или попробуйте позже.')
  }
  const response = await postOllamaChat(baseUrl, env.LLM_API_KEY, {
    model: env.LLM_TEXT_MODEL,
    messages: [
      { role: 'system', content: DOCUMENT_COMPARE_SYSTEM },
      { role: 'user', content: documentComparePrompt(input) },
    ],
    stream: true,
    think: false,
    options: { num_ctx: 16_384, num_predict: 800, temperature: 0.2 },
  }, signal)
  const reply = (await collectReply(response)).trim()
  if (!reply) throw new MealsFailure('upstream', 'Модель ничего не ответила. Попробуйте ещё раз.')
  return reply
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

async function postVision(
  env: NoraEnv,
  messages: ChatMessage[],
  predict: number,
  signal?: AbortSignal,
) {
  const baseUrl = env.LLM_BASE_URL?.replace(/\/$/, '')
  if (!baseUrl || !env.LLM_API_KEY) return ''
  const response = await postOllamaChat(baseUrl, env.LLM_API_KEY, {
    model: env.LLM_VISION_MODEL,
    messages: nativeVisionMessages(messages),
    stream: true,
    think: false,
    options: { num_ctx: VISION_NUM_CTX, num_predict: predict, temperature: 0.2 },
  }, signal)
  return (await collectReply(response)).trim()
}

async function readVisionNote(env: NoraEnv, turns: readonly NoraChatTurn[], signal?: AbortSignal) {
  const source = turnForVision(turns)
  const images = source?.images?.filter((image) => image.base64.trim()) ?? []
  const last = source
  if (!last || images.length === 0) return ''
  const notes: string[] = []
  for (const image of images) {
    let tiles: Buffer[]
    try {
      tiles = await chatVisionTiles(Buffer.from(image.base64, 'base64'))
    } catch {
      tiles = []
    }
    const frames = tiles.length > 0 ? tiles : [Buffer.from(image.base64, 'base64')]
    if (frames.length === 1) {
      const glance = buildVisionGlance(
        [{ role: 'user', text: last.text, images: [{ base64: frames[0]!.toString('base64'), mime: 'image/jpeg' }] }],
        { text: env.LLM_TEXT_MODEL, vision: env.LLM_VISION_MODEL },
      )
      const table = /таблиц/i.test(last.text)
      const messages = table
        ? [{ role: 'system' as const, content: VISION_TABLE_SYSTEM }, glance.messages[1]!]
        : glance.messages
      const predict = table ? 2048 : 512
      notes.push(seatVisionReading(calmVisionReading(await postVision(env, messages, predict, signal))))
      continue
    }
    const parts: string[] = []
    for (let index = 0; index < frames.length; index += 1) {
      const ask = [
        last.text.trim(),
        `Фрагмент ${index + 1} из ${frames.length} одного длинного изображения. Строки идут сверху вниз, столбцы те же.`,
      ]
        .filter(Boolean)
        .join('\n\n')
      const part = await postVision(
        env,
        [
          { role: 'system', content: VISION_FRAGMENT_SYSTEM },
          {
            role: 'user',
            content: [
              { type: 'text', text: ask },
              { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${frames[index]!.toString('base64')}` } },
            ],
          },
        ],
        1024,
        signal,
      )
      if (part && part !== 'пусто' && part !== 'не разобрать') parts.push(seatVisionReading(calmVisionReading(part)))
    }
    if (parts.length > 0) notes.push(parts.filter(Boolean).join('\n'))
  }
  return notes.filter(Boolean).join('\n\n')
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
