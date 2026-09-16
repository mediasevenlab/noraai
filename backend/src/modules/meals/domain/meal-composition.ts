import type { MealCategory, MealMicronutrient, MealPortionItem, MealSlot } from '@web-app-demo/contracts'

export const REFINE_ATTACH_PHOTO_INSTRUCTION =
  'Добавь к текущему составу продукты с приложенного фото. Существующие позиции не удаляй. Пересчитай КБЖУ на объединённый приём.'

export type MealCompositionFields = {
  title: string
  ingredients: string
  category: MealCategory
  meal: MealSlot
  kcal: number
  protein: number
  fat: number
  carbs: number
  portionItems: MealPortionItem[]
  clientComment: string
  assumptions: string[]
  micronutrients: MealMicronutrient[]
}

export function portionItemKey(label: string) {
  return label
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/[~≈]/g, ' ')
    .replace(/\d+(?:[.,]\d+)?\s*(?:кг|г|шт|мл|л)/gi, ' ')
    .replace(/по вкусу/gi, ' ')
    .replace(/[^a-zа-я0-9]+/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function mergeAdditivePortionItems(
  current: readonly MealPortionItem[],
  incoming: readonly MealPortionItem[],
): MealPortionItem[] {
  const merged = current.map((item) => ({ ...item }))
  const keys = new Set(merged.map((item) => portionItemKey(item.label)).filter(Boolean))
  for (const item of incoming) {
    const key = portionItemKey(item.label)
    if (!key || keys.has(key)) continue
    keys.add(key)
    merged.push({ ...item })
  }
  return merged
}

export function excerptFromPortionItems(items: readonly MealPortionItem[]) {
  return items
    .map((item) =>
      item.label
        .replace(/[~≈]?\s*\d+(?:[.,]\d+)?\s*(?:кг|г|шт|мл|л)/gi, '')
        .replace(/\s*[—–-]\s*$/g, '')
        .replace(/\s+/g, ' ')
        .trim(),
    )
    .filter(Boolean)
    .join(', ')
}

function sumPortionMacros(items: readonly MealPortionItem[]) {
  return items.reduce(
    (acc, item) => ({
      kcal: acc.kcal + item.kcal,
      protein: acc.protein + item.protein,
      fat: acc.fat + item.fat,
      carbs: acc.carbs + item.carbs,
    }),
    { kcal: 0, protein: 0, fat: 0, carbs: 0 },
  )
}

function titleKeepsOriginal(original: string, incoming: string) {
  const from = original.trim().toLowerCase().replace(/ё/g, 'е')
  const to = incoming.trim().toLowerCase().replace(/ё/g, 'е')
  return from.length > 0 && to.includes(from)
}

/** Photo refine must augment the current plate, not replace it with the new frame. */
export function applyAdditivePhotoRefine(
  current: MealCompositionFields,
  incoming: MealCompositionFields,
): MealCompositionFields {
  const currentKeys = new Set(
    current.portionItems.map((item) => portionItemKey(item.label)).filter(Boolean),
  )
  const incomingKeys = new Set(
    incoming.portionItems.map((item) => portionItemKey(item.label)).filter(Boolean),
  )
  const restored = [...currentKeys].some((key) => !incomingKeys.has(key))
  if (!restored) return incoming

  const mergedItems = mergeAdditivePortionItems(current.portionItems, incoming.portionItems)
  const added = incoming.portionItems.filter((item) => {
    const key = portionItemKey(item.label)
    return Boolean(key) && !currentKeys.has(key)
  })
  const extra = sumPortionMacros(added)
  const extraFromCard =
    extra.kcal === 0 && extra.protein === 0 && extra.fat === 0 && extra.carbs === 0
  const addedMacros = extraFromCard && added.length > 0
    ? {
        kcal: incoming.kcal,
        protein: incoming.protein,
        fat: incoming.fat,
        carbs: incoming.carbs,
      }
    : extra

  return {
    ...incoming,
    title: titleKeepsOriginal(current.title, incoming.title) ? incoming.title : current.title,
    ingredients: excerptFromPortionItems(mergedItems) || incoming.ingredients,
    category: current.category,
    meal: current.meal,
    kcal: current.kcal + addedMacros.kcal,
    protein: current.protein + addedMacros.protein,
    fat: current.fat + addedMacros.fat,
    carbs: current.carbs + addedMacros.carbs,
    portionItems: mergedItems,
  }
}
