import type { MentorRation, UpsertMentorRationRequest } from '@web-app-demo/contracts'

import { PLAN_SLOT_COUNT } from '@/platform/plan-slots'

import {
  rationDayTotals,
  type RationEntry,
  type RationGoal,
  type RationMeal,
  type RationMealSlot,
} from './rations-catalog'

export const MENTOR_RATION_SOURCE = 'Рацион наставника'

export function rationCardOrigin(
  ration: Pick<RationEntry, 'id' | 'source'>,
): 'rations' | 'mentor-rations' {
  if (ration.source === MENTOR_RATION_SOURCE || ration.id.startsWith('mentor-')) {
    return 'mentor-rations'
  }
  return 'rations'
}
export const AUTHORED_RATIONS_STORAGE_PREFIX = 'nora:mentor-authored-rations:v1:'
export const ASSIGNED_AUTHORED_RATIONS_STORAGE_PREFIX = 'nora:mentor-assigned-authored-rations:v1:'
export const RATION_MEAL_SLOTS = ['Завтрак', 'Обед', 'Перекус', 'Ужин'] as const satisfies readonly RationMealSlot[]
export const RATION_GOALS = ['Похудение', 'Набор', 'Поддержание', 'Здоровье'] as const satisfies readonly RationGoal[]

export type RationMealDraft = {
  key: string
  slot: RationMealSlot
  title: string
  ingredients: string
  stepsText: string
  image: string
  kcal: string
  protein: string
  fat: string
  carbs: string
}

export type RationDraft = {
  id: string | null
  title: string
  description: string
  goal: RationGoal
  meals: RationMealDraft[]
}

export type FinalizeRationDraftResult =
  | { ok: true; ration: RationEntry }
  | { ok: false; error: string }

let draftKeySeq = 0

function nextDraftKey() {
  draftKeySeq += 1
  return `meal-${draftKeySeq}-${Math.random().toString(36).slice(2, 8)}`
}

export function authoredRationsStorageKey(userId: string) {
  return `${AUTHORED_RATIONS_STORAGE_PREFIX}${userId}`
}

export function assignedAuthoredRationsStorageKey(userId: string) {
  return `${ASSIGNED_AUTHORED_RATIONS_STORAGE_PREFIX}${userId}`
}

export function menteePickerLabel(user: {
  displayName?: string | null
  nickname?: string | null
  email: string
}) {
  return user.displayName?.trim() || user.nickname?.trim() || user.email
}

export function menteePickerInitials(label: string) {
  const parts = label.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase()
  return `${parts[0]![0]}${parts[1]![0]}`.toUpperCase()
}

export function assignedAuthoredRationState(
  assigned: readonly RationEntry[],
  rationId: string,
): 'free' | 'same' {
  return assigned.some((item) => item.id === rationId) ? 'same' : 'free'
}

export function mergeAssignedRations(
  catalog: readonly RationEntry[],
  authored: readonly RationEntry[],
): RationEntry[] {
  const seen = new Set<string>()
  const next: RationEntry[] = []
  for (const ration of authored) {
    if (seen.has(ration.id)) continue
    seen.add(ration.id)
    next.push(ration)
  }
  for (const ration of catalog) {
    if (seen.has(ration.id)) continue
    seen.add(ration.id)
    next.push(ration)
  }
  return next
}

/** Unified Рационы Избранное: catalog + mentor cards + current library, independent of the tab. */
export function rationsForSectionTab(input: {
  tab: 'Все' | 'Избранное'
  libraryRations: readonly RationEntry[]
  catalog: readonly RationEntry[]
  authored: readonly RationEntry[]
  combineFavorites: boolean
}): readonly RationEntry[] {
  if (input.combineFavorites && input.tab === 'Избранное') {
    return mergeAssignedRations(
      input.libraryRations,
      mergeAssignedRations(input.catalog, input.authored),
    )
  }
  return input.libraryRations
}

export function emptyMealDraft(slot: RationMealSlot = 'Завтрак'): RationMealDraft {
  return {
    key: nextDraftKey(),
    slot,
    title: '',
    ingredients: '',
    stepsText: '',
    image: '',
    kcal: '',
    protein: '',
    fat: '',
    carbs: '',
  }
}

export function reorderMealDrafts<T extends { key: string }>(
  meals: readonly T[],
  fromKey: string,
  toKey: string,
): T[] {
  const fromIndex = meals.findIndex((meal) => meal.key === fromKey)
  const toIndex = meals.findIndex((meal) => meal.key === toKey)
  if (fromIndex < 0 || toIndex < 0 || fromIndex === toIndex) return meals.slice()
  const next = meals.slice()
  const [item] = next.splice(fromIndex, 1)
  next.splice(toIndex, 0, item!)
  return next
}

export function nextUnusedMealSlot(
  meals: readonly Pick<RationMealDraft, 'slot'>[],
): RationMealSlot {
  const used = new Set(meals.map((meal) => meal.slot))
  return RATION_MEAL_SLOTS.find((slot) => !used.has(slot)) ?? 'Перекус'
}

export function emptyRationDraft(): RationDraft {
  return {
    id: null,
    title: '',
    description: '',
    goal: 'Похудение',
    meals: [emptyMealDraft('Завтрак')],
  }
}

export function parseMacroField(value: string) {
  const normalized = value.trim().replace(',', '.')
  if (!normalized) return 0
  const parsed = Number(normalized)
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0
}

export function splitIngredientLines(value: string) {
  return value
    .split(/[\n;,]+/)
    .map((part) => part.replace(/\.$/, '').trim())
    .filter(Boolean)
}

export function splitStepLines(value: string) {
  return value
    .split(/\n+/)
    .map((part) => part.replace(/^\d+[.)]\s*/, '').trim())
    .filter(Boolean)
}

export function draftLineItems(value: string) {
  return value.length === 0 ? [''] : value.split('\n')
}

export function joinDraftLines(items: readonly string[]) {
  return items.join('\n')
}

export function addDraftLine(items: readonly string[], afterIndex = items.length - 1) {
  const next = items.slice()
  const insertAt = Math.min(Math.max(afterIndex + 1, 0), next.length)
  next.splice(insertAt, 0, '')
  return next
}

export function setDraftLine(items: readonly string[], index: number, text: string) {
  return items.map((item, itemIndex) => (itemIndex === index ? text : item))
}

export function removeDraftLine(items: readonly string[], index: number) {
  if (items.length <= 1) return ['']
  return items.filter((_, itemIndex) => itemIndex !== index)
}

export function moveDraftLine(items: readonly string[], index: number, direction: -1 | 1) {
  const nextIndex = index + direction
  if (index < 0 || nextIndex < 0 || nextIndex >= items.length) return items.slice()
  const next = items.slice()
  const [item] = next.splice(index, 1)
  next.splice(nextIndex, 0, item!)
  return next
}

export function mealDraftToMeal(draft: RationMealDraft): RationMeal {
  return {
    slot: draft.slot,
    title: draft.title.trim(),
    ingredients: splitIngredientLines(draft.ingredients).join(', '),
    steps: splitStepLines(draft.stepsText),
    image: draft.image.trim(),
    kcal: Math.round(parseMacroField(draft.kcal)),
    protein: Math.round(parseMacroField(draft.protein)),
    fat: Math.round(parseMacroField(draft.fat)),
    carbs: Math.round(parseMacroField(draft.carbs)),
  }
}

export function titledDraftMeals(meals: readonly RationMealDraft[]) {
  return meals.map(mealDraftToMeal).filter((meal) => meal.title.length > 0)
}

export function draftMealsWithTitles(draft: RationDraft) {
  return titledDraftMeals(draft.meals)
}

export const PLAN_DRAFT_MIN_DAYS = 1
export const PLAN_DRAFT_MAX_DAYS = PLAN_SLOT_COUNT

export function emptyPlanDayMeals(): RationMealDraft[] {
  return [emptyMealDraft('Завтрак')]
}

export function addPlanDraftDay(days: readonly RationMealDraft[][]) {
  if (days.length >= PLAN_DRAFT_MAX_DAYS) return days.map((day) => day.slice())
  return [...days.map((day) => day.slice()), emptyPlanDayMeals()]
}

export function syncPlanDraftDay(
  days: readonly RationMealDraft[][],
  index: number,
  meals: readonly RationMealDraft[],
) {
  return days.map((day, dayIndex) => (dayIndex === index ? meals.slice() : day.slice()))
}

export function trimTrailingEmptyPlanDays(days: readonly RationMealDraft[][]) {
  const next = days.map((day) => day.slice())
  while (next.length > PLAN_DRAFT_MIN_DAYS && titledDraftMeals(next[next.length - 1]!).length === 0) {
    next.pop()
  }
  return next
}

export function draftRationTotals(draft: RationDraft) {
  return rationDayTotals(draftMealsWithTitles(draft))
}

function rationImage(meals: readonly RationMeal[]) {
  return meals.find((meal) => meal.image)?.image ?? ''
}

export function previewRationFromDraft(draft: RationDraft): RationEntry {
  const meals = draftMealsWithTitles(draft)
  const totals = rationDayTotals(meals)
  const title = draft.title.trim() || 'Новый рацион'
  return {
    id: draft.id ?? 'mentor-ration-preview',
    title,
    description: draft.description.trim() || meals.map((meal) => meal.title).join(', '),
    goal: draft.goal,
    days: 1,
    mealsPerDay: meals.length,
    image: rationImage(meals),
    source: MENTOR_RATION_SOURCE,
    meals,
    ...totals,
  }
}

export function finalizeRationDraft(
  draft: RationDraft,
  ownerId: string,
  options?: { idPrefix?: string; source?: string; emptyTitleError?: string },
): FinalizeRationDraftResult {
  const title = draft.title.trim()
  if (!title) return { ok: false, error: options?.emptyTitleError ?? 'Назовите рацион' }
  const meals = draftMealsWithTitles(draft)
  if (meals.length === 0) return { ok: false, error: 'Добавьте хотя бы один приём с названием' }
  const totals = rationDayTotals(meals)
  const prefix = options?.idPrefix ?? 'mentor-'
  const id = draft.id?.trim() || `${prefix}${ownerId.slice(0, 8)}-${Date.now().toString(36)}`
  return {
    ok: true,
    ration: {
      id,
      title,
      description: draft.description.trim() || meals.map((meal) => meal.title).join(', '),
      goal: draft.goal,
      days: 1,
      mealsPerDay: meals.length,
      image: rationImage(meals),
      source: options?.source ?? MENTOR_RATION_SOURCE,
      meals,
      ...totals,
    },
  }
}

export function finalizePlanDaysDraft(
  draft: Pick<RationDraft, 'id' | 'title' | 'description' | 'goal'>,
  days: readonly RationMealDraft[][],
  ownerId: string,
  options?: { idPrefix?: string; source?: string; emptyTitleError?: string },
): { ok: true; days: RationEntry[] } | { ok: false; error: string } {
  const title = draft.title.trim()
  if (!title) return { ok: false, error: options?.emptyTitleError ?? 'Назовите рацион' }
  const trimmed = trimTrailingEmptyPlanDays(
    days.length > 0 ? days : [emptyPlanDayMeals()],
  )
  const entries: RationEntry[] = []
  for (let index = 0; index < trimmed.length; index += 1) {
    const result = finalizeRationDraft(
      {
        id: draft.id,
        title: draft.title,
        description: draft.description,
        goal: draft.goal,
        meals: trimmed[index]!,
      },
      ownerId,
      options,
    )
    if (!result.ok) {
      if (result.error === 'Добавьте хотя бы один приём с названием') {
        return { ok: false, error: `Добавьте приём в День ${index + 1}` }
      }
      return result
    }
    entries.push({
      ...result.ration,
      days: trimmed.length,
    })
  }
  return { ok: true, days: entries }
}

export function rationToDraft(ration: RationEntry): RationDraft {
  return {
    id: ration.id,
    title: ration.title,
    description: ration.description,
    goal: ration.goal,
    meals: (ration.meals.length > 0 ? ration.meals : [emptyMealDraft()]).map((meal) => ({
      key: nextDraftKey(),
      slot: meal.slot,
      title: meal.title,
      ingredients: splitIngredientLines(meal.ingredients).join('\n'),
      stepsText: 'steps' in meal ? meal.steps.join('\n') : meal.stepsText,
      image: meal.image,
      kcal: meal.kcal ? String(meal.kcal) : '',
      protein: meal.protein ? String(meal.protein) : '',
      fat: meal.fat ? String(meal.fat) : '',
      carbs: meal.carbs ? String(meal.carbs) : '',
    })),
  }
}

function isRationGoal(value: unknown): value is RationGoal {
  return value === 'Похудение' || value === 'Набор' || value === 'Поддержание' || value === 'Здоровье'
}

function isRationMealSlot(value: unknown): value is RationMealSlot {
  return value === 'Завтрак' || value === 'Обед' || value === 'Ужин' || value === 'Перекус'
}

function parseAuthoredMeal(value: unknown): RationMeal | null {
  if (!value || typeof value !== 'object') return null
  const record = value as Record<string, unknown>
  if (!isRationMealSlot(record.slot) || typeof record.title !== 'string' || !record.title.trim()) {
    return null
  }
  return {
    slot: record.slot,
    title: record.title.trim(),
    ingredients: typeof record.ingredients === 'string' ? record.ingredients : '',
    steps: Array.isArray(record.steps)
      ? record.steps.filter((step): step is string => typeof step === 'string' && step.trim().length > 0)
      : [],
    image: typeof record.image === 'string' ? record.image : '',
    kcal: Math.round(parseMacroField(String(record.kcal ?? 0))),
    protein: Math.round(parseMacroField(String(record.protein ?? 0))),
    fat: Math.round(parseMacroField(String(record.fat ?? 0))),
    carbs: Math.round(parseMacroField(String(record.carbs ?? 0))),
  }
}

export function parseAuthoredRations(value: unknown): RationEntry[] {
  if (!Array.isArray(value)) return []
  const rations: RationEntry[] = []
  for (const item of value) {
    if (!item || typeof item !== 'object') continue
    const record = item as Record<string, unknown>
    if (typeof record.id !== 'string' || !record.id.trim()) continue
    if (typeof record.title !== 'string' || !record.title.trim()) continue
    if (!isRationGoal(record.goal)) continue
    const meals = Array.isArray(record.meals)
      ? record.meals.map(parseAuthoredMeal).filter((meal): meal is RationMeal => meal != null)
      : []
    if (meals.length === 0) continue
    const totals = rationDayTotals(meals)
    rations.push({
      id: record.id,
      title: record.title.trim(),
      description:
        typeof record.description === 'string' && record.description.trim()
          ? record.description.trim()
          : meals.map((meal) => meal.title).join(', '),
      goal: record.goal,
      days: 1,
      mealsPerDay: meals.length,
      image: typeof record.image === 'string' && record.image ? record.image : rationImage(meals),
      source: MENTOR_RATION_SOURCE,
      meals,
      ...totals,
    })
  }
  return rations
}

export function testAuthoredRations(): RationEntry[] {
  return [
    authoredTestRation({
      id: 'mentor-test-light-day',
      title: 'Тестовый лёгкий день',
      description: 'Овсянка и рыба — короткий день, чтобы проверить карточку.\nЗавтрак лёгкий, обед с белком, без лишнего гарнира.',
      goal: 'Похудение',
      image: '/rations/ration-02.jpg',
      meals: [
        {
          slot: 'Завтрак',
          title: 'Овсянка с ягодами',
          ingredients: 'хлопья 50 г, ягоды 60 г, молоко 200 мл',
          steps: ['Залейте хлопья горячим молоком.', 'Добавьте ягоды перед подачей.'],
          image: '/rations/ration-02.jpg',
          kcal: 320,
          protein: 12,
          fat: 8,
          carbs: 48,
        },
        {
          slot: 'Обед',
          title: 'Треска с брокколи',
          ingredients: 'треска 160 г, брокколи 200 г, лимон',
          steps: ['Запеките рыбу 12–15 минут.', 'Подайте с брокколи на пару и лимоном.'],
          image: '/rations/ration-02-2.jpg',
          kcal: 380,
          protein: 42,
          fat: 8,
          carbs: 18,
        },
      ],
    }),
    authoredTestRation({
      id: 'mentor-test-gain-day',
      title: 'Тестовый силовой день',
      description: 'Омлет, курица и творог — плотный день для проверки редактора.\nТри приёма с запасом белка, чтобы закрыть набор без сладкого.',
      goal: 'Набор',
      image: '/rations/ration-01.jpg',
      meals: [
        {
          slot: 'Завтрак',
          title: 'Омлет со шпинатом',
          ingredients: '3 яйца, шпинат, тост 40 г',
          steps: ['Взбейте яйца со шпинатом.', 'Обжарьте 3–4 минуты и подайте с тостом.'],
          image: '/rations/ration-01.jpg',
          kcal: 420,
          protein: 28,
          fat: 24,
          carbs: 22,
        },
        {
          slot: 'Обед',
          title: 'Курица с гречкой',
          ingredients: 'филе 180 г, гречка 160 г, салат 100 г',
          steps: ['Отварите гречку.', 'Запеките филе и соберите тарелку с салатом.'],
          image: '/rations/ration-01-2.jpg',
          kcal: 620,
          protein: 52,
          fat: 14,
          carbs: 58,
        },
        {
          slot: 'Ужин',
          title: 'Творог с ягодами',
          ingredients: 'творог 5% 200 г, ягоды 70 г',
          steps: ['Выложите творог в пиалу.', 'Добавьте ягоды.'],
          image: '/rations/ration-01-3.jpg',
          kcal: 310,
          protein: 28,
          fat: 10,
          carbs: 22,
        },
      ],
    }),
  ]
}

function authoredTestRation(
  input: Omit<RationEntry, 'kcal' | 'protein' | 'fat' | 'carbs' | 'mealsPerDay' | 'days' | 'source'>,
): RationEntry {
  const totals = rationDayTotals(input.meals)
  return {
    ...input,
    days: 1,
    mealsPerDay: input.meals.length,
    source: MENTOR_RATION_SOURCE,
    image: input.meals[0]?.image || input.image,
    ...totals,
  }
}

export function ensureTestAuthoredRations(userId: string): RationEntry[] {
  const current = readAuthoredRations(userId)
  const extras = testAuthoredRations().filter((ration) => !current.some((item) => item.id === ration.id))
  if (extras.length === 0) return current
  const next = [...extras, ...current]
  writeAuthoredRations(userId, next)
  return next
}

export function readAuthoredRations(userId: string): RationEntry[] {
  if (typeof localStorage === 'undefined') return []
  try {
    const raw = localStorage.getItem(authoredRationsStorageKey(userId))
    if (!raw) return []
    return parseAuthoredRations(JSON.parse(raw) as unknown)
  } catch {
    return []
  }
}

export function writeAuthoredRations(userId: string, rations: readonly RationEntry[]) {
  if (typeof localStorage === 'undefined') return
  localStorage.setItem(authoredRationsStorageKey(userId), JSON.stringify(rations))
}

export function upsertAuthoredRation(userId: string, ration: RationEntry) {
  const next = readAuthoredRations(userId)
  const index = next.findIndex((item) => item.id === ration.id)
  if (index >= 0) next[index] = ration
  else next.unshift(ration)
  writeAuthoredRations(userId, next)
  return next
}

export function removeAuthoredRation(userId: string, rationId: string) {
  const next = readAuthoredRations(userId).filter((item) => item.id !== rationId)
  writeAuthoredRations(userId, next)
  return next
}

export function readAssignedAuthoredRations(userId: string): RationEntry[] {
  if (typeof localStorage === 'undefined') return []
  try {
    const raw = localStorage.getItem(assignedAuthoredRationsStorageKey(userId))
    if (!raw) return []
    return parseAuthoredRations(JSON.parse(raw) as unknown)
  } catch {
    return []
  }
}

export function writeAssignedAuthoredRations(userId: string, rations: readonly RationEntry[]) {
  if (typeof localStorage === 'undefined') return
  localStorage.setItem(assignedAuthoredRationsStorageKey(userId), JSON.stringify(rations))
}

export function assignAuthoredRationToUser(userId: string, ration: RationEntry) {
  const current = readAssignedAuthoredRations(userId)
  if (assignedAuthoredRationState(current, ration.id) === 'same') {
    return { kind: 'same' as const, rations: current }
  }
  const next = [ration, ...current]
  writeAssignedAuthoredRations(userId, next)
  return { kind: 'assigned' as const, rations: next }
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export function isAuthoredRationId(value: string) {
  return UUID_RE.test(value)
}

export function mentorRationToEntry(ration: MentorRation): RationEntry {
  return {
    id: ration.id,
    title: ration.title,
    description: ration.description,
    goal: ration.goal,
    days: ration.days,
    kcal: ration.kcal,
    protein: ration.protein,
    fat: ration.fat,
    carbs: ration.carbs,
    mealsPerDay: ration.mealsPerDay,
    image: ration.image,
    source: ration.source || MENTOR_RATION_SOURCE,
    meals: ration.meals,
  }
}

export function rationToUpsertRequest(
  ration: Pick<RationEntry, 'title' | 'description' | 'goal' | 'meals'>,
): UpsertMentorRationRequest {
  return {
    title: ration.title,
    description: ration.description,
    goal: ration.goal,
    meals: ration.meals,
  }
}

export async function importLocalAuthoredRationsIfNeeded(
  userId: string,
  create: (input: UpsertMentorRationRequest) => Promise<unknown>,
) {
  if (typeof localStorage === 'undefined') return
  const flagKey = `${AUTHORED_RATIONS_STORAGE_PREFIX}imported:${userId}`
  if (localStorage.getItem(flagKey)) return
  const local = readAuthoredRations(userId)
  if (local.length === 0) {
    localStorage.setItem(flagKey, '1')
    return
  }
  for (const ration of local) {
    await create(rationToUpsertRequest(ration))
  }
  localStorage.setItem(flagKey, '1')
}
