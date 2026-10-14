import type { MealsGeminiResponse, MealsNoraRequest, MealsTranscribeResponse } from '@web-app-demo/contracts'

import type { AppEnv } from '../../../env'
import { MealsFailure } from '../domain/errors'
import {
  mealNumbersMissing,
  noraExtractPrompt,
  noraModelKind,
  noraRefineImages,
  noraRefinePrompt,
  noraRefineSource,
  normalizeGeneratedMealCard,
  portionLabelsNeedWeight,
  readMealCardJson,
  withCompositionNutrition,
  withEstimatedPortionWeights,
  withRolledUpNutrition,
} from '../domain/nora-meal'
import { MEAL_CARD_PROMPT } from './gemini-client'
import { encodeJpeg } from './sharp-meal-image'

type NoraEnv = Pick<
  AppEnv,
  'LLM_BASE_URL' | 'LLM_API_KEY' | 'LLM_TEXT_MODEL' | 'LLM_VISION_MODEL'
>

type Transcribe = (input: {
  audioBase64: string
  audioMime?: string
}) => Promise<MealsTranscribeResponse>

const BREVITY_RULE = [
  'Пиши коротко, иначе ответ оборвётся.',
  'excerpt — до 120 символов, каждый продукт один раз, без весов.',
  'composition — не больше 8 строк. Каждая строка — отдельный продукт.',
  'В каждом label обязательно ориентировочный вес: «Морковь ~40 г», «Чай ~200 мл», «Яйцо ~1 шт».',
  'Строка состава без веса — неполная. Не пропускай «~NN г» ни в одной строке.',
  'Только JSON, без markdown.',
].join('\n')

const WEIGHT_ASK = 'В composition у каждой строки свой ориентировочный вес в label. Оцени каждый продукт отдельно и не ставь всем одно и то же число. Форма строки: «Морковь ~40 г», «Курица ~150 г», «Чай ~200 мл».'

const NORA_REFINE_RECALC = [
  'Калорий и БЖУ в текущем составе нет. Посчитай их заново по весу каждой строки.',
  'Вес уже названной строки не меняй, пока пользователь не назвал другой.',
  'Добавленный продукт — новая строка со своим весом и своими КБЖУ. Калораж приёма от этого вырастет.',
  'Убранный продукт удали. Калораж приёма от этого уменьшится.',
  'Нельзя оставить прежний калораж, перераспределив его по строкам.',
  'nutrition — сумма kcal, protein, fat и carbs по строкам composition. Целые числа.',
].join('\n')

const TEXT_RULE = [
  'Фото нет. Разбери только текст пользователя.',
  'Не добавляй продукты, которых нет в описании.',
].join('\n')

const REQUEST_TIMEOUT_MS = 240_000
/** Long edge that keeps one qwen2.5vl frame near 256 tokens instead of the 1280-token cap. */
const NORA_VISION_EDGE = 448
const NORA_REFINE_MAX_TOKENS = 1024

let queue: Promise<unknown> = Promise.resolve()

function enqueue<T>(job: () => Promise<T>): Promise<T> {
  const run = queue.then(job, job)
  queue = run.then(
    () => undefined,
    () => undefined,
  )
  return run
}

function imagesOf(input: {
  images?: Array<{ base64: string; mime?: string }>
  imageBase64?: string
  imageMime?: string
}) {
  const images =
    Array.isArray(input.images) && input.images.length > 0
      ? input.images.filter((image) => image.base64)
      : input.imageBase64
        ? [{ base64: input.imageBase64, mime: input.imageMime }]
        : []
  return images.slice(0, 5)
}

function imageMime(mime: string | undefined) {
  const normalized = (mime || '').split(';')[0]?.trim().toLowerCase()
  if (
    normalized === 'image/jpeg'
    || normalized === 'image/png'
    || normalized === 'image/webp'
    || normalized === 'image/gif'
  ) {
    return normalized
  }
  return 'image/jpeg'
}

function messageContent(text: string, images: Array<{ base64: string; mime?: string }>) {
  if (!images.length) return text
  return [
    { type: 'text', text },
    ...images.map((image) => ({
      type: 'image_url',
      image_url: { url: `data:${imageMime(image.mime)};base64,${image.base64}` },
    })),
  ]
}

function completionText(payload: {
  choices?: Array<{ message?: { content?: unknown } }>
}) {
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

function unfinishedCardMessage(kind: 'text' | 'vision') {
  return kind === 'vision'
    ? 'Не удалось разобрать фото. Опишите приём текстом или попробуйте ещё снимок.'
    : 'Не удалось разобрать описание. Напишите продукты и примерный вес ещё раз.'
}

async function shrinkNoraVisionImage(image: { base64: string; mime?: string }) {
  try {
    const bytes = Buffer.from(image.base64, 'base64')
    if (bytes.length === 0) return image
    const jpeg = await encodeJpeg(bytes, { maxEdge: NORA_VISION_EDGE, quality: 72 })
    return { base64: jpeg.toString('base64'), mime: 'image/jpeg' }
  } catch {
    return image
  }
}

function noraHttpFailure(status: number, body: string) {
  if (/exceed_context_size|available context size/i.test(body)) {
    return new MealsFailure(
      'upstream',
      'Своя модель не вмещает это фото вместе с карточкой. Оставьте одно фото или выберите Gemini.',
    )
  }
  return new MealsFailure('upstream', `Модель ${status}: ${body.slice(0, 240)}`)
}

async function completeNora(
  env: NoraEnv,
  input: {
    kind: 'text' | 'vision'
    text: string
    images: Array<{ base64: string; mime?: string }>
    system?: string
    lineMacros?: boolean
    maxTokens?: number
  },
): Promise<MealsGeminiResponse> {
  let card: MealsGeminiResponse
  try {
    card = await requestNoraCard(env, input, 0.3)
  } catch (error) {
    if (!(error instanceof MealsFailure) || error.kind !== 'upstream') throw error
    if (/^Своя модель/.test(error.message)) throw error
    card = await requestNoraCard(
      env,
      {
        ...input,
        text: `${input.text}\n\nПредыдущий ответ оборвался. Верни один короткий JSON без повторов и без markdown. В каждом label укажи вес.`,
      },
      0.75,
    )
  }
  let meal = withRolledUpNutrition(card.meal)
  if (meal.composition.length === 0 || mealNumbersMissing(meal) || linesLackMacros(meal, input.lineMacros)) {
    card = await requestNoraCard(
      env,
      {
        ...input,
        text: `${input.text}\n\nВерни composition: каждый продукт отдельной строкой, с весом в label и КБЖУ строки. nutrition.kcal больше 0.`,
      },
      0.3,
    )
    meal = withRolledUpNutrition(card.meal)
  }
  if (portionLabelsNeedWeight(meal.composition)) {
    const rewritten = await rewritePortionWeights(env, meal)
    meal = withRolledUpNutrition({
      ...meal,
      composition: rewritten?.length ? rewritten : withEstimatedPortionWeights(meal.composition),
    })
  }
  if (meal.composition.length === 0 || mealNumbersMissing(meal) || linesLackMacros(meal, input.lineMacros)) {
    throw new MealsFailure('upstream', unfinishedCardMessage(input.kind))
  }
  return { ...card, meal }
}

function linesLackMacros(
  meal: { composition: Array<{ kcal: number; protein: number; fat: number; carbs: number }> },
  required: boolean | undefined,
) {
  if (!required || meal.composition.length === 0) return false
  return meal.composition.every((item) => item.kcal + item.protein + item.fat + item.carbs <= 0)
}

async function requestNoraCard(
  env: NoraEnv,
  input: {
    kind: 'text' | 'vision'
    text: string
    images: Array<{ base64: string; mime?: string }>
    system?: string
    maxTokens?: number
  },
  penalty: number,
): Promise<MealsGeminiResponse> {
  const apiKey = env.LLM_API_KEY
  const baseUrl = env.LLM_BASE_URL
  if (!apiKey || !baseUrl) {
    throw new MealsFailure(
      'misconfigured',
      'Своя модель пока не настроена. Выберите Gemini или попробуйте позже.',
    )
  }
  const model = input.kind === 'vision' ? env.LLM_VISION_MODEL : env.LLM_TEXT_MODEL
  const system = input.system
    ?? [
      MEAL_CARD_PROMPT,
      input.kind === 'text' ? TEXT_RULE : '',
    ].filter(Boolean).join('\n\n')
  const response = await fetch(`${baseUrl.replace(/\/$/, '')}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      max_tokens: input.maxTokens ?? 4096,
      // qwen2.5vl repeats the ingredient list on a real photo and hits the token cap with an unfinished JSON card.
      // A high penalty also drops the repeated «г» in composition lines, so the first pass stays mild.
      frequency_penalty: penalty,
      messages: [
        {
          role: 'system',
          content: `${system}\n\n${BREVITY_RULE}`,
        },
        { role: 'user', content: messageContent(input.text, input.images) },
      ],
    }),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  })
  const body = await response.text()
  if (response.status === 401 || response.status === 403) {
    throw new MealsFailure('upstream', 'Своя модель сейчас недоступна. Выберите Gemini или попробуйте позже.')
  }
  if (!response.ok) {
    throw noraHttpFailure(response.status, body)
  }
  let payload: {
    choices?: Array<{ finish_reason?: string; message?: { content?: unknown } }>
  }
  try {
    payload = JSON.parse(body) as typeof payload
  } catch {
    throw new MealsFailure('upstream', 'Модель вернула не JSON')
  }
  const text = completionText(payload).trim()
  const finish = payload.choices?.[0]?.finish_reason
  if (!text || finish === 'length') {
    throw new MealsFailure('upstream', unfinishedCardMessage(input.kind))
  }
  let card: unknown
  try {
    card = readMealCardJson(text)
  } catch {
    throw new MealsFailure('upstream', unfinishedCardMessage(input.kind))
  }
  return {
    ok: true,
    model,
    meal: normalizeGeneratedMealCard(card),
  }
}

async function rewritePortionWeights(
  env: NoraEnv,
  meal: MealsGeminiResponse['meal'],
): Promise<MealsGeminiResponse['meal']['composition'] | null> {
  const apiKey = env.LLM_API_KEY
  const baseUrl = env.LLM_BASE_URL
  if (!apiKey || !baseUrl) return null
  const lines = meal.composition
    .map((item) => `${item.label} | ${item.kcal} ккал, Б ${item.protein}, Ж ${item.fat}, У ${item.carbs}`)
    .join('\n')
  try {
    const response = await fetch(`${baseUrl.replace(/\/$/, '')}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: env.LLM_TEXT_MODEL,
        temperature: 0.2,
        max_tokens: 800,
        frequency_penalty: 0.15,
        messages: [
          {
            role: 'system',
            content: [
              'Верни только JSON {"composition":[...]} без markdown.',
              'В каждом label оставь продукт и допиши свой ориентировочный вес: «Рис ~180 г», «Курица ~110 г», «Чай ~200 мл».',
              'Поле grams — целое число того же веса. Калории и БЖУ строк не зануляй.',
              'Не ставь всем продуктам один и тот же вес.',
            ].join('\n'),
          },
          { role: 'user', content: `Блюдо: ${meal.title}\n${lines}` },
        ],
      }),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    })
    const rawBody = await response.text()
    if (!response.ok) return null
    const payload = JSON.parse(rawBody) as {
      choices?: Array<{ message?: { content?: unknown } }>
    }
    const text = completionText(payload).trim()
    if (!text) return null
    const parsed = readRewriteJson(text)
    const composition = normalizeGeneratedMealCard(
      parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : {},
    ).composition
    const weighed = composition.map((item, index) => {
      const previous = meal.composition[index]
      if (!previous) return item
      if (item.kcal > 0) return item
      return { ...item, kcal: previous.kcal, protein: previous.protein, fat: previous.fat, carbs: previous.carbs }
    })
    return weighed.length > 0 && !portionLabelsNeedWeight(weighed) ? weighed : null
  } catch {
    return null
  }
}

function readRewriteJson(raw: string): unknown {
  try {
    return readMealCardJson(raw)
  } catch {
    const start = raw.indexOf('[')
    const end = raw.lastIndexOf(']')
    if (start < 0 || end <= start) throw new Error('portion json missing')
    return { composition: JSON.parse(raw.slice(start, end + 1)) as unknown }
  }
}

export async function extractMealWithNora(
  env: NoraEnv,
  input: MealsNoraRequest,
  transcribe?: Transcribe,
): Promise<MealsGeminiResponse> {
  let note = input.note?.trim() ?? ''
  if (input.audioBase64) {
    if (!transcribe) {
      throw new MealsFailure('misconfigured', 'Голос для своей модели пока не расшифровывается.')
    }
    const spoken = await transcribe({
      audioBase64: input.audioBase64,
      audioMime: input.audioMime,
    })
    note = [note, spoken.text.trim()].filter(Boolean).join('\n')
  }
  const images = await Promise.all(imagesOf(input).map((image) => shrinkNoraVisionImage(image)))
  if (!images.length && !note) {
    throw new MealsFailure('bad_request', 'Нужно фото или описание приёма')
  }
  const kind = noraModelKind(images.length)
  const text = [
    kind === 'vision'
      ? `Фото: ${images.length}. Разбери каждый кадр в одну карточку.`
      : 'Описание приёма:',
    note,
    WEIGHT_ASK,
  ]
    .filter(Boolean)
    .join('\n')
  return enqueue(() =>
    completeNora(env, {
      kind,
      text,
      images: kind === 'vision' ? images : [],
      ...(kind === 'vision'
        ? { system: noraExtractPrompt(images.length), maxTokens: NORA_REFINE_MAX_TOKENS }
        : {}),
    }),
  )
}

export async function refineMealWithNora(
  env: NoraEnv,
  input: {
    card: Record<string, unknown>
    message: string
    coverBase64?: string
    coverMime?: string
    attachBase64?: string
    attachMime?: string
    attachImages?: Array<{ base64: string; mime?: string }>
    photoMode?: 'replace' | 'augment'
    thinking?: boolean
  },
): Promise<MealsGeminiResponse> {
  const attached = input.attachImages?.length
    ? input.attachImages
    : input.attachBase64
      ? [{ base64: input.attachBase64, mime: input.attachMime }]
      : []
  const selected = noraRefineImages({
    photoMode: input.photoMode,
    coverBase64: input.coverBase64,
    coverMime: input.coverMime,
    attached,
  })
  const images = await Promise.all(selected.map((image) => shrinkNoraVisionImage(image)))
  const kind = noraModelKind(images.length)
  const source = noraRefineSource(input.card, input.photoMode)
  const text = [
    input.message.trim() ? `Уточнение пользователя:\n${input.message.trim()}` : '',
    input.photoMode === 'replace'
      ? 'Старый состав не используй. Разбери только новые фото.'
      : `Состав сейчас, без калорий:\n${JSON.stringify(source)}`,
    NORA_REFINE_RECALC,
  ]
    .filter(Boolean)
    .join('\n\n')
  const card = await enqueue(() =>
    completeNora(env, {
      kind,
      text,
      images: kind === 'vision' ? images : [],
      lineMacros: true,
      maxTokens: NORA_REFINE_MAX_TOKENS,
      system: noraRefinePrompt(input.photoMode),
    }),
  )
  return { ...card, meal: withCompositionNutrition(card.meal) }
}
