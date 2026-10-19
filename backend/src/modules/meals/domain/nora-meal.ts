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
      : photoMode === 'augment'
        ? 'На фото добавка к уже собранному приёму. Сохрани строки из «Состав сейчас» и добавь продукты с фото отдельными строками.'
        : 'Фото нет. Это правка уже собранного приёма. Убери, замени или добавь только то, что назвал пользователь. Остальные строки из «Состав сейчас» сохрани.'
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
      const record = item as {
        label?: unknown
        kcal?: unknown
        protein?: unknown
        fat?: unknown
        carbs?: unknown
      }
      const line = {
        label: String(record.label ?? ''),
        kcal: Math.max(0, Math.round(Number(record.kcal) || 0)),
        protein: Math.max(0, Math.round(Number(record.protein) || 0)),
        fat: Math.max(0, Math.round(Number(record.fat) || 0)),
        carbs: Math.max(0, Math.round(Number(record.carbs) || 0)),
      }
      return line.kcal + line.protein + line.fat + line.carbs > 0 ? line : { label: line.label }
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
  const label = String(record.label ?? record.product ?? record.name ?? record.title ?? record.item ?? '').trim()
  if (!label || PORTION_WEIGHT.test(label)) return label
  const milliliters = describedPortion(record.ml ?? record.milliliters)
  if (milliliters) return `${label} ~${milliliters.amount} мл`
  const grams = describedPortion(record.grams ?? record.weightGrams ?? record.weight ?? record.amount)
  if (grams == null) return label
  return `${label} ~${grams.amount} ${grams.unit}`
}

export function withEstimatedLineMacros<
  T extends { nutrition: MacroTotals; composition: Array<MacroTotals & { label: string }> },
>(meal: T): T {
  if (!mealNumbersMissing(meal)) return meal
  const composition = meal.composition.map((item) => {
    if (item.kcal + item.protein + item.fat + item.carbs > 0) return item
    const estimated = estimatePortionMacros(item.label)
    return estimated ? { ...item, ...estimated } : item
  })
  if (macroSum(composition) <= 0) return meal
  return withRolledUpNutrition({ ...meal, composition })
}

/** A header total must not hide lines that arrived without their own macros. */
export function withFilledLineMacros<
  T extends { nutrition: MacroTotals; composition: Array<MacroTotals & { label: string }> },
>(meal: T): T {
  let filled = false
  const composition = meal.composition.map((item) => {
    if (item.kcal + item.protein + item.fat + item.carbs > 0) return item
    const estimated = estimatePortionMacros(item.label)
    if (!estimated) return item
    filled = true
    return { ...item, ...estimated }
  })
  if (!filled || macroSum(composition) <= 0) return meal
  return withCompositionNutrition({ ...meal, composition })
}

const REMOVAL_STOP_WORDS = new Set([
  'из',
  'от',
  'для',
  'это',
  'этот',
  'эту',
  'этого',
  'прием',
  'приема',
  'состав',
  'состава',
  'блюда',
  'блюдо',
  'тарелки',
  'тарелку',
  'пожалуйста',
  'строку',
  'строки',
  'позицию',
  'продукт',
  'продукта',
])

function foldRu(value: string) {
  return value
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/[^a-zа-я0-9]+/giu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * «ветчину» and «ветчина» are the same food.
 * A short word only grows by an ending. A longer word may also change its last letters.
 */
export function foodWordsMatch(left: string, right: string) {
  if (left === right) return true
  const [shorter, longer] = left.length <= right.length ? [left, right] : [right, left]
  if (shorter.length < 3) return false
  if (longer.startsWith(shorter)) {
    const extra = longer.length - shorter.length
    if (shorter.length < 4 && extra > 1) return false
    return extra <= 3
  }
  let stem = 0
  while (stem < shorter.length && shorter[stem] === longer[stem]) stem += 1
  return stem >= 4 && shorter.length - stem <= 2 && longer.length - stem <= 2
}

/**
 * A plain «убери масло» keeps the saved lines and drops the named ones.
 * «Бери» is the same request with the first letter missing.
 * Mixed edits («убери масло и добавь хлеб») stay with the model.
 */
export function applyNamedRemoval(card: Record<string, unknown>, message: string) {
  const normalized = foldRu(message).replace(/^бери(?=\s|$)/u, 'убери')
  if (/(добав|замен|помен|вместо|увелич|уменьш|поставь|сделай)/u.test(normalized)) return null
  const request = normalized.match(/^(?:убери|удали|убрать|без)\s+(.+)$/u)
  if (!request?.[1]) return null
  const targets = request[1]
    .split(/\s+и\s+|,/u)
    .map((part) =>
      part.split(/\s+/u).filter((word) => word.length >= 3 && !REMOVAL_STOP_WORDS.has(word)),
    )
    .filter((words) => words.length > 0)
  if (targets.length === 0) return null
  const meal = normalizeGeneratedMealCard(card)
  if (meal.composition.length < 2) return null
  const drop = new Set<number>()
  for (const words of targets) {
    const hits = meal.composition.flatMap((item, index) => {
      const labelWords = foldRu(item.label).split(' ').filter((word) => word.length >= 3)
      return words.some((word) => labelWords.some((labelWord) => foodWordsMatch(labelWord, word)))
        ? [index]
        : []
    })
    if (hits.length === 0) return null
    for (const index of hits) drop.add(index)
  }
  if (drop.size === 0 || drop.size >= meal.composition.length) return null
  const composition = meal.composition.flatMap((item, index) => {
    if (drop.has(index)) return []
    if (item.kcal + item.protein + item.fat + item.carbs > 0) return [item]
    const estimated = estimatePortionMacros(item.label)
    return estimated ? [{ ...item, ...estimated }] : [item]
  })
  if (composition.some((item) => item.kcal + item.protein + item.fat + item.carbs <= 0)) return null
  return withCompositionNutrition({
    ...meal,
    excerpt: composition
      .map((item) => item.label.replace(/\s*[~–—-].*$/u, '').trim())
      .filter(Boolean)
      .join(', '),
    composition,
  })
}

export function estimatePortionMacros(label: string) {
  const match = label.match(/(\d+(?:[.,]\d+)?)\s*(килограмм(?:а|ов)?|кг|грамм(?:а|ов)?|гр|мл|шт|г|л)(?!\p{L})/iu)
  if (!match?.[1] || !match[2]) return null
  let amount = Number(match[1].replace(',', '.'))
  const unit = match[2].toLowerCase()
  if (unit.startsWith('кг') || unit.startsWith('килограмм')) amount *= 1000
  if (unit === 'л') amount *= 1000
  if (unit === 'шт') amount *= 50
  amount = Math.round(amount)
  if (!Number.isFinite(amount) || amount <= 0 || amount > 2000) return null
  if (/чай|кофе|вода/i.test(label)) {
    return { kcal: 1, protein: 0, fat: 0, carbs: 0 }
  }
  if (/сок|молок|компот|напит/i.test(label)) {
    const kcal = Math.max(1, Math.round(amount * 0.5))
    return { kcal, protein: 0, fat: Math.round(kcal / 20), carbs: Math.max(1, Math.round(kcal / 4)) }
  }
  if (/куриц|мяс|рыб|котлет|индей|говяд|свинин|колбас/i.test(label)) {
    const protein = Math.max(1, Math.round(amount * 0.18))
    const fat = Math.max(1, Math.round(amount * 0.08))
    return { kcal: protein * 4 + fat * 9, protein, fat, carbs: 0 }
  }
  if (/рис|греч|овсян|картоф|макарон|булгур|хлеб|лаваш/i.test(label)) {
    const carbs = Math.max(1, Math.round(amount * 0.2))
    const protein = Math.max(1, Math.round(amount * 0.03))
    return { kcal: carbs * 4 + protein * 4, protein, fat: 0, carbs }
  }
  const carbs = Math.max(1, Math.round(amount * 0.05))
  return { kcal: carbs * 4, protein: 0, fat: 0, carbs }
}

function describedPortion(value: unknown): { amount: number; unit: 'г' | 'мл' } | null {
  if (typeof value === 'string') {
    const match = value.match(/(\d+(?:[.,]\d+)?)\s*(мл|кг|гр|г|л)?/iu)
    if (!match?.[1]) return null
    let amount = Number(match[1].replace(',', '.'))
    const unit = (match[2] || 'г').toLowerCase()
    if (unit === 'кг') amount *= 1000
    if (unit === 'л') amount *= 1000
    if (!Number.isFinite(amount) || amount <= 0 || amount > 2000) return null
    return { amount: Math.round(amount), unit: unit === 'мл' || unit === 'л' ? 'мл' : 'г' }
  }
  const amount = Number(value)
  if (!Number.isFinite(amount) || amount <= 0 || amount > 2000) return null
  return { amount: Math.round(amount), unit: 'г' }
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
