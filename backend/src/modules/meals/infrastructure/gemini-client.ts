import type { MealsGeminiRequest, MealsGeminiResponse } from '@web-app-demo/contracts'
import { normalizeMicronutrients } from '@web-app-demo/contracts'
import type { AppEnv } from '../../../env'
import { MealsFailure } from '../domain/errors'
import { generationLedgerTokens, usageLedgerFromGemini } from '../domain/generation-spend'
import { mapGeminiComposition } from '../domain/mapping'

export const MEAL_ASSUMPTION_RULES = [
  '- assumptions — 2–4 коротких факта: способ приготовления, масло/соус, оценка веса. Одна мысль на строку, без рецепта и без длинных пояснений.',
  '- Не пиши, что продукт «добавлен к приёму» — это уже composition и комментарий.',
  '- Не повторяй названия и веса из composition.',
  '- Плохо: «К приему пищи добавлена шаурма с курицей, весом около 300 г.»; «Запеканка приготовлена с использованием куриного фарша, яиц и помидоров.»',
  '- Хорошо: «Брокколи на пару», «Масло на запекание», «Вес по фото».',
]

export const MEAL_COMPOSITION_LINE_RULES = [
  '- composition — полный разбор тарелки: каждый отдельный продукт своей строкой, с ориентировочным весом в label и КБЖУ этой позиции.',
  '- Сумма kcal/protein/fat/carbs по composition должна сходиться с nutrition (допускается ±1 из-за округления).',
  '- Не склеивай разные продукты в одну позицию через «с» или «и», даже если они запечены, перемешаны или лежат вместе.',
  '- Плохо: «Запеченная белая рыба с морковью, 150г». Хорошо: отдельные строки «Запеченная белая рыба ~150 г», «Морковь ~40 г», «Брокколи ~150 г», «Красный перец ~150 г».',
  '- Топпинг, гарнир, соус и масло — отдельные строки, если видны или названы. Готовый продукт (котлета, хлеб, йогурт) не разбирай на рецепт.',
]

export const MEAL_REFINE_PHOTO_RULES = [
  'Дополнительное фото ДОПОЛНЯЕТ текущую карточку, а не заменяет её.',
  'Если на фото еда — добавь эти продукты к текущему composition. Существующие позиции сохрани.',
  'Если на фото этикетка или таблица КБЖУ — уточни веса уже названных позиций, не удаляя остальные.',
  'Не переписывай состав только по новому кадру и не удаляй продукты текущей карточки, если пользователь явно не попросил убрать их.',
]

export const MEAL_REPLACE_PHOTO_RULES = [
  'Новые фото ЗАМЕНЯЮТ текущую карточку и её снимок. Старый состав не сохраняй.',
  'Верни composition только по новым фото. Не переноси продукты, которых нет на этих снимках.',
  'Если фото несколько — разбери каждый кадр и собери одну карточку нового приёма.',
  'Если пользователь ещё написал уточнение — примени его к новому составу, а не к старой карточке.',
]

export const MEAL_MULTI_PHOTO_RULES = [
  'Если фото несколько, определи роль каждого кадра:',
  '— разные блюда/продукты одного приёма: разбери ВСЕ кадры и объедини в одну карточку на весь приём;',
  '— то же блюдо с другого ракурса: не дублируй продукты, уточни состав и вес;',
  '— этикетка, состав или таблица КБЖУ: используй для точности весов и nutrition.',
  'Несколько фото еды — это несколько блюд или частей приёма, а не «лишние этикетки». Не игнорируй кадр только потому, что на нём нет упаковки.',
]

const PROMPT = [
  'Ты нутрициолог-ассистент дневника питания Nutrition Nora.',
  'На входе: одно или несколько фото еды/напитка и (опционально) пояснение текстом и/или голосом.',
  ...MEAL_MULTI_PHOTO_RULES,
  'Верни ТОЛЬКО валидный JSON без markdown.',
  '',
  'КРИТИЧЕСКИ ВАЖНО — приоритет источников для состава (composition / excerpt / nutrition):',
  '1) ГОЛОС и/или ТЕКСТ пользователя — ГЛАВНЫЙ источник истины.',
  '2) Если пользователь описал состав ЧАСТИЧНО — основа = слова пользователя; с фото добавляй только недостающее.',
  '3) Если пользователь НЕ дал состава — оценивай по фото.',
  '4) Этикетка на доп. фото — для точности весов и nutrition.',
  '',
  'Схема:',
  '{',
  '  "title": string,',
  '  "excerpt": string,',
  '  "body": "",',
  '  "category": "Птица" | "Рыба" | "Мясо" | "Завтрак" | "Перекус" | "Каша",',
  '  "mealType": "Завтрак" | "Обед" | "Ужин" | "Перекус",',
  '  "tags": string[],',
  '  "nutrition": { "kcal": number, "protein": number, "fat": number, "carbs": number },',
  '  "clientNoteStructured": string,',
  '  "composition": [{ "label": string, "kcal": number, "protein": number, "fat": number, "carbs": number }],',
  '  "assumptions": string[],',
  '  "micronutrients": [',
  '    { "key": "sodium", "amount": number },',
  '    { "key": "potassium", "amount": number },',
  '    { "key": "vitaminC", "amount": number },',
  '    { "key": "vitaminD", "amount": number },',
  '    { "key": "vitaminA", "amount": number },',
  '    { "key": "iron", "amount": number },',
  '    { "key": "zinc", "amount": number },',
  '    { "key": "iodine", "amount": number },',
  '    { "key": "selenium", "amount": number },',
  '    { "key": "calcium", "amount": number },',
  '    { "key": "magnesium", "amount": number },',
  '    { "key": "phosphorus", "amount": number },',
  '    { "key": "biotin", "amount": number },',
  '    { "key": "vitaminK", "amount": number },',
  '    { "key": "vitaminE", "amount": number },',
  '    { "key": "folate", "amount": number },',
  '    { "key": "vitaminB6", "amount": number },',
  '    { "key": "vitaminB12", "amount": number }',
  '  ]',
  '}',
  '',
  'Правила:',
  '- title — короткое название блюда.',
  '- excerpt — перечисление продуктов через запятую без КБЖУ и весов.',
  ...MEAL_COMPOSITION_LINE_RULES,
  '- micronutrients — оценка на весь приём: Натрий, Калий, Витамин C, Витамин D, Витамин A, Железо, Цинк, Йод, Селен, Кальций, Магний, Фосфор, Биотин, Витамин K, Витамин E, Фолиевая кислота, Витамин B6, Витамин B12.',
  '- Единицы: sodium/potassium/vitaminC/iron/zinc/calcium/magnesium/phosphorus/vitaminE/vitaminB6 — мг; остальные — мкг. Не пропускай ключи; если неизвестно — 0.',
  ...MEAL_ASSUMPTION_RULES,
  '- clientNoteStructured — 1–3 предложения о приёме в прошедшем времени («пользователь просил», «пользователь уточнил», не «просит/уточняет»). Если упоминаешь автора, пиши «пользователь», никогда «клиент».',
  '- body — всегда пустая строка.',
  '- Пиши по-русски.',
].join('\n')
export { PROMPT as MEAL_CARD_PROMPT }
const REFINE_PROMPT = [
  'Ты нутрициолог-ассистент. Пользователь уточняет уже созданную карточку приёма пищи.',
  'На входе: текущая карточка (JSON), сообщение пользователя и/или дополнительное фото',
  '(еда, этикетка или таблица КБЖУ). Может быть также исходное фото блюда.',
  'Верни ТОЛЬКО валидный JSON той же схемы карточки (обновлённый целиком).',
  '',
  'Приоритет при уточнении:',
  '1) Текст/голос пользователя в сообщении — главный источник; обновляй composition/nutrition по нему.',
  '2) Дополнительное фото — дополняет текущую карточку, а не заменяет её.',
  '3) При конфликте слов пользователя и визуальной оценки — слова пользователя побеждают.',
  '',
  ...MEAL_REFINE_PHOTO_RULES,
  'Учти уточнение: другой вес, продукты вне кадра, состав с этикетки, способ приготовления и т.п.',
  'Пересчитай nutrition (КБЖУ) под объединённый состав. Целые числа.',
  'Обнови composition по правилам полного разбора тарелки. Если в текущей карточке продукты склеены в одну строку — раздели их.',
  ...MEAL_COMPOSITION_LINE_RULES,
  'Пересчитай micronutrients на весь обновлённый приём (те же 18 ключей и единицы, что в схеме).',
  ...MEAL_ASSUMPTION_RULES,
  'body всегда "".',
  'excerpt — короткое перечисление продуктов без весов и КБЖУ.',
  'clientNoteStructured — дополни/обнови комментарий с учётом нового сообщения (1–3 предложения) в прошедшем времени («пользователь просил», «пользователь уточнил», не «просит/уточняет»). Если упоминаешь автора, пиши «пользователь», никогда «клиент».',
  'title обнови только если состав существенно изменился.',
  'НЕ копируй сообщение пользователя в assumptions — это поле комментария (clientNoteStructured).',
  'Не повторяй смысл одними разными формулировками.',
  'Пиши по-русски, лаконично.',
  'Схема:',
  '{',
  '  "title": string,',
  '  "excerpt": string,',
  '  "body": "",',
  '  "category": "Птица" | "Рыба" | "Мясо" | "Завтрак" | "Перекус" | "Каша",',
  '  "mealType": "Завтрак" | "Обед" | "Ужин" | "Перекус",',
  '  "tags": string[],',
  '  "nutrition": { "kcal": number, "protein": number, "fat": number, "carbs": number },',
  '  "clientNoteStructured": string,',
  '  "composition": [{ "label": string, "kcal": number, "protein": number, "fat": number, "carbs": number }],',
  '  "assumptions": string[],',
  '  "micronutrients": [',
  '    { "key": "sodium", "amount": number },',
  '    { "key": "potassium", "amount": number },',
  '    { "key": "vitaminC", "amount": number },',
  '    { "key": "vitaminD", "amount": number },',
  '    { "key": "vitaminA", "amount": number },',
  '    { "key": "iron", "amount": number },',
  '    { "key": "zinc", "amount": number },',
  '    { "key": "iodine", "amount": number },',
  '    { "key": "selenium", "amount": number },',
  '    { "key": "calcium", "amount": number },',
  '    { "key": "magnesium", "amount": number },',
  '    { "key": "phosphorus", "amount": number },',
  '    { "key": "biotin", "amount": number },',
  '    { "key": "vitaminK", "amount": number },',
  '    { "key": "vitaminE", "amount": number },',
  '    { "key": "folate", "amount": number },',
  '    { "key": "vitaminB6", "amount": number },',
  '    { "key": "vitaminB12", "amount": number }',
  '  ]',
  '}',
].join('\n')

const REFINE_KEEP_LINES =
  'Строки, которые пользователь не назвал, верни без изменений: тот же label и те же kcal, protein, fat, carbs. Не меняй их вес и пропорции. Добавь, убавь или убери только названное. Склеенные продукты не разделяй, пока об этом не попросили.'

export function refineSystemPrompt(photoMode?: 'replace' | 'augment') {
  const prompt =
    photoMode === 'replace'
      ? REFINE_PROMPT
      : REFINE_PROMPT.replace(
          'Обнови composition по правилам полного разбора тарелки. Если в текущей карточке продукты склеены в одну строку — раздели их.',
          REFINE_KEEP_LINES,
        )
  if (photoMode !== 'replace') return prompt
  return prompt.replace(
    '2) Дополнительное фото — дополняет текущую карточку, а не заменяет её.',
    '2) Новые фото заменяют текущую карточку. Состав бери только с новых снимков.',
  )
    .replace(MEAL_REFINE_PHOTO_RULES.join('\n'), MEAL_REPLACE_PHOTO_RULES.join('\n'))
    .replace(
      'Пересчитай nutrition (КБЖУ) под объединённый состав. Целые числа.',
      'Пересчитай nutrition (КБЖУ) по новому составу. Целые числа.',
    )
}

type GeminiEnv = Pick<
  AppEnv,
  | 'GEMINI_API_KEY'
  | 'GEMINI_MODEL'
  | 'GEMINI_MEAL_MODEL'
  | 'GEMINI_API_HOST'
  | 'GEMINI_API_PORT'
  | 'GEMINI_PROXY_TOKEN'
>

const GOOGLE_GEMINI_HOST = 'generativelanguage.googleapis.com'

export function isTransientGeminiNetworkError(error: unknown) {
  const code =
    error && typeof error === 'object' && 'code' in error
      ? String((error as { code?: unknown }).code)
      : ''
  const message = error instanceof Error ? error.message : String(error)
  return /ECONNRESET|ECONNREFUSED|ETIMEDOUT|ENOTFOUND|UND_ERR_SOCKET|socket connection was closed|fetch failed/i.test(
    `${code} ${message}`,
  )
}

function isGoogleGeminiHost(host: string) {
  return host === GOOGLE_GEMINI_HOST || host.endsWith('.googleapis.com')
}

function geminiRequestHeaders(env: GeminiEnv, host: string) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }
  if (env.GEMINI_PROXY_TOKEN && !isGoogleGeminiHost(host)) {
    headers.Authorization = `Bearer ${env.GEMINI_PROXY_TOKEN}`
    headers['X-Gemini-Proxy-Token'] = env.GEMINI_PROXY_TOKEN
  }
  return headers
}

async function requestGeminiGenerateContent(
  env: GeminiEnv,
  input: { path: string; body: string; timeoutMs: number },
) {
  const targets = [{ host: env.GEMINI_API_HOST, port: env.GEMINI_API_PORT }]
  if (!isGoogleGeminiHost(env.GEMINI_API_HOST)) {
    targets.push({ host: GOOGLE_GEMINI_HOST, port: 443 })
  }

  for (const [targetIndex, target] of targets.entries()) {
    const url = `https://${target.host}:${target.port}${input.path}`
    const headers = geminiRequestHeaders(env, target.host)
    const attempts = targetIndex === 0 ? 3 : 2
    for (let attempt = 0; attempt < attempts; attempt += 1) {
      try {
        return await fetch(url, {
          method: 'POST',
          headers,
          body: input.body,
          signal: AbortSignal.timeout(input.timeoutMs),
        })
      } catch (error) {
        const retry =
          isTransientGeminiNetworkError(error) && attempt < attempts - 1
        if (!retry) break
        await new Promise((resolve) => setTimeout(resolve, 400 * (attempt + 1)))
      }
    }
  }

  throw new MealsFailure('upstream', 'Gemini network error')
}

/** Flash thinks unless the budget is 0. Omitting the field keeps the current default. */
export function geminiGenerationConfig(options: {
  temperature: number
  json?: boolean
  thinking?: boolean
}): Record<string, unknown> {
  return {
    temperature: options.temperature,
    ...(options.json ? { responseMimeType: 'application/json' } : {}),
    ...(options.thinking === false ? { thinkingConfig: { thinkingBudget: 0 } } : {}),
  }
}

export async function extractMealWithGemini(
  env: GeminiEnv,
  input: MealsGeminiRequest,
): Promise<MealsGeminiResponse> {
  const images =
    Array.isArray(input.images) && input.images.length > 0
      ? input.images.filter((image) => image.base64)
      : input.imageBase64
        ? [{ base64: input.imageBase64, mime: input.imageMime ?? 'image/jpeg' }]
        : []
  if (images.length === 0) {
    throw new MealsFailure('upstream', 'images or imageBase64 required')
  }
  const parts: Array<Record<string, unknown>> = [{ text: PROMPT }]
  images.forEach((image, index) => {
    parts.push({ text: `Фото ${index + 1} из ${images.length}:` })
    parts.push({
      inline_data: {
        mime_type: normalizeImageMime(image.mime),
        data: image.base64,
      },
    })
  })
  if (input.note?.trim()) {
    parts.push({ text: `Текст пользователя:\n${input.note.trim()}` })
  }
  if (input.audioBase64) {
    parts.push({ text: 'Голосовое сообщение пользователя:' })
    parts.push({
      inline_data: {
        mime_type: normalizeAudioMime(input.audioMime),
        data: input.audioBase64,
      },
    })
  }
  return generateMealCard(env, parts, input.thinking)
}

export async function refineMealWithGemini(
  env: GeminiEnv,
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
  const parts: Array<Record<string, unknown>> = [
    { text: refineSystemPrompt(input.photoMode) },
    { text: `Текущая карточка:\n${JSON.stringify(input.card)}` },
  ]
  if (input.coverBase64 && input.photoMode !== 'replace') {
    parts.push({ text: 'Исходное фото блюда:' })
    parts.push({
      inline_data: {
        mime_type: normalizeImageMime(input.coverMime),
        data: input.coverBase64,
      },
    })
  }
  const attachImages = input.attachImages?.length
    ? input.attachImages
    : input.attachBase64
      ? [{ base64: input.attachBase64, mime: input.attachMime }]
      : []
  if (attachImages.length > 0) {
    parts.push({
      text:
        input.photoMode === 'replace'
          ? 'Новые фото пользователя. Они заменяют текущий приём. Верни карточку только по этим кадрам, без продуктов со старой карточки.'
          : 'Дополнительные фото пользователя. Если на кадре еда — добавь эти продукты к текущему составу. Если этикетка/КБЖУ — уточни веса, не удаляя остальные позиции. Учти каждый кадр.',
    })
    for (const image of attachImages) {
      parts.push({
        inline_data: {
          mime_type: normalizeImageMime(image.mime),
          data: image.base64,
        },
      })
    }
  }
  const message = input.message.trim()
  if (message) {
    parts.push({
      text: [
        '=== ПРИОРИТЕТ: УТОЧНЕНИЕ КЛИЕНТА (SOURCE OF TRUTH) ===',
        message,
      ].join('\n'),
    })
  } else if (attachImages.length > 0) {
    parts.push({
      text:
        input.photoMode === 'replace'
          ? 'Пользователь приложил фото без текста. Замени текущий приём тем, что на фото. Не сохраняй старые продукты.'
          : 'Пользователь приложил фото без текста. Добавь к текущему составу продукты с фото, существующие позиции сохрани, пересчитай КБЖУ на объединённый приём.',
    })
  }
  return generateMealCard(env, parts, input.thinking)
}

/**
 * Voice is a transcript, not a meal draft. Gemini 3.5 Flash-Lite rewrites unclear
 * speech into a diary sentence. The speech model returns audioTranscription.text.
 */
export const GEMINI_VOICE_MODEL = 'gemini-3.5-transcribe'

const TRANSCRIBE_PROMPT = [
  'Транскрибируй голосовое сообщение пользователя дневника питания.',
  'Верни ТОЛЬКО распознанный текст на русском, без кавычек, без markdown и без пояснений.',
  'Сохрани смысл, пунктуацию и числительные.',
  'Если речи нет или она неразборчива — верни пустую строку.',
].join('\n')

export function parseGeminiCandidateText(envelope: string) {
  let payload: {
    candidates?: Array<{
      content?: {
        parts?: Array<{ text?: string; audioTranscription?: { text?: string } }>
      }
    }>
  }
  try {
    payload = JSON.parse(envelope) as typeof payload
  } catch {
    throw new MealsFailure('upstream', 'Gemini returned non-JSON envelope')
  }
  const parts = payload.candidates?.[0]?.content?.parts ?? []
  const spoken = parts
    .map((part) => part.audioTranscription?.text ?? '')
    .filter((line) => line.trim().length > 0)
  const raw = (spoken.length > 0 ? spoken : parts.map((part) => part.text ?? '')).join('\n')
  return raw
    .trim()
    .replace(/^```(?:json|text)?\s*/i, '')
    .replace(/```$/i, '')
    .replace(/^["«]|["»]$/g, '')
    .trim()
}

export async function transcribeAudioWithGemini(
  env: GeminiEnv,
  input: { audioBase64: string; audioMime?: string; thinking?: boolean },
): Promise<{ ok: true; text: string; model: string }> {
  const apiKey = env.GEMINI_API_KEY
  if (!apiKey) {
    throw new MealsFailure('misconfigured', 'GEMINI_API_KEY is not configured')
  }
  if (!input.audioBase64) {
    throw new MealsFailure('bad_request', 'audioBase64 required')
  }
  const audioBytes = Buffer.from(input.audioBase64, 'base64')
  if (!audioBytes.length || audioBytes.length > 4 * 1024 * 1024) {
    throw new MealsFailure('bad_request', 'Voice recording must be between 1 byte and 4 MB')
  }
  // The diary switch does not turn a transcript draft back on.
  const model = GEMINI_VOICE_MODEL
  const body = JSON.stringify({
    contents: [
      {
        role: 'user',
        parts: [
          { text: TRANSCRIBE_PROMPT },
          {
            inline_data: {
              mime_type: normalizeAudioMime(input.audioMime),
              data: input.audioBase64,
            },
          },
        ],
      },
    ],
    generationConfig: {
      audioTranscriptionConfig: {
        languageCodes: ['ru-RU'],
        mode: 'VERBATIM',
      },
    },
  })
  const path = `/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`
  const response = await requestGeminiGenerateContent(env, {
    path,
    body,
    timeoutMs: 120_000,
  })
  const text = await response.text()
  if (!response.ok) {
    throw new MealsFailure('upstream', `Gemini ${response.status}: ${text.slice(0, 400)}`)
  }
  let metadata: unknown
  try {
    metadata = (JSON.parse(text) as { usageMetadata?: unknown }).usageMetadata
  } catch {
    metadata = undefined
  }
  const usage = usageLedgerFromGemini(model, metadata, { audio: true })
  return {
    ok: true,
    model,
    text: parseGeminiCandidateText(text),
    ...(generationLedgerTokens(usage) > 0 ? { usage } : {}),
  }
}

async function generateMealCard(
  env: GeminiEnv,
  parts: Array<Record<string, unknown>>,
  thinking?: boolean,
): Promise<MealsGeminiResponse> {
  const apiKey = env.GEMINI_API_KEY
  if (!apiKey) {
    throw new MealsFailure('misconfigured', 'GEMINI_API_KEY is not configured')
  }
  const model = env.GEMINI_MEAL_MODEL ?? env.GEMINI_MODEL
  const body = JSON.stringify({
    contents: [{ role: 'user', parts }],
    generationConfig: geminiGenerationConfig({
      temperature: 0.2,
      json: true,
      thinking,
    }),
  })
  const path = `/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`
  const response = await requestGeminiGenerateContent(env, {
    path,
    body,
    timeoutMs: 300_000,
  })
  const text = await response.text()
  if (!response.ok) {
    throw new MealsFailure('upstream', `Gemini ${response.status}: ${text.slice(0, 400)}`)
  }
  let payload: {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>
    usageMetadata?: unknown
  }
  try {
    payload = JSON.parse(text) as typeof payload
  } catch {
    throw new MealsFailure('upstream', 'Gemini returned non-JSON envelope')
  }
  const joined = (payload.candidates?.[0]?.content?.parts ?? [])
    .map((part) => part.text ?? '')
    .join('\n')
    .trim()
    .replace(/^```json\s*/i, '')
    .replace(/```$/i, '')
    .trim()
  if (!joined) {
    throw new MealsFailure('upstream', 'Gemini returned an empty meal card')
  }
  let meal: MealsGeminiResponse['meal']
  try {
    meal = JSON.parse(joined) as MealsGeminiResponse['meal']
  } catch {
    throw new MealsFailure('upstream', 'Gemini returned invalid meal JSON')
  }
  return {
    ok: true,
    model,
    meal: {
      title: String(meal.title ?? 'Приём пищи'),
      excerpt: String(meal.excerpt ?? ''),
      body: '',
      category: String(meal.category ?? 'Каша'),
      mealType: String(meal.mealType ?? 'Обед'),
      tags: Array.isArray(meal.tags) ? meal.tags.map(String) : [],
      nutrition: {
        kcal: Number(meal.nutrition?.kcal ?? 0),
        protein: Number(meal.nutrition?.protein ?? 0),
        fat: Number(meal.nutrition?.fat ?? 0),
        carbs: Number(meal.nutrition?.carbs ?? 0),
      },
      clientNoteStructured: String(meal.clientNoteStructured ?? ''),
      composition: mapGeminiComposition(meal.composition),
      assumptions: Array.isArray(meal.assumptions) ? meal.assumptions.map(String) : [],
      micronutrients: normalizeMicronutrients(meal.micronutrients),
    },
    ...geminiUsageField(model, payload.usageMetadata, parts),
  }
}

function geminiUsageField(
  model: string,
  metadata: unknown,
  parts: Array<Record<string, unknown>>,
) {
  const audio = parts.some((part) => {
    const inline = part.inline_data
    if (!inline || typeof inline !== 'object') return false
    const mime = (inline as { mime_type?: unknown }).mime_type
    return typeof mime === 'string' && mime.startsWith('audio/')
  })
  const usage = usageLedgerFromGemini(model, metadata, { audio })
  return generationLedgerTokens(usage) > 0 ? { usage } : {}
}

function normalizeImageMime(mime: string | undefined) {
  const normalized = (mime || '').split(';')[0]?.trim().toLowerCase()
  if (
    normalized === 'image/jpeg'
    || normalized === 'image/png'
    || normalized === 'image/webp'
    || normalized === 'image/gif'
  ) {
    return normalized
  }
  if (normalized === 'image/jpg') return 'image/jpeg'
  return 'image/jpeg'
}

function normalizeAudioMime(mime: string | undefined) {
  const normalized = (mime || '').split(';')[0]?.trim().toLowerCase()
  if (normalized.startsWith('audio/')) return normalized
  return 'audio/ogg'
}
