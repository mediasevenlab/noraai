import { normalizeMicronutrients } from '@web-app-demo/contracts'

import { mapGeminiComposition } from './mapping'

export type NoraModelKind = 'text' | 'vision'

/** One GPU holds one model. A photo uses vision; a description without a photo uses text. */
export function noraModelKind(imageCount: number): NoraModelKind {
  return imageCount > 0 ? 'vision' : 'text'
}

export function readMealCardJson(raw: string): unknown {
  const stripped = raw
    .replace(/<think>[\s\S]*?<\/think>/gi, '')
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/```$/i, '')
    .trim()
  const start = stripped.indexOf('{')
  const end = stripped.lastIndexOf('}')
  if (start < 0 || end <= start) {
    throw new Error('meal card json missing')
  }
  return JSON.parse(stripped.slice(start, end + 1)) as unknown
}

const PORTION_WEIGHT = /(?:^|\s|~)\d+(?:[.,]\d+)?\s*(?:килограмм(?:а|ов)?|кг|грамм(?:а|ов)?|гр|мл|шт|г|л)(?!\p{L})/iu

export function portionLabelsNeedWeight(items: Array<{ label: string }>) {
  return items.length > 0 && items.some((item) => !PORTION_WEIGHT.test(item.label))
}

const PORTION_ESTIMATES: Array<[RegExp, number, number]> = [
  [/брокколи|овощ|салат|огурец|перец|капуста|помидор/i, 120, 0.35],
  [/гриб/i, 50, 0.25],
  [/рис|греч|овсян|картоф|макарон|булгур/i, 150, 1.3],
  [/куриц|мяс|рыб|котлет|индей|говяд|свинин/i, 120, 1.9],
  [/масл|соус/i, 10, 7],
  [/хлеб|лаваш/i, 40, 2.5],
]

export function withEstimatedPortionWeights<T extends { label: string; kcal: number }>(items: T[]): T[] {
  return items.map((item) => {
    if (!portionLabelsNeedWeight([item])) return item
    const drink = /чай|кофе|сок|вода|молок|компот|напит/i.test(item.label)
    const amount = estimatePortionAmount(item.label, item.kcal)
    return { ...item, label: `${item.label} ~${amount} ${drink ? 'мл' : 'г'}` }
  })
}

function estimatePortionAmount(label: string, kcal: number) {
  const drink = /чай|кофе|сок|вода|молок|компот|напит/i.test(label)
  const match = PORTION_ESTIMATES.find(([pattern]) => pattern.test(label))
  const typical = match?.[1] ?? (drink ? 200 : 100)
  const density = match?.[2] ?? 1.2
  if (!(kcal > 0) || drink) return typical
  return Math.min(400, Math.max(10, Math.round(kcal / density / 10) * 10))
}

type MacroTotals = { kcal: number; protein: number; fat: number; carbs: number }

export function mealNumbersMissing(meal: { nutrition: MacroTotals; composition: MacroTotals[] }) {
  return macroSum([meal.nutrition, ...meal.composition]) <= 0
}

export function withRolledUpNutrition<T extends { nutrition: MacroTotals; composition: MacroTotals[] }>(meal: T): T {
  if (macroSum([meal.nutrition]) > 0) return meal
  return withCompositionNutrition(meal)
}

/** A correction's total is the sum of the new lines, even when the header still says the old calories. */
export function withCompositionNutrition<T extends { nutrition: MacroTotals; composition: MacroTotals[] }>(meal: T): T {
  if (macroSum(meal.composition) <= 0) return meal
  return {
    ...meal,
    nutrition: {
      kcal: roundedMacro(meal.composition, 'kcal'),
      protein: roundedMacro(meal.composition, 'protein'),
      fat: roundedMacro(meal.composition, 'fat'),
      carbs: roundedMacro(meal.composition, 'carbs'),
    },
  }
}

const NORA_REFINE_IMAGE_LIMIT = 5

/**
 * The office vision model fits 4096 tokens. The saved cover plus a new photo
 * overflows that window. Current foods are already named in the prompt.
 */
export function noraRefineImages(input: {
  photoMode?: 'replace' | 'augment'
  coverBase64?: string
  coverMime?: string
  attached: Array<{ base64: string; mime?: string }>
}) {
  const attached = input.attached
    .filter((image) => image.base64.length > 0)
    .slice(0, NORA_REFINE_IMAGE_LIMIT)
  if (attached.length > 0) return attached
  if (input.coverBase64 && input.photoMode !== 'replace') {
    return [{ base64: input.coverBase64, mime: input.coverMime }]
  }
  return []
}

/** Several photos share one 4096-token window, so the extract prompt stays short. */
export function noraExtractPrompt(imageCount: number) {
  const photo =
    imageCount > 1
      ? `На фото ${imageCount} кадра одного приёма. Собери продукты со всех кадров в одну карточку, без повторов.`
      : 'На фото один приём. Продукты, которых нет на фото, не добавляй.'
  return [
    'Верни только JSON карточки приёма, без markdown.',
    photo,
    'composition: каждый продукт отдельно. В label вес, например «Морковь ~40 г». У строки свои kcal, protein, fat, carbs.',
    'nutrition — сумма строк, целые числа. micronutrients — пустой список. assumptions — до 3 коротких фактов. body — пустая строка.',
    'title короткий. excerpt — продукты через запятую, без весов.',
    'category: Птица, Рыба, Мясо, Завтрак, Перекус или Каша. mealType: Завтрак, Обед, Ужин или Перекус.',
  ].join('\n')
}

/** Short enough that one photo and the JSON answer both fit in 4096 tokens. */
export function noraRefinePrompt(photoMode?: 'replace' | 'augment') {
  const photo =
    photoMode === 'replace'
      ? 'На фото новый приём. Продукты, которых нет на фото, не переноси.'
      : 'На фото добавка к уже собранному приёму. Сохрани строки из «Состав сейчас» и добавь продукты с фото отдельными строками.'
  return [
    'Верни только JSON карточки приёма, без markdown.',
    photo,
    'composition: каждый продукт отдельно. В label вес, например «Морковь ~40 г». У строки свои kcal, protein, fat, carbs.',
    'nutrition — сумма строк, целые числа. micronutrients — пустой список. assumptions — до 3 коротких фактов. body — пустая строка.',
    'title короткий. excerpt — продукты через запятую, без весов.',
    'category: Птица, Рыба, Мясо, Завтрак, Перекус или Каша. mealType: Завтрак, Обед, Ужин или Перекус.',
  ].join('\n')
}

/** Nora copies numbers it can see. A correction is sent as names and weights only. */
export function noraRefineSource(
  card: Record<string, unknown>,
  photoMode?: 'replace' | 'augment',
) {
  const source = {
    title: card.title,
    mealType: card.mealType,
  }
  if (photoMode === 'replace' || !Array.isArray(card.composition)) return source
  return {
    ...source,
    composition: card.composition.map((item) => {
      if (!item || typeof item !== 'object') return { label: '' }
      return { label: String((item as { label?: unknown }).label ?? '') }
    }),
  }
}

function sumMacro(items: MacroTotals[], key: keyof MacroTotals) {
  return items.reduce((sum, item) => sum + finiteMacro(item[key]), 0)
}

function roundedMacro(items: MacroTotals[], key: keyof MacroTotals) {
  return Math.max(0, Math.round(sumMacro(items, key)))
}

function macroSum(items: MacroTotals[]) {
  return items.reduce(
    (sum, item) => sum + finiteMacro(item.kcal) + finiteMacro(item.protein) + finiteMacro(item.fat) + finiteMacro(item.carbs),
    0,
  )
}

function finiteMacro(value: number) {
  return Number.isFinite(value) && value > 0 ? value : 0
}

export function portionLabelWithWeight(record: Record<string, unknown>) {
  const label = String(record.label ?? record.name ?? record.title ?? record.item ?? '').trim()
  if (!label || PORTION_WEIGHT.test(label)) return label
  const milliliters = portionMeasure(record.ml ?? record.milliliters)
  if (milliliters != null) return `${label} ~${milliliters} мл`
  const grams = portionMeasure(record.grams ?? record.weightGrams ?? record.weight ?? record.amount)
  if (grams == null) return label
  const unit = String(record.unit ?? record.weightUnit ?? '').toLowerCase()
  return `${label} ~${grams} ${unit.includes('мл') ? 'мл' : 'г'}`
}

function portionMeasure(value: unknown) {
  const amount = Number(value)
  if (!Number.isFinite(amount) || amount <= 0 || amount > 2000) return null
  return Math.round(amount)
}

function compositionWithWeights(raw: unknown) {
  if (!Array.isArray(raw)) return raw
  return raw.map((entry) => {
    if (!entry || typeof entry !== 'object') return entry
    const record = entry as Record<string, unknown>
    const label = portionLabelWithWeight(record)
    return label ? { ...record, label } : entry
  })
}

export function normalizeGeneratedMealCard(raw: unknown) {
  const meal = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {}
  const nutrition =
    meal.nutrition && typeof meal.nutrition === 'object'
      ? (meal.nutrition as Record<string, unknown>)
      : {}
  const assumptions = (Array.isArray(meal.assumptions) ? meal.assumptions.map(String) : [])
    .filter((line) => !/не весы/i.test(line))
  return {
    title: String(meal.title ?? 'Приём пищи'),
    excerpt: String(meal.excerpt ?? ''),
    body: '',
    category: String(meal.category ?? 'Каша'),
    mealType: String(meal.mealType ?? 'Обед'),
    tags: Array.isArray(meal.tags) ? meal.tags.map(String) : [],
    nutrition: {
      kcal: Number(nutrition.kcal ?? 0),
      protein: Number(nutrition.protein ?? 0),
      fat: Number(nutrition.fat ?? 0),
      carbs: Number(nutrition.carbs ?? 0),
    },
    clientNoteStructured: String(meal.clientNoteStructured ?? ''),
    composition: mapGeminiComposition(compositionWithWeights(
      meal.composition ?? meal.items ?? meal.products ?? meal.portionItems,
    )),
    assumptions,
    micronutrients: normalizeMicronutrients(meal.micronutrients),
  }
}
