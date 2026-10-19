import {
  normalizeMicronutrients,
  normalizePortionItems,
  type MealCategory,
  type MealPortionItem,
  type MealSlot,
} from '@web-app-demo/contracts'

type GeminiCard = {
  title?: unknown
  excerpt?: unknown
  category?: unknown
  mealType?: unknown
  nutrition?: {
    kcal?: unknown
    protein?: unknown
    fat?: unknown
    carbs?: unknown
  }
  clientNoteStructured?: unknown
  composition?: unknown
  assumptions?: unknown
  micronutrients?: unknown
}

const mealSlots: MealSlot[] = ['Завтрак', 'Обед', 'Ужин', 'Перекус']
const categories: MealCategory[] = ['Птица', 'Рыба', 'Мясо', 'Завтрак', 'Перекус', 'Каша']

export function mapGeminiCategory(raw: unknown, mealSlot: MealSlot): MealCategory {
  const value = String(raw ?? '').trim()
  if (value === 'Рыба') return 'Рыба'
  if (value === 'Птица') return 'Птица'
  if (value === 'Мясо') return 'Мясо'
  if (mealSlot === 'Завтрак') return 'Завтрак'
  if (mealSlot === 'Перекус') return 'Перекус'
  if (categories.includes(value as MealCategory)) return value as MealCategory
  return 'Каша'
}

export function mapGeminiMealSlot(raw: unknown): MealSlot {
  const value = String(raw ?? '').trim()
  if (mealSlots.includes(value as MealSlot)) return value as MealSlot
  return 'Обед'
}

export function isGenericMealTitle(raw: unknown) {
  const title = String(raw ?? '')
    .trim()
    .toLowerCase()
    .replace(/ё/g, 'е')
  return !title || title === 'прием пищи' || title === 'meal'
}

/** n8n/Gemini sometimes return a parseable stub instead of a real plate reading. */
export function isHollowMealAnalysis(raw: GeminiCard | null | undefined) {
  if (!raw || typeof raw !== 'object') return true
  const fields = mapGeminiCardToMealFields(raw)
  const noMacros =
    fields.kcal <= 0 && fields.protein <= 0 && fields.fat <= 0 && fields.carbs <= 0
  const noComposition = fields.portionItems.length === 0
  const excerpt = fields.ingredients.trim()
  const excerptGeneric = !excerpt || excerpt === fields.title || isGenericMealTitle(excerpt)
  return isGenericMealTitle(fields.title) && noMacros && noComposition && excerptGeneric
}

export function mapGeminiCardToMealFields(raw: GeminiCard) {
  const meal = mapGeminiMealSlot(raw.mealType)
  const nutrition = raw.nutrition ?? {}
  const title = String(raw.title ?? 'Приём пищи').trim() || 'Приём пищи'
  const ingredients = String(raw.excerpt ?? '')
    .replace(/\s*≈?\s*\d+\s*ккал[\s\S]*$/i, '')
    .replace(/\s*[·•]\s*Б\s*\d+[\s\S]*$/i, '')
    .trim() || title
  const portionItems = mapGeminiComposition(raw.composition)
  const assumptions = Array.isArray(raw.assumptions)
    ? raw.assumptions.map((item) => String(item ?? '').trim()).filter(Boolean)
    : []
  const micronutrients = normalizeMicronutrients(raw.micronutrients)

  return {
    title,
    ingredients,
    category: mapGeminiCategory(raw.category, meal),
    meal,
    kcal: Math.max(0, Math.round(Number(nutrition.kcal) || 0)),
    protein: Math.max(0, Math.round(Number(nutrition.protein) || 0)),
    fat: Math.max(0, Math.round(Number(nutrition.fat) || 0)),
    carbs: Math.max(0, Math.round(Number(nutrition.carbs) || 0)),
    portionItems,
    clientComment: String(raw.clientNoteStructured ?? '').trim(),
    assumptions,
    micronutrients,
  }
}

export function mapGeminiComposition(raw: unknown): MealPortionItem[] {
  if (!Array.isArray(raw)) return []
  const items: MealPortionItem[] = []
  for (const entry of raw) {
    if (typeof entry === 'string') {
      items.push(...normalizePortionItems([entry]))
      continue
    }
    if (!entry || typeof entry !== 'object') continue
    const record = entry as Record<string, unknown>
    const nutrition =
      record.nutrition && typeof record.nutrition === 'object'
        ? (record.nutrition as Record<string, unknown>)
        : record
    const label = String(record.label ?? record.product ?? record.name ?? record.title ?? record.item ?? '').trim()
    if (!label) continue
    items.push({
      label: label.slice(0, 200),
      kcal: Math.max(0, Math.round(Number(nutrition.kcal) || 0)),
      protein: Math.max(0, Math.round(Number(nutrition.protein) || 0)),
      fat: Math.max(0, Math.round(Number(nutrition.fat) || 0)),
      carbs: Math.max(0, Math.round(Number(nutrition.carbs) || 0)),
    })
  }
  return items.slice(0, 40)
}
