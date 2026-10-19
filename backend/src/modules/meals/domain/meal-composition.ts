import type { MealCategory, MealMicronutrient, MealPortionItem, MealSlot } from '@web-app-demo/contracts'

import { estimatePortionMacros, foodWordsMatch } from './nora-meal'

export const REFINE_ATTACH_PHOTO_INSTRUCTION =
  'Добавь к текущему составу продукты с приложенного фото. Существующие позиции не удаляй. Пересчитай КБЖУ на объединённый приём.'

export const REFINE_REPLACE_PHOTO_INSTRUCTION =
  'Новые фото заменяют текущий приём и его снимок. Опиши только то, что на них, и не переноси продукты со старой карточки.'

/** Photo plus a phrase like «добавь это к текущему приёму» keeps the plate and the gallery. */
export function photoAttachKeepsCurrentMeal(message: string) {
  const text = message.toLowerCase().replace(/ё/g, 'е').replace(/\s+/g, ' ').trim()
  if (!text) return false
  if (/не\s+замен/.test(text)) return true
  if (/добав[а-я]*(?:\s+\S+){0,6}\s+к\s+(?:текущ|уже|эт(?:от|ому|им)|существующ)/.test(text)) {
    return true
  }
  if (/добав[а-я]*(?:\s+\S+){0,6}\s+к\s+(?:этому\s+)?прием/.test(text)) return true
  if (/дополн[а-я]*(?:\s+\S+){0,4}\s+(?:этот\s+|текущ[а-я]*\s+|уже\s+)?прием/.test(text)) {
    return true
  }
  if (/дополн[а-я]*(?:\s+\S+){0,3}\s+(?:текущ|этот|уже)/.test(text)) return true
  if (/прибав[а-я]*(?:\s+\S+){0,4}\s+к\s+(?:текущ|прием|уже)/.test(text)) return true
  if (/остав[а-я]*(?:\s+\S+){0,4}\s+добав/.test(text)) return true
  return false
}

const DISPLAY_PORTION_GRAMS = [120, 80, 60, 40, 30, 20]

/**
 * Ration cards often store the plate only as an ingredient list.
 * The diary then shows one line per product and splits the header across those lines.
 * A correction has to edit that same list.
 */
export function portionItemsShownOnCard(meal: {
  ingredients: string
  portionItems: readonly MealPortionItem[]
  kcal: number
  protein: number
  fat: number
  carbs: number
}): MealPortionItem[] {
  const stored = meal.portionItems.filter((item) => item.label.trim())
  if (stored.some((item) => item.kcal + item.protein + item.fat + item.carbs > 0)) {
    return stored.map((item) => ({ ...item }))
  }
  const labels = stored.length
    ? stored.map((item) => item.label)
    : ingredientLines(meal.ingredients).map((part, index) => {
        const grams = DISPLAY_PORTION_GRAMS[index] ?? 25
        return `${part} ~${grams} г`
      })
  if (labels.length === 0) return []
  return distributeDisplayedMacros(labels, meal)
}

function ingredientLines(ingredients: string) {
  const lines: string[] = []
  for (const part of splitIngredientParts(ingredients)) {
    if (isCulinaryNote(part)) {
      if (lines.length > 0) lines[lines.length - 1] = `${lines[lines.length - 1]}, ${part}`
      continue
    }
    lines.push(part)
  }
  return lines
}

function splitIngredientParts(ingredients: string) {
  const source = ingredients.replace(/(\d),(\d)/g, '$1\u2060$2')
  const parts: string[] = []
  let buffer = ''
  let depth = 0
  const flush = () => {
    const part = buffer.trim().replace(/\.$/, '').replaceAll('\u2060', ',')
    buffer = ''
    if (part) parts.push(part)
  }
  for (const char of source) {
    if (char === '(') depth += 1
    else if (char === ')') depth = Math.max(0, depth - 1)
    if (depth === 0 && (char === ',' || char === ';' || char === '\n')) {
      flush()
      continue
    }
    buffer += char
  }
  flush()
  return parts
}

function isCulinaryNote(part: string) {
  const text = part.trim().replace(/\.$/, '').replace(/\s+/g, ' ')
  if (!text) return true
  if (/^для(\s|$)/i.test(text)) return true
  if (/^в\s+(тесто|начинку|брикетах)(\s|$)/i.test(text)) return true
  if (/^(по вкусу|по желанию|или по вкусу)(\s|$)/i.test(text)) return true
  if (/^(молотый|свежий|сок и цедра|цедра|без горки)(\s|$)/i.test(text)) return true
  if (/^[cс][о0]$/i.test(text)) return true
  if (/^размер\s*с[о0]$/i.test(text)) return true
  if (/^\d+([.,]\d+)?\s*%$/.test(text)) return true
  if (/(в тесто|в начинку|для подачи|для обсыпки|для соуса)/i.test(text) && !/[–—-]/.test(text)) {
    return true
  }
  return false
}

function distributeDisplayedMacros(
  labels: string[],
  totals: { kcal: number; protein: number; fat: number; carbs: number },
): MealPortionItem[] {
  const parsed = labels.map(firstPortionGrams)
  const hasWeights = parsed.every((grams) => grams != null && grams > 0)
  const shares = hasWeights ? parsed.map((grams) => grams ?? 1) : labels.map(() => 1)
  const shareSum = shares.reduce((sum, value) => sum + value, 0)
  const items: MealPortionItem[] = labels.map((label) => ({
    label,
    kcal: 0,
    protein: 0,
    fat: 0,
    carbs: 0,
  }))
  for (const key of ['kcal', 'protein', 'fat', 'carbs'] as const) {
    let allocated = 0
    for (let index = 0; index < items.length; index += 1) {
      if (index === items.length - 1) {
        items[index]![key] = Math.max(0, totals[key] - allocated)
        break
      }
      const value = Math.round((totals[key] * shares[index]!) / shareSum)
      items[index]![key] = value
      allocated += value
    }
  }
  return items
}

function firstPortionGrams(label: string) {
  const match = label.match(/(\d+(?:[.,]\d+)?)\s*г/i)
  if (!match?.[1]) return null
  const grams = Number(match[1].replace(',', '.'))
  return Number.isFinite(grams) && grams > 0 ? grams : null
}

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

type PortionEditKind = 'remove' | 'add' | 'change'

function foldEditText(value: string) {
  return value.toLowerCase().replace(/ё/g, 'е').replace(/[^a-zа-я0-9]+/giu, ' ').replace(/\s+/g, ' ').trim()
}

function wordsMatch(left: string, right: string) {
  return foodWordsMatch(left, right)
}

function foodWords(label: string) {
  return portionItemKey(label)
    .split(' ')
    .filter((word) => word.length >= 3)
}

function lineScore(label: string, text: string) {
  const tokens = foldEditText(text).split(' ').filter((word) => word.length >= 3)
  return foodWords(label).filter((word) => tokens.some((token) => wordsMatch(word, token))).length
}

function verbKind(part: string): PortionEditKind | null {
  if (/^(?:убери|удали|убрать|без)(?:\s|$)/u.test(part)) return 'remove'
  if (/^(?:добав\p{L}*|прибав\p{L}*)(?:\s|$)/u.test(part)) return 'add'
  if (/^(?:убав\p{L}*|уменьш\p{L}*|поменьше|увелич\p{L}*|побольше|замени\p{L}*|вместо)(?:\s|$)/u.test(part)) {
    return 'change'
  }
  return null
}

/** Add, remove, or resize. A fresh description of the plate is not an edit. */
export function isPortionEdit(message: string) {
  const text = foldEditText(message).replace(/^бери(?=\s|$)/u, 'убери')
  return /(?:^|\s)(?:убери|удали|убрать|без|добав\p{L}*|прибав\p{L}*|убав\p{L}*|уменьш\p{L}*|поменьше|увелич\p{L}*|побольше|замени\p{L}*|вместо)(?:\s|$)/u.test(
    text,
  )
}

function editClauses(message: string) {
  const text = foldEditText(message).replace(/^бери(?=\s|$)/u, 'убери')
  const parts = text.split(/\s+и\s+|,/u).map((part) => part.trim()).filter(Boolean)
  let current: PortionEditKind | null = null
  const clauses: Array<{ kind: PortionEditKind; text: string }> = []
  for (const part of parts) {
    const kind = verbKind(part) ?? (/(?:^|\s)(?:убери|удали|убрать|без)(?:\s|$)/u.test(part)
      ? 'remove'
      : /(?:^|\s)(?:добав\p{L}*|прибав\p{L}*)(?:\s|$)/u.test(part)
        ? 'add'
        : /(?:^|\s)(?:убав\p{L}*|уменьш\p{L}*|поменьше|увелич\p{L}*|побольше|замени\p{L}*|вместо)(?:\s|$)/u.test(part)
          ? 'change'
          : null)
    if (kind) current = kind
    if (current) clauses.push({ kind: current, text: part })
  }
  return clauses
}

function clauseForLine(label: string, clauses: Array<{ kind: PortionEditKind; text: string }>) {
  let best: { kind: PortionEditKind; text: string; score: number } | null = null
  for (const clause of clauses) {
    const score = lineScore(label, clause.text)
    if (score <= 0) continue
    if (!best || score > best.score || (score === best.score && clause.kind === 'remove')) {
      best = { kind: clause.kind, text: clause.text, score }
    }
  }
  return best
}

function withLineMacros(item: MealPortionItem): MealPortionItem {
  if (item.kcal + item.protein + item.fat + item.carbs > 0) return item
  const estimated = estimatePortionMacros(item.label)
  return estimated ? { ...item, ...estimated } : item
}

/**
 * A text add or removal keeps every line the person did not name.
 * Those lines keep their weight and macros. The total is the sum of what remains.
 */
export function applyTextPortionEdit(
  current: MealCompositionFields,
  incoming: MealCompositionFields,
  message: string,
): MealCompositionFields | null {
  if (!isPortionEdit(message) || current.portionItems.length === 0) return null
  const clauses = editClauses(message)
  if (clauses.length === 0) return null
  const pairs: Array<{ currentIndex: number; incomingIndex: number; score: number }> = []
  current.portionItems.forEach((item, currentIndex) => {
    incoming.portionItems.forEach((candidate, incomingIndex) => {
      const exact =
        portionItemKey(item.label) !== '' && portionItemKey(item.label) === portionItemKey(candidate.label)
      const score = lineScore(item.label, candidate.label)
      if (score <= 0 && !exact) return
      pairs.push({ currentIndex, incomingIndex, score: exact ? score + 5 : score })
    })
  })
  pairs.sort((left, right) => right.score - left.score)
  const matchedIncoming = new Map<number, number>()
  const usedIncoming = new Set<number>()
  for (const pair of pairs) {
    if (matchedIncoming.has(pair.currentIndex) || usedIncoming.has(pair.incomingIndex)) continue
    matchedIncoming.set(pair.currentIndex, pair.incomingIndex)
    usedIncoming.add(pair.incomingIndex)
  }
  const portionItems: MealPortionItem[] = []
  current.portionItems.forEach((item, index) => {
    const clause = clauseForLine(item.label, clauses)
    if (clause?.kind === 'remove') return
    if (clause?.kind === 'change' && /замени|вместо/u.test(clause.text)) return
    const incomingIndex = matchedIncoming.get(index)
    if ((clause?.kind === 'add' || clause?.kind === 'change') && incomingIndex != null) {
      portionItems.push(withLineMacros(incoming.portionItems[incomingIndex]!))
      return
    }
    portionItems.push({ ...item })
  })
  const acceptsNewFoods = clauses.some(
    (clause) => clause.kind === 'add' || (clause.kind === 'change' && /замени|вместо/u.test(clause.text)),
  )
  if (acceptsNewFoods) {
    incoming.portionItems.forEach((item, index) => {
      if (usedIncoming.has(index)) return
      if (portionItems.some((kept) => portionItemKey(kept.label) === portionItemKey(item.label))) return
      portionItems.push(withLineMacros(item))
    })
  }
  if (portionItems.length === 0) return null
  const totals = sumPortionMacros(portionItems)
  const summed = totals.kcal + totals.protein + totals.fat + totals.carbs > 0
  return {
    ...incoming,
    title: current.title,
    ingredients: excerptFromPortionItems(portionItems) || current.ingredients,
    category: current.category,
    meal: current.meal,
    kcal: summed ? totals.kcal : current.kcal,
    protein: summed ? totals.protein : current.protein,
    fat: summed ? totals.fat : current.fat,
    carbs: summed ? totals.carbs : current.carbs,
    portionItems,
  }
}

/** Only when the user asked to add the new photo onto the current meal. */
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
