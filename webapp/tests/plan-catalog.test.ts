import { expect, test } from 'bun:test'
import { existsSync } from 'node:fs'
import { join } from 'node:path'

import { RATION_GOAL_KCAL_CAP } from '../src/features/mentor/rations-catalog'
import {
  authoredCloneOfCatalog,
  catalogPlanById,
  isCatalogPlanId,
  PLAN_CATALOG,
} from '../src/features/plans/plan-catalog'
import { buildWeekPlanFromCatalog } from '../src/features/plans/week-plan'

test('plan catalog has five filled weeks that fit the goal calorie caps', () => {
  expect(PLAN_CATALOG).toHaveLength(5)
  const goals = new Set(PLAN_CATALOG.map((plan) => plan.goal))
  expect(goals.has('Похудение')).toBe(true)
  expect(goals.has('Набор')).toBe(true)
  expect(goals.has('Поддержание')).toBe(true)
  expect(goals.has('Здоровье')).toBe(true)

  for (const plan of PLAN_CATALOG) {
    expect(isCatalogPlanId(plan.id)).toBe(true)
    expect(plan.days).toHaveLength(7)
    expect(catalogPlanById(plan.id)?.title).toBe(plan.title)
    const avg = Math.round(plan.days.reduce((sum, day) => sum + day.kcal, 0) / plan.days.length)
    expect(plan.kcal).toBe(avg)
    expect(plan.kcal).toBeGreaterThan(Math.round(RATION_GOAL_KCAL_CAP[plan.goal] * 0.72))
    expect(plan.kcal).toBeLessThanOrEqual(RATION_GOAL_KCAL_CAP[plan.goal])
    expect(plan.description.includes('\n')).toBe(true)
    expect(plan.description.length).toBeGreaterThan(80)
    for (const day of plan.days) {
      expect(day.description.includes('\n')).toBe(true)
      expect(day.description).toMatch(/Завтрак —/)
      expect(day.meals.length).toBeGreaterThanOrEqual(3)
      expect(day.meals.some((meal) => meal.slot === 'Завтрак')).toBe(true)
      expect(day.meals.some((meal) => meal.slot === 'Обед')).toBe(true)
      expect(day.meals.some((meal) => meal.slot === 'Ужин')).toBe(true)
      expect(day.meals.every((meal) => meal.steps.length > 0)).toBe(true)
      expect(day.meals.every((meal) => meal.ingredients.trim().length > 0)).toBe(true)
      expect(day.meals.every((meal) => meal.image.startsWith('/catalog/'))).toBe(true)
      for (const meal of day.meals) {
        expect(existsSync(join(import.meta.dir, '..', 'public', meal.image))).toBe(true)
      }
    }
    const titles = plan.days.flatMap((day) => day.meals.map((meal) => meal.title))
    expect(new Set(titles).size).toBe(titles.length)
  }
})

test('catalog week plan preview fills seven days and clone lookup uses source id', () => {
  const catalog = PLAN_CATALOG[0]!
  const week = buildWeekPlanFromCatalog({ plan: catalog, now: new Date(2026, 8, 1) })
  expect(week.id).toBe(catalog.id)
  expect(week.days).toHaveLength(7)
  expect(week.cardDays).toHaveLength(1)
  expect(week.days[0]?.meals[0]?.title).toBe(catalog.days[0]?.meals[0]?.title)
  expect(week.days[1]?.filled).toBe(true)
  expect(
    authoredCloneOfCatalog(
      [{ id: 'plan_copy', title: catalog.title, coverImage: '', createdAt: '', goal: catalog.goal, sourceCatalogId: catalog.id }],
      catalog.id,
    )?.id,
  ).toBe('plan_copy')
})
