import { randomUUID } from 'node:crypto'

import {
  normalizeMicronutrients,
  type MealCategory,
  type MealMicronutrient,
  type MealPortionItem,
  type MealSlot,
  type MealVersion,
} from '@web-app-demo/contracts'

import { preserveMealShareAssumptions, RATION_DIARY_DONE_MARK } from './meal-share'

export type MealVersionRecord = MealVersion & {
  extraImageKeys?: string[]
}

/** Each person may correct one card twice. The original version is not a correction. */
export const MEAL_CORRECTIONS_PER_ACTOR = 2

export type MealCorrectionActor = 'user' | 'mentor'

export function mealVersionLabel(ordinal: number) {
  return `vers. ${ordinal}.0`
}

export type MealVersionSnapshotFields = {
  title: string
  ingredients: string
  category: MealCategory
  mealSlot: MealSlot
  kcal: number
  protein: number
  fat: number
  carbs: number
  portionItems: MealPortionItem[]
  clientComment: string
  assumptions: string[]
  micronutrients: MealMicronutrient[]
}

export type MealWithVersions = MealVersionSnapshotFields & {
  createdAt: Date
  extraImageKeys?: string[]
  versions: MealVersionRecord[]
  activeVersionId: string | null
}

export function extraImageKeysOf(version: { extraImageKeys?: readonly string[] } | undefined) {
  if (!Array.isArray(version?.extraImageKeys)) return []
  return version.extraImageKeys.map((key) => String(key ?? '').trim()).filter(Boolean).slice(0, 10)
}

export function extraImageKeysForActiveVersion(
  versions: readonly MealVersionRecord[],
  activeVersionId: string | null | undefined,
) {
  const active =
    (activeVersionId ? versions.find((version) => version.id === activeVersionId) : undefined)
    ?? versions.at(-1)
  return extraImageKeysOf(active)
}

export function mealSnapshot(meal: MealVersionSnapshotFields) {
  return {
    title: meal.title,
    ingredients: meal.ingredients,
    category: meal.category,
    meal: meal.mealSlot,
    kcal: meal.kcal,
    protein: meal.protein,
    fat: meal.fat,
    carbs: meal.carbs,
    portionItems: [...meal.portionItems],
    clientComment: meal.clientComment,
    assumptions: sanitizeAssumptions(meal.assumptions, meal.portionItems),
    micronutrients: normalizeMicronutrients(meal.micronutrients),
  }
}

export function sanitizeAssumptions(
  assumptions: readonly string[] | undefined,
  portionItems?: readonly MealPortionItem[],
): string[] {
  const kept: string[] = []
  const seen = new Set<string>()

  for (const raw of assumptions ?? []) {
    const line = String(raw ?? '').trim()
    if (!line || /^Состав\s*:/i.test(line)) continue
    const key = normalizeAssumptionKey(line)
    if (
      !key
      || key.startsWith('уточнение в чате')
      || isChatMetaAssumption(line)
      || isRedundantAssumption(key, portionItems)
      || seen.has(key)
    ) {
      continue
    }
    seen.add(key)
    kept.push(line)
  }

  return kept
}

export function ensureMealVersions<T extends MealWithVersions>(meal: T): T {
  const assumptions = sanitizeAssumptions(meal.assumptions, meal.portionItems)
  const micronutrients = normalizeMicronutrients(meal.micronutrients)
  const base = { ...meal, assumptions, micronutrients }

  if (Array.isArray(base.versions) && base.versions.length > 0) {
    const versions = base.versions.map((version) => ({
      ...version,
      extraImageKeys: extraImageKeysOf(version),
      snapshot: {
        ...version.snapshot,
        assumptions: sanitizeAssumptions(version.snapshot.assumptions, version.snapshot.portionItems),
        micronutrients: normalizeMicronutrients(version.snapshot.micronutrients),
      },
    }))
    const active =
      base.activeVersionId && versions.some((version) => version.id === base.activeVersionId)
        ? base.activeVersionId
        : versions[versions.length - 1]!.id
    return {
      ...base,
      extraImageKeys: extraImageKeysForActiveVersion(versions, active),
      versions,
      activeVersionId: active,
    }
  }

  const id = randomUUID()
  const extraImageKeys = extraImageKeysOf({ extraImageKeys: base.extraImageKeys })
  return {
    ...base,
    extraImageKeys,
    versions: [
      {
        id,
        createdAt: base.createdAt.toISOString(),
        label: mealVersionLabel(1),
        extraImageKeys,
        snapshot: mealSnapshot(base),
      },
    ],
    activeVersionId: id,
  }
}

export function appendMealVersion<T extends MealWithVersions>(
  meal: T,
  message: string,
  authorRole: MealCorrectionActor = 'user',
): T {
  const versions = Array.isArray(meal.versions) ? meal.versions : []
  const id = randomUUID()
  const extraImageKeys = extraImageKeysOf({ extraImageKeys: meal.extraImageKeys })
  return {
    ...meal,
    extraImageKeys,
    versions: [
      ...versions,
      {
        id,
        createdAt: new Date().toISOString(),
        label: mealVersionLabel(versions.length + 1),
        note: String(message || '').trim().slice(0, 120) || undefined,
        authorRole,
        extraImageKeys,
        snapshot: mealSnapshot(meal),
      },
    ],
    activeVersionId: id,
  }
}

/** Refinements after the original card. Older cards without an author count as the user's. */
export function mealCorrectionCount(
  versions: readonly { authorRole?: MealCorrectionActor }[],
  actor: MealCorrectionActor,
) {
  return versions
    .slice(1)
    .filter((version) => (version.authorRole ?? 'user') === actor).length
}

export function applyMealSnapshot<T extends MealWithVersions>(
  meal: T,
  snapshot: MealVersion['snapshot'],
): T {
  return {
    ...meal,
    title: snapshot.title,
    ingredients: snapshot.ingredients,
    category: snapshot.category,
    mealSlot: snapshot.meal,
    kcal: snapshot.kcal,
    protein: snapshot.protein,
    fat: snapshot.fat,
    carbs: snapshot.carbs,
    portionItems: [...snapshot.portionItems],
    clientComment: snapshot.clientComment,
    assumptions: [...snapshot.assumptions],
    micronutrients: normalizeMicronutrients(snapshot.micronutrients),
  }
}

/** Older snapshots keep food, not whether this plate is still on the ration. */
function assumptionsAfterVersionSelect(
  current: readonly string[],
  snapshot: readonly string[],
): string[] {
  const merged = preserveMealShareAssumptions(current, snapshot)
  const currentDone = current.some((line) => line.trim() === RATION_DIARY_DONE_MARK)
  if (currentDone) return merged
  return merged.filter((line) => line.trim() !== RATION_DIARY_DONE_MARK)
}

export function selectMealVersion<T extends MealWithVersions>(
  meal: T,
  versionId: string,
): T | null {
  const ensured = ensureMealVersions(meal)
  const version = ensured.versions.find((item) => item.id === versionId)
  if (!version) return null
  const applied = applyMealSnapshot(ensured, version.snapshot)
  return {
    ...applied,
    assumptions: assumptionsAfterVersionSelect(ensured.assumptions, version.snapshot.assumptions),
    extraImageKeys: extraImageKeysOf(version),
    versions: ensured.versions,
    activeVersionId: versionId,
  }
}

/** Editor save replaces the plate and drops chat history. Plan stamps stay. */
export function replaceMealPlate<T extends MealWithVersions>(
  meal: T,
  plate: Omit<MealVersionSnapshotFields, 'assumptions' | 'micronutrients'>,
): T {
  const ensured = ensureMealVersions(meal)
  const id = randomUUID()
  const extraImageKeys = extraImageKeysOf({ extraImageKeys: ensured.extraImageKeys })
  return {
    ...ensured,
    title: plate.title,
    ingredients: plate.ingredients,
    category: plate.category,
    mealSlot: plate.mealSlot,
    kcal: plate.kcal,
    protein: plate.protein,
    fat: plate.fat,
    carbs: plate.carbs,
    portionItems: [...plate.portionItems],
    clientComment: plate.clientComment,
    extraImageKeys,
    versions: [
      {
        id,
        createdAt: new Date().toISOString(),
        label: mealVersionLabel(1),
        extraImageKeys,
        snapshot: mealSnapshot({
          ...plate,
          assumptions: ensured.assumptions,
          micronutrients: ensured.micronutrients,
        }),
      },
    ],
    activeVersionId: id,
  }
}

export function canRefineMeal(meal: MealWithVersions, actor: MealCorrectionActor = 'user'): boolean {
  const versions = ensureMealVersions(meal).versions
  return mealCorrectionCount(versions, actor) < MEAL_CORRECTIONS_PER_ACTOR
}

function normalizeAssumptionKey(value: string) {
  return String(value || '')
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/[<>«»"']/g, '')
    .replace(/\s+/g, ' ')
    .replace(/(\d+)\s*г(?:р|рамм)?\.?/gi, '$1г')
    .trim()
}

function isChatMetaAssumption(value: string) {
  const normalized = normalizeAssumptionKey(value)
  return (
    normalized.startsWith('уточнение в чате')
    || (normalized.includes('учтен') && normalized.includes('по фото'))
    || normalized.includes('приложено фото состава')
    || (normalized.includes('этикетк') && normalized.includes('чат'))
  )
}

const MAX_ASSUMPTION_CHARS = 72

function isRedundantAssumption(key: string, portionItems?: readonly MealPortionItem[]) {
  if (key.length > MAX_ASSUMPTION_CHARS) return true
  if (/добавлен/.test(key) && /(к приему|прием пищи|в состав|к карточк)/.test(key)) return true
  if (/приготовлен\S*\s+с использованием/.test(key)) return true
  if (!portionItems?.length) return false
  if (!/(добавлен|весом около|около \d+г)/.test(key)) return false
  return portionItems.some((item) => {
    const name = normalizeAssumptionKey(item.label).replace(/~?\s*\d+г.*$/, '').trim()
    const token = name.split(' ')[0] ?? ''
    return token.length >= 4 && key.includes(token)
  })
}
