import { readFileSync } from 'node:fs'
import { expect, test } from 'bun:test'

import {
  mealCardDeletePrompt,
  planCardDeletePrompt,
  planMealDeletePrompt,
} from '../src/features/diary/delete-card-prompt'

test('a meal card asks before it is deleted or only removed from the diary', () => {
  expect(mealCardDeletePrompt({ title: 'Биточки куриные' }, false)).toEqual({
    title: 'Удалить карточку?',
    description: 'Карточка «Биточки куриные» будет удалена. Вернуть её не получится.',
    confirmLabel: 'Удалить',
  })
  expect(mealCardDeletePrompt({ title: '  ' }, false).description).toContain('этот приём')
  expect(mealCardDeletePrompt({ title: 'Овсянка' }, true)).toEqual({
    title: 'Убрать из дневника?',
    description: 'Карточка «Овсянка» исчезнет из дневника и останется в плане.',
    confirmLabel: 'Убрать',
  })
})

test('a plan card and a plan meal ask before they disappear', () => {
  expect(planCardDeletePrompt('Неделя 1')).toEqual({
    title: 'Удалить рацион?',
    description:
      'Рацион «Неделя 1» исчезнет из списков. Невыполненные приёмы из него пропадут из дневника. Выполненные и изменённые останутся.',
    confirmLabel: 'Удалить',
  })
  expect(planMealDeletePrompt({ title: 'Суп' }, true).title).toBe('Убрать из плана?')
  expect(planMealDeletePrompt({ title: 'Суп' }, false).confirmLabel).toBe('Удалить')
})

test('card trash opens the confirm dialog instead of deleting immediately', () => {
  const news = readFileSync(new URL('../src/features/diary/pages/news.tsx', import.meta.url), 'utf8')
  const planMeals = readFileSync(
    new URL('../src/features/plans/CurrentPlanMeals.tsx', import.meta.url),
    'utf8',
  )
  const plans = readFileSync(new URL('../src/features/plans/pages.tsx', import.meta.url), 'utf8')

  expect(news).toContain('isDiaryMealOnFutureDay(meal) ? undefined : () => setDeleteTarget(meal)')
  expect(news).toContain('void deleteMeal(meal)')
  expect(news).toContain('<DeleteCardDialog')
  expect(planMeals).toContain('if (!readOnly) setDeleteTarget(meal)')
  expect(planMeals).toContain('void deleteMeal(meal)')
  expect(planMeals).toContain('<DeleteCardDialog')
  expect(plans).toContain('setDeletePlanTarget({ id: plan.id, title: plan.title })')
  expect(plans).toContain('void deletePlan(planId)')
  expect(plans).toContain('<DeleteCardDialog')
})
