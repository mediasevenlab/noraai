import { expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'

import type { MealEntry } from '../src/features/diary'
import { emptyMealDraft } from '../src/features/mentor/authored-rations'
import {
  applyPlanOutline,
  readPlanOutline,
  WEEK_PLAN_OUTLINE_KEY,
  writePlanOutline,
} from '../src/features/plans/plan-outline'
import {
  applyPlanDayDrafts,
  mealEntryToRationDraft,
  newMealRationsFromPlanDrafts,
  planMealRewriteRequest,
  weekPlanDaysToDraftDays,
} from '../src/features/plans/plan-outline-editor'
import { padPlanDaysForEditor, type WeekPlanDay } from '../src/features/plans/week-plan'

test('week plan outline keeps a custom title and description for the account', () => {
  const memory = new Map<string, string>()
  const originalStorage = globalThis.localStorage
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: {
      getItem: (key: string) => memory.get(key) ?? null,
      setItem: (key: string, value: string) => {
        memory.set(key, value)
      },
      removeItem: (key: string) => {
        memory.delete(key)
      },
    },
  })
  try {
    const scope = 'outline-user'
    expect(readPlanOutline(scope, WEEK_PLAN_OUTLINE_KEY)).toBeNull()
    writePlanOutline(scope, WEEK_PLAN_OUTLINE_KEY, {
      title: 'Офис без срывов',
      description: 'Три спокойных дня',
    })
    expect(readPlanOutline(scope, WEEK_PLAN_OUTLINE_KEY)).toEqual({
      title: 'Офис без срывов',
      description: 'Три спокойных дня',
    })
    expect(
      applyPlanOutline(
        { title: 'План на неделю', description: '' },
        readPlanOutline(scope, WEEK_PLAN_OUTLINE_KEY),
      ),
    ).toEqual({
      title: 'Офис без срывов',
      description: 'Три спокойных дня',
    })
    expect(applyPlanOutline({ title: 'План на неделю', description: '' }, null).title).toBe(
      'План на неделю',
    )
  } finally {
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      value: originalStorage,
    })
  }
})

test('plan outline dialog edits title, description and day order', () => {
  const source = readFileSync(
    new URL('../src/features/plans/PlanOutlineDialog.tsx', import.meta.url),
    'utf8',
  )
  const editor = readFileSync(
    new URL('../src/features/mentor/MentorRationEditor.tsx', import.meta.url),
    'utf8',
  )
  const page = readFileSync(new URL('../src/features/plans/pages.tsx', import.meta.url), 'utf8')
  const hook = readFileSync(
    new URL('../src/features/plans/use-current-week-plan.ts', import.meta.url),
    'utf8',
  )
  expect(source).toContain('RationEditorDialog')
  expect(source).toContain('dayCount')
  expect(source).toContain('padPlanDaysForEditor(days, new Date(), dayCount)')
  expect(source).toContain('weekPlanDaysToDraftDays')
  expect(source).toContain('onSaveDayDrafts')
  expect(source).toContain('coverImage')
  expect(source).toContain('outline')
  expect(editor).toContain('data-plan-outline={outline ? \'\' : undefined}')
  expect(editor).toContain('data-plan-editor-open-day')
  expect(editor).toContain('data-plan-editor-back=""')
  expect(editor).toContain('data-plan-outline-save={outline ? \'\' : undefined}')
  expect(editor).toContain('border-t border-[var(--nora-divider)]')
  expect(editor).toContain('function openDay(')
  expect(editor).toContain('Название')
  expect(page).toContain('PlanOutlineDialog')
  expect(page).toContain('coverImage={plan.coverImage}')
  expect(page).not.toContain('coverImage={usableMealCover(plan.coverImage)}')
  expect(page).toContain('Изменить')
  expect(page).toContain('applyWeekOutline')
  expect(page).toContain('newDayRations')
  expect(page).toContain('stampRationDaysOntoPlan')
  expect(hook).toContain('WEEK_PLAN_OUTLINE_KEY')
  expect(hook).toContain('applyWeekOutline')
})

function meal(id: string, title: string): MealEntry {
  return {
    id,
    title,
    ingredients: 'яйца',
    category: 'Завтрак',
    meal: 'Завтрак',
    at: new Date(2026, 8, 1, 9).toISOString(),
    kcal: 300,
    protein: 20,
    fat: 10,
    carbs: 15,
    image: '/rations/ration-01.jpg',
    fromApi: true,
    clientComment: 'Взбейте яйца',
  }
}

function day(ordinal: number, meals: MealEntry[]): WeekPlanDay {
  return {
    dayKey: `2026-09-0${ordinal}`,
    short: `День ${ordinal}`,
    label: `День ${ordinal}`,
    dayIso: `2026-09-0${ordinal}T12:00:00`,
    filled: meals.length > 0,
    ration: null,
    meals,
    mealsCount: meals.length,
    kcal: meals.reduce((sum, item) => sum + item.kcal, 0),
    done: false,
  }
}

test('plan editor rewrite skips an unchanged plate and sends the edited one', () => {
  const entry = meal('11111111-1111-4111-8111-111111111111', 'Круассан')
  const draft = mealEntryToRationDraft(entry)
  expect(planMealRewriteRequest(entry, draft)).toBeNull()
  const edited = planMealRewriteRequest(entry, { ...draft, title: 'Круассан с маслом', kcal: '420' })
  expect(edited?.title).toBe('Круассан с маслом')
  expect(edited?.kcal).toBe(420)
  expect(edited && 'versions' in edited).toBe(false)
})

test('padPlanDaysForEditor restores a leading empty day from ordinals', () => {
  const now = new Date(2026, 8, 1)
  const padded = padPlanDaysForEditor(
    [day(2, [meal('tue', 'Круассан')]), day(3, [meal('wed', 'Круассан')])],
    now,
  )
  expect(padded.map((item) => item.short)).toEqual(['День 1', 'День 2', 'День 3'])
  expect(padded[0]?.filled).toBe(false)
  expect(padded[0]?.meals).toEqual([])
  expect(padded[0]?.dayKey).toBe('2026-08-31')
  expect(padded[1]?.meals.map((item) => item.id)).toEqual(['tue'])
  expect(padded[2]?.meals.map((item) => item.id)).toEqual(['wed'])
})

test('padPlanDaysForEditor keeps trailing empty days from the authored count', () => {
  const now = new Date(2026, 8, 1)
  const padded = padPlanDaysForEditor([day(1, [meal('mon', 'Круассан')]), day(2, [meal('tue', 'Круассан')])], now, 4)
  expect(padded).toHaveLength(4)
  expect(padded.map((item) => item.short)).toEqual(['День 1', 'День 2', 'День 3', 'День 4'])
  expect(padded[2]?.filled).toBe(false)
  expect(padded[3]?.meals).toEqual([])
})

test('plan day drafts keep existing meals and collect only new titled ones', () => {
  const original = [day(1, []), day(2, [meal('tue', 'Круассан')])]
  const drafts = weekPlanDaysToDraftDays(original)
  expect(drafts).toHaveLength(2)
  expect(drafts[0]?.[0]?.title).toBe('')
  expect(drafts[1]?.[0]?.key).toBe('tue')
  expect(mealEntryToRationDraft(meal('tue', 'Круассан')).stepsText).toBe('Взбейте яйца')
  expect(
    mealEntryToRationDraft({
      ...meal('croissant', 'Горячий круассан с ветчиной и сыром'),
      ingredients: 'Круассан – 3 шт., Ветчина – 120 г, Сыр твёрдый – 80 г',
      portionItems: ['Круассан – 3 шт.', 'Ветчина – 120 г', 'Сыр твёрдый – 80 г'],
    }).ingredients,
  ).toBe('Круассан – 3 шт.\nВетчина – 120 г\nСыр твёрдый – 80 г')
  expect(
    mealEntryToRationDraft({
      ...meal('comma', 'Омлет'),
      ingredients: 'яйца, шпинат, тост',
    }).ingredients,
  ).toBe('яйца\nшпинат\nтост')

  const filledFirst = [
    [{ ...emptyMealDraft('Завтрак'), title: 'Овсянка', kcal: '320' }],
    drafts[1]!,
  ]
  const nextDays = applyPlanDayDrafts(original, filledFirst, new Date(2026, 8, 1))
  expect(nextDays[0]?.meals).toEqual([])
  expect(nextDays[1]?.meals.map((item) => item.id)).toEqual(['tue'])

  const created = newMealRationsFromPlanDrafts(original, filledFirst, {
    id: 'plan_office',
    title: 'Другой план',
    description: 'Описание',
    goal: 'Поддержание',
  })
  expect(created[0]?.meals.map((item) => item.title)).toEqual(['Овсянка'])
  expect(created[1]?.meals).toEqual([])
})
