import type { MealEntry } from '@/features/diary'

import { rationMealCreateDrafts, rationPlanWeekDays } from './ration-assignments'
import { rationDayTotals, type RationEntry, type RationGoal } from './rations-catalog'

const AUTH_DEMO_PLAN_DAY: RationEntry = {
  id: 'auth-demo-plan',
  title: 'Лёгкий старт',
  description: 'День с завтраком, обедом и ужином.',
  goal: 'Похудение',
  days: 1,
  mealsPerDay: 3,
  image: '/rations/ration-01.jpg',
  source: 'План',
  meals: [
    {
      slot: 'Завтрак',
      title: 'Овсянка с ягодами',
      ingredients: 'Овсянка, ягоды, йогурт',
      steps: ['Сварите кашу', 'Добавьте ягоды'],
      image: '/rations/ration-01.jpg',
      kcal: 320,
      protein: 14,
      fat: 8,
      carbs: 48,
    },
    {
      slot: 'Обед',
      title: 'Курица с овощами',
      ingredients: 'Куриная грудка, овощи',
      steps: ['Запеките курицу', 'Подайте с овощами'],
      image: '/rations/ration-01-2.jpg',
      kcal: 420,
      protein: 38,
      fat: 12,
      carbs: 28,
    },
    {
      slot: 'Ужин',
      title: 'Рыба и салат',
      ingredients: 'Рыба, салат, оливковое масло',
      steps: ['Приготовьте рыбу', 'Соберите салат'],
      image: '/rations/ration-01-3.jpg',
      kcal: 380,
      protein: 32,
      fat: 16,
      carbs: 18,
    },
  ],
  ...rationDayTotals([
    { slot: 'Завтрак', title: '', ingredients: '', steps: [], image: '', kcal: 320, protein: 14, fat: 8, carbs: 48 },
    { slot: 'Обед', title: '', ingredients: '', steps: [], image: '', kcal: 420, protein: 38, fat: 12, carbs: 28 },
    { slot: 'Ужин', title: '', ingredients: '', steps: [], image: '', kcal: 380, protein: 32, fat: 16, carbs: 18 },
  ]),
}

export function authPreviewRation(): RationEntry {
  return AUTH_DEMO_PLAN_DAY
}

export function authPreviewGainRation(): RationEntry {
  return { ...AUTH_DEMO_PLAN_DAY, id: 'auth-demo-plan-gain', goal: 'Набор', title: 'Набор без срывов' }
}

export const AUTH_RATION_FILTER_DEMO = {
  settleMs: 1200,
  triggerPressMs: 280,
  afterOpenMs: 1800,
  itemPressMs: 300,
  afterItemPressMs: 520,
  afterCommitMs: 420,
  afterCloseMs: 360,
  afterSelectMs: 1100,
} as const

export const AUTH_RATION_ADD_DEMO = {
  settleMs: 920,
  plusPressMs: 820,
  afterPlusMs: 560,
  afterCloseMs: 920,
} as const

export function authRationAddPlusPressAtMs() {
  return AUTH_RATION_ADD_DEMO.settleMs
}

export function authRationAddOpenAtMs() {
  return (
    AUTH_RATION_ADD_DEMO.settleMs +
    AUTH_RATION_ADD_DEMO.plusPressMs +
    AUTH_RATION_ADD_DEMO.afterPlusMs
  )
}

/** After the ration card is on screen: press «Выбрать», open the calendar, then flip. */
export const AUTH_RATION_SELECT_DEMO = {
  settleMs: 1100,
  pressMs: 820,
  afterPressMs: 480,
  addedHoldMs: 1500,
  /** Let the incoming meal paint on the right before the ration card slides. */
  slideLeadMs: 140,
} as const

/** Calendar already shows the ration week. Leave it readable, then press «Начать…». */
export const AUTH_RATION_CALENDAR_DEMO = {
  settleMs: 2200,
  pressMs: 820,
  afterPressMs: 420,
} as const

/** Local start used by the signup calendar demo. 19 September 2026. */
export const AUTH_DEMO_PLAN_START = new Date(2026, 8, 19)
export const AUTH_DEMO_PLAN_DAY_COUNT = 7

function authDemoPlanDay(date: Date) {
  const day = String(date.getDate()).padStart(2, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  return `${day}.${month}`
}

/** Same `19.09 - 25.09` cover label the plan card shows after the week is chosen. */
export function authDemoPlanRange(
  start: Date = AUTH_DEMO_PLAN_START,
  dayCount: number = AUTH_DEMO_PLAN_DAY_COUNT,
) {
  const from = new Date(start.getFullYear(), start.getMonth(), start.getDate())
  const to = new Date(from)
  to.setDate(from.getDate() + Math.max(1, dayCount) - 1)
  return { from, to, label: `${authDemoPlanDay(from)} - ${authDemoPlanDay(to)}` }
}

export function authRationSelectPressAtMs() {
  return AUTH_RATION_SELECT_DEMO.settleMs
}

export function authRationSelectOpenAtMs() {
  return (
    AUTH_RATION_SELECT_DEMO.settleMs +
    AUTH_RATION_SELECT_DEMO.pressMs +
    AUTH_RATION_SELECT_DEMO.afterPressMs
  )
}

export function authRationCalendarPressAtMs() {
  return AUTH_RATION_CALENDAR_DEMO.settleMs
}

export function authRationCalendarCloseAtMs() {
  return (
    AUTH_RATION_CALENDAR_DEMO.settleMs +
    AUTH_RATION_CALENDAR_DEMO.pressMs +
    AUTH_RATION_CALENDAR_DEMO.afterPressMs
  )
}

const AUTH_DEMO_PLAN_PORTIONS: Record<string, string[]> = {
  'Овсянка с ягодами': ['Овсяные хлопья ~50 г', 'Ягоды ~60 г', 'Йогурт ~100 г'],
  'Курица с овощами': ['Куриная грудка ~180 г', 'Рис ~150 г', 'Овощи ~120 г'],
  'Рыба и салат': ['Рыба ~160 г', 'Салат ~80 г', 'Оливковое масло ~10 г'],
}

export const AUTH_RATION_DAY_DEMO = {
  settleMs: 1000,
  dayPressMs: 280,
  busyMs: 880,
  successMs: 920,
} as const

export function authRationDayPressAtMs() {
  return AUTH_RATION_DAY_DEMO.settleMs
}

export function authRationDayBusyAtMs() {
  return AUTH_RATION_DAY_DEMO.settleMs + AUTH_RATION_DAY_DEMO.dayPressMs
}

export function authRationDaySuccessAtMs() {
  return authRationDayBusyAtMs() + AUTH_RATION_DAY_DEMO.busyMs
}

export function authRationDayCloseAtMs() {
  return authRationDaySuccessAtMs() + AUTH_RATION_DAY_DEMO.successMs
}

export function authRationAddDemoDay() {
  return rationPlanWeekDays()[0]!
}

export function authDemoPlanMeals(ration: RationEntry): MealEntry[] {
  const monday = authRationAddDemoDay().date
  const drafts = rationMealCreateDrafts(ration, monday)
  return drafts.map((draft, index) => {
    const source = ration.meals[index]!
    return {
      id: `auth-demo-plan-${ration.id}-${index}`,
      title: draft.title,
      ingredients: draft.ingredients,
      category: draft.category,
      meal: draft.meal,
      at: draft.recordedAt ?? monday.toISOString(),
      kcal: draft.kcal,
      protein: draft.protein,
      fat: draft.fat,
      carbs: draft.carbs,
      image: source.image,
      assumptions: [...draft.assumptions],
      portionItems: AUTH_DEMO_PLAN_PORTIONS[draft.title] ?? undefined,
    }
  })
}

export const AUTH_RATION_FILTER_TO_GOAL: RationGoal = 'Похудение'
export const AUTH_RATION_FILTER_FROM_GOAL: RationGoal = 'Набор'

export function authRationFilterTriggerPressAtMs() {
  return AUTH_RATION_FILTER_DEMO.settleMs
}

export function authRationFilterMenuOpenAtMs() {
  return AUTH_RATION_FILTER_DEMO.settleMs + AUTH_RATION_FILTER_DEMO.triggerPressMs
}

export function authRationFilterItemPressAtMs() {
  return authRationFilterMenuOpenAtMs() + AUTH_RATION_FILTER_DEMO.afterOpenMs
}

export function authRationFilterCommitAtMs() {
  return (
    authRationFilterItemPressAtMs() +
    AUTH_RATION_FILTER_DEMO.itemPressMs +
    AUTH_RATION_FILTER_DEMO.afterItemPressMs
  )
}

export function authRationFilterCloseAtMs() {
  return authRationFilterCommitAtMs() + AUTH_RATION_FILTER_DEMO.afterCommitMs
}

export function authRationFilterSelectAtMs() {
  return authRationFilterCloseAtMs() + AUTH_RATION_FILTER_DEMO.afterCloseMs
}

export function authRationFilterReadyAtMs() {
  return authRationFilterSelectAtMs() + AUTH_RATION_FILTER_DEMO.afterSelectMs
}

export const AUTH_RATION_DEMO = {
  settleMs: 720,
  mealPressMs: 260,
  mealScrollMs: 640,
  afterMealMs: 1520,
  tabPressMs: 240,
  /** Hold on Готовка / Покупки without scrolling the sheet. */
  afterCookMs: 2800,
  afterShopMs: 2400,
} as const

export function authRationDemoMealClickCount(mealCount: number) {
  return Math.max(0, mealCount - 1)
}

export function authRationDemoMealPressAtMs(clickIndex: number) {
  return (
    AUTH_RATION_DEMO.settleMs +
    clickIndex * (AUTH_RATION_DEMO.mealPressMs + AUTH_RATION_DEMO.afterMealMs)
  )
}

export function authRationDemoMealShowAtMs(clickIndex: number) {
  return authRationDemoMealPressAtMs(clickIndex) + AUTH_RATION_DEMO.mealPressMs
}

export function authRationDemoAfterMealsMs(mealCount: number) {
  const clicks = authRationDemoMealClickCount(mealCount)
  if (clicks === 0) return AUTH_RATION_DEMO.settleMs
  return authRationDemoMealShowAtMs(clicks - 1) + AUTH_RATION_DEMO.afterMealMs
}

export function authRationDemoCookPressAtMs(mealCount: number) {
  return authRationDemoAfterMealsMs(mealCount)
}

export function authRationDemoCookShowAtMs(mealCount: number) {
  return authRationDemoCookPressAtMs(mealCount) + AUTH_RATION_DEMO.tabPressMs
}

export function authRationDemoShopPressAtMs(mealCount: number) {
  return authRationDemoCookShowAtMs(mealCount) + AUTH_RATION_DEMO.afterCookMs
}

export function authRationDemoShopShowAtMs(mealCount: number) {
  return authRationDemoShopPressAtMs(mealCount) + AUTH_RATION_DEMO.tabPressMs
}

export function authRationDemoCloseAtMs(mealCount: number) {
  return authRationDemoShopShowAtMs(mealCount) + AUTH_RATION_DEMO.afterShopMs
}

/** Scroll target in the viewport's local pixels, correcting for a CSS scale on an ancestor. */
export function rationDemoNodeScrollTop(
  viewport: {
    scrollTop: number
    offsetHeight: number
    getBoundingClientRect: () => { top: number; height: number }
  },
  node: { getBoundingClientRect: () => { top: number } },
) {
  const visualHeight = viewport.getBoundingClientRect().height
  const scale = viewport.offsetHeight > 0 ? visualHeight / viewport.offsetHeight : 1
  const visualDelta = node.getBoundingClientRect().top - viewport.getBoundingClientRect().top
  return viewport.scrollTop + visualDelta / (scale || 1)
}
