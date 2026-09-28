import { rationDayTotals, type RationEntry, type RationMealSlot } from './rations-catalog'
import { MENTOR_RATION_SOURCE, testAuthoredRations } from './authored-rations'

export type AuthMentorDemoMeal = {
  slot: RationMealSlot
  title: string
  macros: { kcal: string; protein: string; fat: string; carbs: string }
  ingredients: readonly string[]
  steps: readonly string[]
  image: string
}

export const AUTH_MENTOR_CREATE_MEALS: readonly AuthMentorDemoMeal[] = [
  {
    slot: 'Завтрак',
    title: 'Кабачки в сметане',
    macros: { kcal: '420', protein: '18', fat: '24', carbs: '32' },
    ingredients: ['кабачок 250 г', 'сметана 40 г', 'сыр 30 г', 'яйцо 1 шт.'],
    steps: [
      'Нарежьте кабачки кружками и выложите в форму',
      'Смешайте сметану с яйцом и залейте овощи',
      'Посыпьте сыром и запеките 20 минут',
    ],
    image: '/rations/mn-mentor-01.jpg',
  },
  {
    slot: 'Обед',
    title: 'Куриные отбивные с помидором',
    macros: { kcal: '560', protein: '48', fat: '22', carbs: '28' },
    ingredients: ['грудка 180 г', 'помидор 80 г', 'сыр 30 г', 'сухари 20 г'],
    steps: [
      'Отбейте грудку и обваляйте в сухарях',
      'Выложите кружки помидора и сыр сверху',
      'Запеките в духовке 18 минут до румяной корочки',
    ],
    image: '/rations/mn-mentor-02.jpg',
  },
  {
    slot: 'Ужин',
    title: 'Скумбрия на мангале',
    macros: { kcal: '520', protein: '36', fat: '38', carbs: '4' },
    ingredients: ['скумбрия 220 г', 'лимон', 'соль и перец', 'зелень'],
    steps: [
      'Натрите рыбу солью, перцем и соком лимона',
      'Выложите на решётку и запеките 15–18 минут',
      'Подайте со свежей зеленью',
    ],
    image: '/rations/mn-mentor-03.jpg',
  },
]

export const AUTH_MENTOR_CREATE_SCRIPT = {
  title: 'Лёгкий день 1500',
  description: 'Кабачки, куриные отбивные и скумбрия — день с Меню недели',
  goal: 'Похудение' as const,
} as const

export const AUTH_MENTOR_CREATE_DEMO = {
  listSettleMs: 880,
  createPressMs: 280,
  afterOpenMs: 420,
  fieldSettleMs: 320,
  typeStepMs: 28,
  afterFieldMs: 240,
  tabPressMs: 240,
  afterTabMs: 280,
  macroShowMs: 280,
  lineSettleMs: 160,
  addMealPressMs: 240,
  afterAddMealMs: 280,
  /** Pause so the new meal tab is visible before the next one appears. */
  slotRevealHoldMs: 720,
  savePressMs: 280,
  afterSaveMs: 720,
  savedHoldMs: 1400,
} as const

function typedLength(text: string) {
  return Array.from(text).length
}

function typedSlice(text: string, ms: number, startAt: number) {
  if (ms < startAt) return ''
  const chars = Math.floor((ms - startAt) / AUTH_MENTOR_CREATE_DEMO.typeStepMs) + 1
  return Array.from(text).slice(0, Math.max(0, chars)).join('')
}

function typeDurationMs(text: string) {
  return typedLength(text) * AUTH_MENTOR_CREATE_DEMO.typeStepMs
}

function linesDoneAtMs(lines: readonly string[], startAt: number) {
  let at = startAt
  for (let index = 0; index < lines.length; index += 1) {
    at += typeDurationMs(lines[index]!)
    if (index < lines.length - 1) at += AUTH_MENTOR_CREATE_DEMO.lineSettleMs
  }
  return at
}

function linesProgressAt(lines: readonly string[], ms: number, startAt: number) {
  const out: string[] = []
  let at = startAt
  for (const line of lines) {
    if (ms < at) break
    out.push(typedSlice(line, ms, at))
    const doneAt = at + typeDurationMs(line)
    if (ms < doneAt) break
    at = doneAt + AUTH_MENTOR_CREATE_DEMO.lineSettleMs
  }
  return out
}

function lineStartAtMs(lines: readonly string[], startAt: number, lineIndex: number) {
  let at = startAt
  for (let index = 0; index < lineIndex; index += 1) {
    at += typeDurationMs(lines[index]!) + AUTH_MENTOR_CREATE_DEMO.lineSettleMs
  }
  return at
}

export function authMentorCreateExistingRation() {
  return testAuthoredRations()[0]!
}

function mealToRationMeal(meal: AuthMentorDemoMeal) {
  return {
    slot: meal.slot,
    title: meal.title,
    ingredients: meal.ingredients.join(', '),
    steps: [...meal.steps],
    image: meal.image,
    kcal: Number(meal.macros.kcal),
    protein: Number(meal.macros.protein),
    fat: Number(meal.macros.fat),
    carbs: Number(meal.macros.carbs),
  }
}

export function authMentorCreateDraftRation(): RationEntry {
  const meals = AUTH_MENTOR_CREATE_MEALS.map(mealToRationMeal)
  const totals = rationDayTotals(meals)
  return {
    id: 'auth-demo-mentor-created',
    title: AUTH_MENTOR_CREATE_SCRIPT.title,
    description: AUTH_MENTOR_CREATE_SCRIPT.description,
    goal: AUTH_MENTOR_CREATE_SCRIPT.goal,
    days: 1,
    mealsPerDay: meals.length,
    image: meals[0]?.image ?? '',
    source: MENTOR_RATION_SOURCE,
    meals,
    ...totals,
  }
}

export function authMentorCreatePressAtMs() {
  return AUTH_MENTOR_CREATE_DEMO.listSettleMs
}

export function authMentorCreateOpenAtMs() {
  return (
    authMentorCreatePressAtMs() +
    AUTH_MENTOR_CREATE_DEMO.createPressMs +
    AUTH_MENTOR_CREATE_DEMO.afterOpenMs
  )
}

export function authMentorCreateTitleStartAtMs() {
  return authMentorCreateOpenAtMs() + AUTH_MENTOR_CREATE_DEMO.fieldSettleMs
}

export function authMentorCreateTitleDoneAtMs() {
  return authMentorCreateTitleStartAtMs() + typeDurationMs(AUTH_MENTOR_CREATE_SCRIPT.title)
}

export function authMentorCreateDescStartAtMs() {
  return authMentorCreateTitleDoneAtMs() + AUTH_MENTOR_CREATE_DEMO.afterFieldMs
}

export function authMentorCreateDescDoneAtMs() {
  return authMentorCreateDescStartAtMs() + typeDurationMs(AUTH_MENTOR_CREATE_SCRIPT.description)
}

export function authMentorCreateMealTabPressAtMs(index = 0): number {
  if (index <= 0) {
    return authMentorCreateDescDoneAtMs() + AUTH_MENTOR_CREATE_DEMO.afterFieldMs
  }
  return authMentorCreateAddMealAtMs(index - 1)
}

export function authMentorCreateMealTabAtMs(index = 0): number {
  return authMentorCreateMealTabPressAtMs(index) + AUTH_MENTOR_CREATE_DEMO.tabPressMs
}

export function authMentorCreateMealTitleStartAtMs(index = 0): number {
  return authMentorCreateMealTabAtMs(index) + AUTH_MENTOR_CREATE_DEMO.afterTabMs
}

export function authMentorCreateMealTitleDoneAtMs(index = 0): number {
  const meal = AUTH_MENTOR_CREATE_MEALS[index]!
  return authMentorCreateMealTitleStartAtMs(index) + typeDurationMs(meal.title)
}

export function authMentorCreateMacrosAtMs(index = 0): number {
  return authMentorCreateMealTitleDoneAtMs(index) + AUTH_MENTOR_CREATE_DEMO.afterFieldMs
}

export function authMentorCreateIngredientStartAtMs(index = 0, lineIndex = 0): number {
  const meal = AUTH_MENTOR_CREATE_MEALS[index]!
  const start = authMentorCreateMacrosAtMs(index) + AUTH_MENTOR_CREATE_DEMO.macroShowMs
  return lineStartAtMs(meal.ingredients, start, lineIndex)
}

export function authMentorCreateIngredientDoneAtMs(index = 0): number {
  const meal = AUTH_MENTOR_CREATE_MEALS[index]!
  return linesDoneAtMs(meal.ingredients, authMentorCreateIngredientStartAtMs(index))
}

export function authMentorCreateStepStartAtMs(index = 0, lineIndex = 0): number {
  const meal = AUTH_MENTOR_CREATE_MEALS[index]!
  const start = authMentorCreateIngredientDoneAtMs(index) + AUTH_MENTOR_CREATE_DEMO.lineSettleMs
  return lineStartAtMs(meal.steps, start, lineIndex)
}

export function authMentorCreateStepDoneAtMs(index = 0): number {
  const meal = AUTH_MENTOR_CREATE_MEALS[index]!
  return linesDoneAtMs(meal.steps, authMentorCreateStepStartAtMs(index))
}

export function authMentorCreateAddMealPressAtMs(index: number): number {
  if (index <= 0) {
    return authMentorCreateStepDoneAtMs(0) + AUTH_MENTOR_CREATE_DEMO.afterFieldMs
  }
  return authMentorCreateAddMealAtMs(index - 1) + AUTH_MENTOR_CREATE_DEMO.slotRevealHoldMs
}

export function authMentorCreateAddMealAtMs(index: number): number {
  return authMentorCreateAddMealPressAtMs(index) + AUTH_MENTOR_CREATE_DEMO.addMealPressMs
}

export function authMentorCreateSavePressAtMs() {
  return (
    authMentorCreateAddMealAtMs(AUTH_MENTOR_CREATE_MEALS.length - 2) +
    AUTH_MENTOR_CREATE_DEMO.slotRevealHoldMs
  )
}

export function authMentorCreateSavedAtMs() {
  return (
    authMentorCreateSavePressAtMs() +
    AUTH_MENTOR_CREATE_DEMO.savePressMs +
    AUTH_MENTOR_CREATE_DEMO.afterSaveMs
  )
}

export function authMentorCreateCloseAtMs() {
  return authMentorCreateSavedAtMs() + AUTH_MENTOR_CREATE_DEMO.savedHoldMs
}

export type AuthMentorCreateCaptionId = 'mentorCreate' | 'mentorEditor' | 'mentorSaved'

export type AuthMentorCreateMealProgress = {
  slot: RationMealSlot
  title: string
  macros: { kcal: string; protein: string; fat: string; carbs: string }
  ingredients: string[]
  steps: string[]
  image: string
}

export type AuthMentorCreateProgress = {
  phase: 'list' | 'editor' | 'saved'
  createPressed: boolean
  tabPressed: boolean
  addMealPressed: boolean
  savePressed: boolean
  tab: 'description' | number
  title: string
  description: string
  meals: AuthMentorCreateMealProgress[]
  caption: AuthMentorCreateCaptionId
  focus: 'title' | 'description' | 'meal-title' | 'macros' | 'ingredient' | 'step' | 'add-meal' | 'save' | null
}

const EMPTY_MACROS = { kcal: '', protein: '', fat: '', carbs: '' }

function emptyMealProgress(meal: AuthMentorDemoMeal): AuthMentorCreateMealProgress {
  return {
    slot: meal.slot,
    title: '',
    macros: EMPTY_MACROS,
    ingredients: [],
    steps: [],
    image: meal.image,
  }
}

function mealProgressAt(index: number, ms: number): AuthMentorCreateMealProgress {
  const meal = AUTH_MENTOR_CREATE_MEALS[index]!
  // Later meals only reveal their tab. Breakfast is the one the demo fills.
  if (index > 0) return emptyMealProgress(meal)
  const tabAt = authMentorCreateMealTabAtMs(index)
  if (ms < tabAt) return emptyMealProgress(meal)
  const macrosReady = ms >= authMentorCreateMacrosAtMs(index)
  return {
    slot: meal.slot,
    title: typedSlice(meal.title, ms, authMentorCreateMealTitleStartAtMs(index)),
    macros: macrosReady ? { ...meal.macros } : EMPTY_MACROS,
    ingredients: linesProgressAt(
      meal.ingredients,
      ms,
      authMentorCreateIngredientStartAtMs(index),
    ),
    steps: linesProgressAt(meal.steps, ms, authMentorCreateStepStartAtMs(index)),
    image: meal.image,
  }
}

function mealCountAt(ms: number) {
  let count = 1
  for (let index = 0; index < AUTH_MENTOR_CREATE_MEALS.length - 1; index += 1) {
    if (ms >= authMentorCreateAddMealAtMs(index)) count += 1
  }
  return count
}

function activeTabAt(ms: number): 'description' | number {
  if (ms < authMentorCreateMealTabAtMs(0)) return 'description'
  return 0
}

function focusAt(ms: number): AuthMentorCreateProgress['focus'] {
  if (ms >= authMentorCreateSavePressAtMs()) return 'save'
  const tab = activeTabAt(ms)
  if (tab === 'description') {
    if (ms >= authMentorCreateDescStartAtMs()) return 'description'
    if (ms >= authMentorCreateTitleStartAtMs()) return 'title'
    return null
  }
  const index = tab
  if (index > 0 && ms >= authMentorCreateAddMealPressAtMs(index - 1) && ms < authMentorCreateMealTabAtMs(index)) {
    return 'add-meal'
  }
  if (ms >= authMentorCreateStepStartAtMs(index)) return 'step'
  if (ms >= authMentorCreateIngredientStartAtMs(index)) return 'ingredient'
  if (ms >= authMentorCreateMacrosAtMs(index)) return 'macros'
  return 'meal-title'
}

export function authMentorCreateProgress(ms: number): AuthMentorCreateProgress {
  const openAt = authMentorCreateOpenAtMs()
  const savedAt = authMentorCreateSavedAtMs()
  const count = mealCountAt(ms)
  const meals = AUTH_MENTOR_CREATE_MEALS.slice(0, count).map((meal, index) =>
    ms >= savedAt
      ? {
          slot: meal.slot,
          title: meal.title,
          macros: { ...meal.macros },
          ingredients: [...meal.ingredients],
          steps: [...meal.steps],
          image: meal.image,
        }
      : mealProgressAt(index, ms),
  )

  if (ms >= savedAt) {
    return {
      phase: 'saved',
      createPressed: false,
      tabPressed: false,
      addMealPressed: false,
      savePressed: false,
      tab: 'description',
      title: AUTH_MENTOR_CREATE_SCRIPT.title,
      description: AUTH_MENTOR_CREATE_SCRIPT.description,
      meals,
      caption: 'mentorSaved',
      focus: null,
    }
  }

  const tab = activeTabAt(ms)
  const tabIndex = tab === 'description' ? 0 : tab
  return {
    phase: ms >= openAt ? 'editor' : 'list',
    createPressed: ms >= authMentorCreatePressAtMs() && ms < openAt,
    tabPressed:
      tab === 'description'
        ? ms >= authMentorCreateMealTabPressAtMs(0) && ms < authMentorCreateMealTabAtMs(0)
        : ms >= authMentorCreateMealTabPressAtMs(tabIndex) && ms < authMentorCreateMealTabAtMs(tabIndex),
    addMealPressed: AUTH_MENTOR_CREATE_MEALS.slice(0, -1).some(
      (_, index) =>
        ms >= authMentorCreateAddMealPressAtMs(index) && ms < authMentorCreateAddMealAtMs(index),
    ),
    savePressed: ms >= authMentorCreateSavePressAtMs() && ms < savedAt,
    tab,
    title: typedSlice(AUTH_MENTOR_CREATE_SCRIPT.title, ms, authMentorCreateTitleStartAtMs()),
    description: typedSlice(
      AUTH_MENTOR_CREATE_SCRIPT.description,
      ms,
      authMentorCreateDescStartAtMs(),
    ),
    meals,
    caption: ms >= openAt ? 'mentorEditor' : 'mentorCreate',
    focus: focusAt(ms),
  }
}
