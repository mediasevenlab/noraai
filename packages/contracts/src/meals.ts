import { z } from 'zod'
export const mealSlotSchema = z.enum(['Завтрак', 'Обед', 'Ужин', 'Перекус'])
export const mealCategorySchema = z.enum([
  'Птица',
  'Рыба',
  'Мясо',
  'Завтрак',
  'Перекус',
  'Каша',
])
export const mealSourceSchema = z.enum(['telegram', 'manual'])
export const mealImageMimeSchema = z.enum(['image/jpeg', 'image/png', 'image/webp'])
/** 5 MiB decoded input, plus Base64 expansion. */
export const maxMealImageBase64Length = 7_000_000
export const mealImageBase64Schema = z.string().min(1).max(maxMealImageBase64Length)
export const mealPortionItemSchema = z
  .object({
    label: z.string().trim().min(1).max(200),
    kcal: z.number().int().nonnegative(),
    protein: z.number().int().nonnegative(),
    fat: z.number().int().nonnegative(),
    carbs: z.number().int().nonnegative(),
  })
  .strict()
export type MealPortionItem = z.infer<typeof mealPortionItemSchema>
/** Accepts current objects and legacy string lines from stored JSON. */
export const mealPortionItemInputSchema = z.union([
  z
    .string()
    .trim()
    .min(1)
    .max(200)
    .transform((label) => ({
      label,
      kcal: 0,
      protein: 0,
      fat: 0,
      carbs: 0,
    })),
  mealPortionItemSchema,
])
export const mealPortionItemsSchema = z.array(mealPortionItemInputSchema).max(40)
export function normalizePortionItems(value: unknown): MealPortionItem[] {
  if (!Array.isArray(value)) return []
  const items: MealPortionItem[] = []
  for (const raw of value) {
    const parsed = mealPortionItemInputSchema.safeParse(raw)
    if (parsed.success) items.push(parsed.data)
  }
  return items.slice(0, 40)
}

export const mealMicronutrientDefs = [
  { key: 'sodium', label: 'Натрий', unit: 'мг', group: 'primary' },
  { key: 'potassium', label: 'Калий', unit: 'мг', group: 'primary' },
  { key: 'vitaminC', label: 'Витамин C', unit: 'мг', group: 'primary' },
  { key: 'vitaminD', label: 'Витамин D', unit: 'мкг', group: 'primary' },
  { key: 'vitaminA', label: 'Витамин A', unit: 'мкг', group: 'additional' },
  { key: 'iron', label: 'Железо', unit: 'мг', group: 'primary' },
  { key: 'zinc', label: 'Цинк', unit: 'мг', group: 'additional' },
  { key: 'iodine', label: 'Йод', unit: 'мкг', group: 'additional' },
  { key: 'selenium', label: 'Селен', unit: 'мкг', group: 'additional' },
  { key: 'calcium', label: 'Кальций', unit: 'мг', group: 'primary' },
  { key: 'magnesium', label: 'Магний', unit: 'мг', group: 'additional' },
  { key: 'phosphorus', label: 'Фосфор', unit: 'мг', group: 'additional' },
  { key: 'biotin', label: 'Биотин', unit: 'мкг', group: 'additional' },
  { key: 'vitaminK', label: 'Витамин K', unit: 'мкг', group: 'additional' },
  { key: 'vitaminE', label: 'Витамин E', unit: 'мг', group: 'additional' },
  { key: 'folate', label: 'Фолиевая кислота', unit: 'мкг', group: 'additional' },
  { key: 'vitaminB6', label: 'Витамин B6', unit: 'мг', group: 'additional' },
  { key: 'vitaminB12', label: 'Витамин B12', unit: 'мкг', group: 'additional' },
] as const

export const mealMicronutrientKeySchema = z.enum([
  'sodium',
  'potassium',
  'vitaminC',
  'vitaminD',
  'vitaminA',
  'iron',
  'zinc',
  'iodine',
  'selenium',
  'calcium',
  'magnesium',
  'phosphorus',
  'biotin',
  'vitaminK',
  'vitaminE',
  'folate',
  'vitaminB6',
  'vitaminB12',
])
export type MealMicronutrientKey = z.infer<typeof mealMicronutrientKeySchema>
export const mealMicronutrientItemSchema = z
  .object({
    key: mealMicronutrientKeySchema,
    label: z.string().trim().min(1).max(80),
    unit: z.enum(['мг', 'мкг']),
    amount: z.number().nonnegative(),
  })
  .strict()
export type MealMicronutrient = z.infer<typeof mealMicronutrientItemSchema>
export const mealMicronutrientsSchema = z.array(mealMicronutrientItemSchema).max(40)

const micronutrientKeyByAlias = new Map<string, MealMicronutrientKey>([
  ...mealMicronutrientDefs.flatMap((item) => [
    [item.key.toLowerCase(), item.key] as const,
    [item.label.toLowerCase(), item.key] as const,
  ]),
  ['натрий', 'sodium'],
  ['калий', 'potassium'],
  ['витамин c', 'vitaminC'],
  ['витамин с', 'vitaminC'],
  ['витамин d', 'vitaminD'],
  ['витамин д', 'vitaminD'],
  ['витамин a', 'vitaminA'],
  ['витамин а', 'vitaminA'],
  ['железо', 'iron'],
  ['цинк', 'zinc'],
  ['йод', 'iodine'],
  ['селен', 'selenium'],
  ['кальций', 'calcium'],
  ['магний', 'magnesium'],
  ['фосфор', 'phosphorus'],
  ['биотин', 'biotin'],
  ['витамин k', 'vitaminK'],
  ['витамин к', 'vitaminK'],
  ['витамин e', 'vitaminE'],
  ['витамин е', 'vitaminE'],
  ['фолиевая кислота', 'folate'],
  ['фолат', 'folate'],
  ['витамин b6', 'vitaminB6'],
  ['витамин б6', 'vitaminB6'],
  ['витамин b12', 'vitaminB12'],
  ['витамин б12', 'vitaminB12'],
])

function normalizeMicronutrientKey(value: string): MealMicronutrientKey | null {
  const key = value
    .trim()
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/\s+/g, ' ')
  return micronutrientKeyByAlias.get(key) ?? null
}

function normalizeMicronutrientAmount(value: unknown): number {
  const amount = Number(value)
  if (!Number.isFinite(amount) || amount < 0) return 0
  return Math.round(amount * 10) / 10
}

export function formatMicronutrientAmount(amount: number): string {
  const rounded = Math.round(amount * 10) / 10
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1)
}

/** Empty input stays empty; any recognized value fills the canonical 18-item list. */
export function normalizeMicronutrients(value: unknown): MealMicronutrient[] {
  const amounts = new Map<MealMicronutrientKey, number>()
  if (Array.isArray(value)) {
    for (const entry of value) {
      if (!entry || typeof entry !== 'object') continue
      const record = entry as Record<string, unknown>
      const key = normalizeMicronutrientKey(
        String(record.key ?? record.id ?? record.label ?? record.name ?? ''),
      )
      if (!key) continue
      amounts.set(key, normalizeMicronutrientAmount(record.amount ?? record.value ?? record.qty))
    }
  } else if (value && typeof value === 'object') {
    for (const [rawKey, rawAmount] of Object.entries(value as Record<string, unknown>)) {
      const key = normalizeMicronutrientKey(rawKey)
      if (!key) continue
      amounts.set(key, normalizeMicronutrientAmount(rawAmount))
    }
  }
  if (amounts.size === 0) return []
  return mealMicronutrientDefs.map((item) => ({
    key: item.key,
    label: item.label,
    unit: item.unit,
    amount: amounts.get(item.key) ?? 0,
  }))
}

export function partitionMealMicronutrients(items: readonly MealMicronutrient[]) {
  const byKey = new Map(items.map((item) => [item.key, item]))
  const primary: MealMicronutrient[] = []
  const additional: MealMicronutrient[] = []
  for (const def of mealMicronutrientDefs) {
    const item = byKey.get(def.key)
    if (!item) continue
    if (def.group === 'primary') primary.push(item)
    else additional.push(item)
  }
  return { primary, additional }
}
export const mealVersionSnapshotSchema = z
  .object({
    title: z.string().min(1).max(200),
    ingredients: z.string().max(500),
    category: mealCategorySchema,
    meal: mealSlotSchema,
    kcal: z.number().int().nonnegative(),
    protein: z.number().int().nonnegative(),
    fat: z.number().int().nonnegative(),
    carbs: z.number().int().nonnegative(),
    portionItems: mealPortionItemsSchema,
    clientComment: z.string().max(4000),
    assumptions: z.array(z.string().min(1).max(400)).max(40),
    micronutrients: mealMicronutrientsSchema.default([]),
  })
  .strict()
export const mealVersionSchema = z
  .object({
    id: z.string().uuid(),
    createdAt: z.string().datetime(),
    label: z.string().min(1).max(40),
    note: z.string().max(120).optional(),
    /** Who added this refinement. The first version is the original card and has no author. */
    authorRole: z.enum(['user', 'mentor']).optional(),
    snapshot: mealVersionSnapshotSchema,
  })
  .strict()
export const mealExtraImageUrlsSchema = z.array(z.string().min(1)).max(10)
export const generationUsageBucketSchema = z
  .object({
    inputTokens: z.number().int().nonnegative(),
    audioInputTokens: z.number().int().nonnegative(),
    outputTokens: z.number().int().nonnegative(),
  })
  .strict()
export const generationUsageSchema = z.record(
  z.string().min(1).max(120),
  generationUsageBucketSchema,
)
export const generationSpendSchema = z
  .object({
    tokens: z.number().int().nonnegative(),
    /** USD captured when these tokens were billed. Later price changes do not rewrite it. */
    dollars: z.number().nonnegative().nullable(),
    rubles: z.number().nonnegative().nullable(),
  })
  .strict()
export type GenerationUsageLedger = z.infer<typeof generationUsageSchema>
export type GenerationSpend = z.infer<typeof generationSpendSchema>
export const mealSchema = z
  .object({
    id: z.string().uuid(),
    userId: z.string().uuid(),
    title: z.string().min(1).max(200),
    ingredients: z.string().max(500),
    category: mealCategorySchema,
    meal: mealSlotSchema,
    recordedAt: z.string().datetime(),
    kcal: z.number().int().nonnegative(),
    protein: z.number().int().nonnegative(),
    fat: z.number().int().nonnegative(),
    carbs: z.number().int().nonnegative(),
    imageUrl: z.string().min(1),
    extraImageUrls: mealExtraImageUrlsSchema.default([]),
    portionItems: mealPortionItemsSchema,
    clientComment: z.string().max(4000),
    assumptions: z.array(z.string().min(1).max(400)).max(40),
    micronutrients: mealMicronutrientsSchema.default([]),
    versions: z.array(mealVersionSchema).max(8),
    activeVersionId: z.string().uuid(),
    source: mealSourceSchema,
    createdAt: z.string().datetime(),
    shared: z.boolean(),
    authorName: z.string().trim().min(1).max(80).optional(),
    likeCount: z.number().int().nonnegative().default(0),
    liked: z.boolean().default(false),
    likedAt: z.string().datetime().optional(),
    /** Mentor diary only: this card has not been viewed by the current mentor. */
    unread: z.boolean().optional(),
    /** Money billed for this meal, frozen when each call was made. Absent when nothing was recorded. */
    generationSpend: generationSpendSchema.optional(),
  })
  .strict()
export const listMealsResponseSchema = z
  .object({
    items: z.array(mealSchema),
    /** Lifetime spend frozen as each call was billed. Stays after a meal card is deleted. */
    generationSpend: generationSpendSchema.optional(),
  })
  .strict()
export const createMealFromBotRequestSchema = z
  .object({
    userId: z.string().uuid(),
    title: z.string().trim().min(1).max(200),
    ingredients: z.string().trim().max(500).default(''),
    category: mealCategorySchema,
    meal: mealSlotSchema,
    recordedAt: z.string().datetime().optional(),
    kcal: z.number().int().nonnegative(),
    protein: z.number().int().nonnegative(),
    fat: z.number().int().nonnegative(),
    carbs: z.number().int().nonnegative(),
    portionItems: mealPortionItemsSchema.default([]),
    clientComment: z.string().trim().max(4000).default(''),
    assumptions: z.array(z.string().trim().min(1).max(400)).max(40).default([]),
    micronutrients: z.preprocess(normalizeMicronutrients, mealMicronutrientsSchema).default([]),
    source: mealSourceSchema.default('telegram'),
    telegramUpdateId: z.string().trim().min(1).max(64).optional(),
    imageBase64: mealImageBase64Schema.optional(),
    imageMime: mealImageMimeSchema.optional(),
  })
  .strict()
export const mentorNotifyDeliverySchema = z.enum(['skipped', 'sent', 'failed'])
export const n8nFallbackFromSchema = z.literal('n8n')
export const createMealFromBotResponseSchema = z
  .object({
    meal: mealSchema,
    created: z.boolean(),
    /** Present after a create attempt: whether the mentor Telegram notify went out. */
    mentorNotify: mentorNotifyDeliverySchema.optional(),
  })
  .strict()
/** Authenticated user/mentor create (demo promote, manual entry). */
export const createUserMealRequestSchema = z
  .object({
    title: z.string().trim().min(1).max(200),
    ingredients: z.string().trim().max(500).default(''),
    category: mealCategorySchema,
    meal: mealSlotSchema,
    recordedAt: z.string().datetime().optional(),
    kcal: z.number().int().nonnegative(),
    protein: z.number().int().nonnegative(),
    fat: z.number().int().nonnegative(),
    carbs: z.number().int().nonnegative(),
    portionItems: mealPortionItemsSchema.default([]),
    clientComment: z.string().trim().max(4000).default(''),
    assumptions: z.array(z.string().trim().min(1).max(400)).max(40).default([]),
    micronutrients: z.preprocess(normalizeMicronutrients, mealMicronutrientsSchema).default([]),
    source: mealSourceSchema.default('manual'),
    /** User-scoped idempotency key, e.g. demo-meal-01. */
    clientKey: z.string().trim().min(1).max(64).optional(),
    imageBase64: mealImageBase64Schema.optional(),
    imageMime: mealImageMimeSchema.optional(),
  })
  .strict()
export const createUserMealResponseSchema = createMealFromBotResponseSchema
export const refineMealImageSchema = z
  .object({
    imageBase64: mealImageBase64Schema,
    imageMime: mealImageMimeSchema.optional(),
  })
  .strict()
export const refineMealRequestSchema = z
  .object({
    message: z.string().trim().max(4000).default(''),
    imageBase64: mealImageBase64Schema.optional(),
    imageMime: mealImageMimeSchema.optional(),
    images: z.array(refineMealImageSchema).max(8).optional(),
  })
  .strict()
  .refine(
    (value) =>
      Boolean(value.message.trim())
      || Boolean(value.imageBase64)
      || Boolean(value.images?.some((image) => image.imageBase64)),
    { message: 'message or imageBase64 required' },
  )
export const selectMealVersionRequestSchema = z
  .object({
    versionId: z.string().uuid(),
  })
  .strict()
export const mealMutationResponseSchema = z
  .object({
    meal: mealSchema,
    /** Updated lifetime diary spend after this change, when the call recorded tokens. */
    generationSpend: generationSpendSchema.optional(),
  })
  .strict()

export const deleteMealResponseSchema = z
  .object({
    ok: z.literal(true),
  })
  .strict()

export const resetGenerationSpendResponseSchema = deleteMealResponseSchema

export const generationPricingResponseSchema = z
  .object({
    usdRub: z.number().positive().nullable(),
    model: z.string().min(1).max(120),
    usdPerMillion: z
      .object({
        text: z.number().positive(),
        image: z.number().positive(),
        link: z.number().positive(),
        audio: z.number().positive(),
        output: z.number().positive(),
      })
      .strict(),
  })
  .strict()
export type GenerationPricing = z.infer<typeof generationPricingResponseSchema>

export const shareMealRequestSchema = z
  .object({
    shared: z.boolean(),
  })
  .strict()
export const likeMealRequestSchema = z
  .object({
    liked: z.boolean(),
  })
  .strict()
export const setMealPlanDoneRequestSchema = z
  .object({
    done: z.boolean(),
    /** When completing, pin the meal to the diary day it was shown on. */
    recordedAt: z.string().datetime().optional(),
  })
  .strict()
export const mentorUnreadMealItemSchema = z
  .object({
    userId: z.string().uuid(),
    unreadCount: z.number().int().nonnegative(),
  })
  .strict()
export const mentorUnreadMealsResponseSchema = z
  .object({
    items: z.array(mentorUnreadMealItemSchema),
  })
  .strict()
export const markMentorMealsViewedRequestSchema = z
  .object({
    mealIds: z.array(z.string().uuid()).max(40),
  })
  .strict()
export const markMentorMealsViewedResponseSchema = z
  .object({
    ok: z.literal(true),
    viewedMealIds: z.array(z.string().uuid()),
    unreadCount: z.number().int().nonnegative(),
  })
  .strict()

export const telegramUserLookupResponseSchema = z
  .object({
    user: z
      .object({
        id: z.string().uuid(),
        publicId: z.number().int().positive(),
      })
      .strict()
      .nullable(),
  })
  .strict()
export const mealsGeminiRequestSchema = z
  .object({
    images: z
      .array(
        z
          .object({
            base64: z.string().min(1),
            mime: z.string().trim().min(3).max(100).optional(),
          })
          .strict(),
      )
      .max(8)
      .optional(),
    imageBase64: mealImageBase64Schema.optional(),
    imageMime: mealImageMimeSchema.optional(),
    note: z.string().max(4000).optional(),
    audioBase64: z.string().min(1).optional(),
    audioMime: z.string().trim().min(3).max(100).optional(),
  })
  .strict()
  .refine(
    (value) =>
      Boolean(value.imageBase64)
      || (Array.isArray(value.images) && value.images.some((image) => image.base64)),
    { message: 'images or imageBase64 required' },
  )
export const mealEngineSchema = z.enum(['gemini', 'nora'])
export const mealEngineResponseSchema = z
  .object({
    engine: mealEngineSchema,
  })
  .strict()
export const updateMealEngineRequestSchema = mealEngineResponseSchema
/** Same card request as Gemini, plus a text-only description when there is no photo. */
export const mealsNoraRequestSchema = z
  .object({
    images: z
      .array(
        z
          .object({
            base64: z.string().min(1),
            mime: z.string().trim().min(3).max(100).optional(),
          })
          .strict(),
      )
      .max(8)
      .optional(),
    imageBase64: mealImageBase64Schema.optional(),
    imageMime: mealImageMimeSchema.optional(),
    note: z.string().max(4000).optional(),
    audioBase64: z.string().min(1).optional(),
    audioMime: z.string().trim().min(3).max(100).optional(),
  })
  .strict()
  .refine(
    (value) =>
      Boolean(value.imageBase64)
      || (Array.isArray(value.images) && value.images.some((image) => image.base64))
      || Boolean(value.note?.trim())
      || Boolean(value.audioBase64),
    { message: 'images, note, or audioBase64 required' },
  )
export const mealsGeminiCardSchema = z
  .object({
    title: z.string(),
    excerpt: z.string(),
    body: z.string(),
    category: z.string(),
    mealType: z.string(),
    tags: z.array(z.string()),
    nutrition: z.object({
      kcal: z.number(),
      protein: z.number(),
      fat: z.number(),
      carbs: z.number(),
    }),
    clientNoteStructured: z.string(),
    composition: mealPortionItemsSchema,
    assumptions: z.array(z.string()),
    micronutrients: mealMicronutrientsSchema.default([]),
  })
  .strict()
export const mealsGeminiResponseSchema = z
  .object({
    ok: z.literal(true),
    model: z.string(),
    meal: mealsGeminiCardSchema,
    fallbackFrom: n8nFallbackFromSchema.optional(),
    usage: generationUsageSchema.optional(),
  })
  .strict()
export type MealSlot = z.infer<typeof mealSlotSchema>
export type MealCategory = z.infer<typeof mealCategorySchema>
export type MealSource = z.infer<typeof mealSourceSchema>
export type MealVersionSnapshot = z.infer<typeof mealVersionSnapshotSchema>
export type MealVersion = z.infer<typeof mealVersionSchema>
export type MealDto = z.infer<typeof mealSchema>
export type ListMealsResponse = z.infer<typeof listMealsResponseSchema>
export type CreateMealFromBotRequest = z.infer<typeof createMealFromBotRequestSchema>
export type CreateMealFromBotResponse = z.infer<typeof createMealFromBotResponseSchema>
export type MentorNotifyDelivery = z.infer<typeof mentorNotifyDeliverySchema>
export type CreateUserMealRequest = z.infer<typeof createUserMealRequestSchema>
export type CreateUserMealResponse = z.infer<typeof createUserMealResponseSchema>
export type RefineMealRequest = z.infer<typeof refineMealRequestSchema>
export type SelectMealVersionRequest = z.infer<typeof selectMealVersionRequestSchema>
export type MealMutationResponse = z.infer<typeof mealMutationResponseSchema>
export type DeleteMealResponse = z.infer<typeof deleteMealResponseSchema>
export type ShareMealRequest = z.infer<typeof shareMealRequestSchema>
export type LikeMealRequest = z.infer<typeof likeMealRequestSchema>
export type SetMealPlanDoneRequest = z.infer<typeof setMealPlanDoneRequestSchema>
export type MentorUnreadMealsResponse = z.infer<typeof mentorUnreadMealsResponseSchema>
export type MarkMentorMealsViewedRequest = z.infer<typeof markMentorMealsViewedRequestSchema>
export type MarkMentorMealsViewedResponse = z.infer<typeof markMentorMealsViewedResponseSchema>
export type TelegramUserLookupResponse = z.infer<typeof telegramUserLookupResponseSchema>
export const maxMealAudioBase64Length = 6_000_000
export const mealsTranscribeRequestSchema = z
  .object({
    audioBase64: z.string().min(1).max(maxMealAudioBase64Length),
    audioMime: z.string().trim().min(3).max(100).optional(),
  })
  .strict()
export const mealsTranscribeResponseSchema = z
  .object({
    ok: z.literal(true),
    text: z.string(),
    model: z.string(),
    fallbackFrom: n8nFallbackFromSchema.optional(),
    usage: generationUsageSchema.optional(),
  })
  .strict()
export const mealComposerActionSchema = z.enum([
  'open',
  'photo',
  'remove-photo',
  'note',
  'voice',
  'flush',
  'cancel',
])
export const mealComposerTurnRequestSchema = z
  .object({
    action: mealComposerActionSchema,
    imageBase64: mealImageBase64Schema.optional(),
    imageMime: mealImageMimeSchema.optional(),
    photoIndex: z.number().int().min(0).max(4).optional(),
    note: z.string().max(4000).optional(),
    audioBase64: z.string().min(1).max(maxMealAudioBase64Length).optional(),
    audioMime: z.string().trim().min(3).max(100).optional(),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (value.action === 'photo' && !value.imageBase64) {
      ctx.addIssue({ code: 'custom', path: ['imageBase64'], message: 'imageBase64 required' })
    }
    if (value.action === 'remove-photo' && value.photoIndex == null) {
      ctx.addIssue({ code: 'custom', path: ['photoIndex'], message: 'photoIndex required' })
    }
    if (value.action === 'voice' && !value.audioBase64) {
      ctx.addIssue({ code: 'custom', path: ['audioBase64'], message: 'audioBase64 required' })
    }
  })
export const mealComposerMessageSchema = z
  .object({
    role: z.literal('assistant'),
    text: z.string().trim().min(1).max(4000),
  })
  .strict()
export const mealComposerStatusSchema = z.enum([
  'idle',
  'collecting',
  'busy',
  'done',
  'cancelled',
])
export const mealComposerTurnResponseSchema = z
  .object({
    status: mealComposerStatusSchema,
    messages: z.array(mealComposerMessageSchema).max(40),
    photoCount: z.number().int().nonnegative().max(5),
    flushAfterMs: z.number().int().nonnegative().nullable(),
    meal: mealSchema.optional(),
    created: z.boolean().optional(),
  })
  .strict()
export type MealsGeminiRequest = z.infer<typeof mealsGeminiRequestSchema>
export type MealsGeminiResponse = z.infer<typeof mealsGeminiResponseSchema>
export type MealsNoraRequest = z.infer<typeof mealsNoraRequestSchema>
export type MealEngine = z.infer<typeof mealEngineSchema>
export type MealsTranscribeRequest = z.infer<typeof mealsTranscribeRequestSchema>
export type MealsTranscribeResponse = z.infer<typeof mealsTranscribeResponseSchema>
export type MealComposerTurnRequest = z.infer<typeof mealComposerTurnRequestSchema>
export type MealComposerTurnResponse = z.infer<typeof mealComposerTurnResponseSchema>
