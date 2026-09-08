import { expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'

import type { MealEntry } from '../src/features/diary'
import {
  applyPlanMealLayout,
  layoutFromDays,
  movePlanMeal,
  movePlanMeals,
} from '../src/features/plans/plan-meal-layout'
import type { WeekPlanDay } from '../src/features/plans/week-plan'

function meal(id: string, hour: number, kcal = 100): MealEntry {
  return {
    id,
    title: id,
    ingredients: 'x',
    category: 'Завтрак',
    meal: 'Завтрак',
    at: new Date(2026, 8, 1, hour, 0, 0).toISOString(),
    kcal,
    protein: 1,
    fat: 1,
    carbs: 1,
    image: '/rations/ration-01.jpg',
    fromApi: true,
  }
}

function day(
  dayKey: string,
  meals: MealEntry[],
  day = Number(dayKey.slice(-2)),
): WeekPlanDay {
  return {
    dayKey,
    short: `День ${day}`,
    label: `День ${day}`,
    dayIso: `${dayKey}T12:00:00`,
    filled: meals.length > 0,
    ration: null,
    meals,
    mealsCount: meals.length,
    kcal: meals.reduce((sum, item) => sum + item.kcal, 0),
    done: false,
  }
}

test('same-day reorder keeps slot times and moves the meal', () => {
  const monday = day('2026-09-01', [meal('a', 8, 100), meal('b', 13, 200), meal('c', 19, 300)])
  const next = movePlanMeal([monday], 'a', '2026-09-01', 2)
  expect(next[0]?.meals.map((item) => item.id)).toEqual(['b', 'c', 'a'])
  expect(next[0]?.meals.map((item) => new Date(item.at).getHours())).toEqual([8, 13, 19])
  expect(next[0]?.kcal).toBe(600)
})

test('moving a meal to another day uses that day’s slot times', () => {
  const monday = day('2026-09-01', [meal('a', 8, 100), meal('b', 13, 200)])
  const tuesday = day('2026-09-02', [meal('c', 8, 50)])
  const next = movePlanMeal([monday, tuesday], 'a', '2026-09-02', 0)
  expect(next[0]?.meals.map((item) => item.id)).toEqual(['b'])
  expect(next[1]?.meals.map((item) => item.id)).toEqual(['a', 'c'])
  expect(next[0]?.kcal).toBe(200)
  expect(next[1]?.kcal).toBe(150)
  expect(new Date(next[0]!.meals[0]!.at).getDate()).toBe(1)
  expect(new Date(next[1]!.meals[0]!.at).getDate()).toBe(2)
  expect(new Date(next[1]!.meals[0]!.at).getHours()).toBe(8)
  expect(new Date(next[1]!.meals[1]!.at).getHours()).toBe(8)
  expect(new Date(next[1]!.meals[1]!.at).getMinutes()).toBe(30)
})

test('moving several meals keeps their order at the end of the destination day', () => {
  const monday = day('2026-09-01', [meal('a', 8, 100), meal('b', 13, 200), meal('c', 19, 50)])
  const tuesday = day('2026-09-02', [meal('d', 8, 80)])
  const next = movePlanMeals([monday, tuesday], ['a', 'c'], '2026-09-02')
  expect(next[0]?.meals.map((item) => item.id)).toEqual(['b'])
  expect(next[1]?.meals.map((item) => item.id)).toEqual(['d', 'a', 'c'])
  expect(next[1]?.kcal).toBe(230)
})

test('target index is clamped to the destination day', () => {
  const monday = day('2026-09-01', [meal('a', 8), meal('b', 13)])
  const tuesday = day('2026-09-02', [meal('c', 8)])
  const next = movePlanMeal([monday, tuesday], 'b', '2026-09-02', 99)
  expect(next[1]?.meals.map((item) => item.id)).toEqual(['c', 'b'])
})

test('unknown meal or day leaves the plan unchanged', () => {
  const monday = day('2026-09-01', [meal('a', 8)])
  expect(movePlanMeal([monday], 'missing', '2026-09-01', 0)[0]?.meals[0]?.id).toBe('a')
  expect(movePlanMeal([monday], 'a', '2026-09-09', 0)[0]?.meals[0]?.id).toBe('a')
})

test('saved layout reapplies meal order across days', () => {
  const monday = day('2026-09-01', [meal('a', 8), meal('b', 13)])
  const tuesday = day('2026-09-02', [meal('c', 8)])
  const moved = movePlanMeal([monday, tuesday], 'a', '2026-09-02', 1)
  const layout = layoutFromDays(moved)
  const restored = applyPlanMealLayout([monday, tuesday], layout)
  expect(restored.map((item) => item.meals.map((mealItem) => mealItem.id))).toEqual([
    ['b'],
    ['c', 'a'],
  ])
})

test('plan meals board starts a hold-to-drag reorder', () => {
  const source = readFileSync(
    new URL('../src/features/plans/CurrentPlanMeals.tsx', import.meta.url),
    'utf8',
  )
  const board = readFileSync(
    new URL('../src/features/plans/PlanMealsBoard.tsx', import.meta.url),
    'utf8',
  )
  const card = readFileSync(new URL('../src/features/diary/MealCard.tsx', import.meta.url), 'utf8')
  const general = readFileSync(
    new URL('../src/features/plans/GeneralNutritionPage.tsx', import.meta.url),
    'utf8',
  )
  expect(source).toContain('PlanMealGrid')
  expect(source).toContain('canReorder')
  expect(source).toContain('PlanMealDragHandle')
  expect(source).toContain('Переместить')
  expect(source).toContain('Отмена')
  expect(source).toContain('Приёмы перемещены')
  expect(source).toContain('movePlanMeals')
  expect(source).toContain('PLAN_MOBILE_DOCK_MOVE_ID')
  expect(source).toContain('pickedIds')
  expect(source).toContain('daysLocked')
  expect(source).toContain('selected={picking && pickedIds.has(meal.id)}')
  expect(card).not.toContain('scheme-editor-dark')
  expect(card).toContain('RATION_PICKED_CARD_BADGE_CLASS')
  expect(card).toContain('data-selected={selected ? \'\' : undefined}')
  expect(board).toContain('data-plan-meal-slot')
  expect(board).toContain('data-plan-day-board')
  expect(board).toContain('data-slot="plan-meal-drag"')
  expect(board).toContain('data-plan-meal-picked')
  expect(board).toContain('startDrag')
  expect(board).toContain('GripVerticalIcon')
  expect(source).toContain('ArrowLeftRightIcon')
  expect(source).toContain('XIcon')
  expect(source).toContain('orderBadge')
  expect(board).toContain('lockPageScroll')
  expect(board).toContain('forceUnlockPageScroll')
  expect(board).toContain('touchmove')
  expect(board).not.toContain("scroller.style.overflow = 'hidden'")
  expect(board).toContain('movePlanMeal')
  expect(card).toContain('meal-card-order')
  expect(board).not.toContain("closest('[data-slot=\"meal-card-footer\"]')")
  expect(card).toContain('footerStart')
  expect(general).toContain('PLAN_MOBILE_DOCK_MOVE_ID')
  expect(general).toContain('inPlanDetail ?')
})
