import { describe, expect, test } from 'bun:test'

import { AUTHORED_PLAN_DAY_COUNT_MAX } from '@web-app-demo/contracts'

import {
  ASSIGNED_AUTHORED_RATIONS_STORAGE_PREFIX,
  AUTHORED_RATIONS_STORAGE_PREFIX,
  assignedAuthoredRationState,
  assignedAuthoredRationsStorageKey,
  assignAuthoredRationToUser,
  draftPlanDayAverages,
  draftRationTotals,
  emptyRationDraft,
  finalizeRationDraft,
  menteePickerInitials,
  menteePickerLabel,
  mergeAssignedRations,
  rationsForSectionTab,
  nextUnusedMealSlot,
  MENTOR_RATION_SOURCE,
  rationCardOrigin,
  parseAuthoredRations,
  parseMacroField,
  addDraftLine,
  addPlanDraftDay,
  draftLineItems,
  emptyMealDraft,
  emptyPlanDayMeals,
  ensureTestAuthoredRations,
  finalizePlanDaysDraft,
  joinDraftLines,
  moveDraftLine,
  previewRationFromDraft,
  rationPlanDayDrafts,
  rationToDraft,
  readAssignedAuthoredRations,
  removeDraftLine,
  removePlanDraftDay,
  reorderMealDrafts,
  reorderPlanDraftDays,
  setDraftLine,
  RATION_MEAL_SLOTS,
  splitIngredientLines,
  splitStepLines,
  testAuthoredRations,
} from '../src/features/mentor/authored-rations'
import type { RationEntry } from '../src/features/mentor/rations-catalog'

const sample: RationEntry = {
  id: 'mentor-sample',
  title: 'Белковый день',
  description: 'Курица и рыба',
  goal: 'Набор',
  days: 1,
  kcal: 700,
  protein: 70,
  fat: 20,
  carbs: 40,
  mealsPerDay: 2,
  image: '/rations/ration-01.jpg',
  source: MENTOR_RATION_SOURCE,
  meals: [
    {
      slot: 'Завтрак',
      title: 'Омлет',
      ingredients: 'яйца, шпинат',
      steps: ['Взбейте яйца', 'Обжарьте'],
      image: '/rations/ration-01.jpg',
      kcal: 300,
      protein: 25,
      fat: 18,
      carbs: 5,
    },
    {
      slot: 'Обед',
      title: 'Курица',
      ingredients: 'филе, рис',
      steps: ['Запеките филе'],
      image: '',
      kcal: 400,
      protein: 45,
      fat: 2,
      carbs: 35,
    },
  ],
}

describe('mentor authored rations', () => {
  test('card origin follows catalog vs mentor authorship', () => {
    expect(rationCardOrigin({ id: 'ration-01', source: 'ScanFood.AI, меню на 1400 ккал' })).toBe(
      'rations',
    )
    expect(rationCardOrigin({ id: 'mentor-ab12-day', source: MENTOR_RATION_SOURCE })).toBe(
      'mentor-rations',
    )
    expect(rationCardOrigin({ id: 'mentor-test-light-day', source: 'Силовой день' })).toBe(
      'mentor-rations',
    )
  })

  test('new draft starts with one breakfast and no title', () => {
    const draft = emptyRationDraft()
    expect(draft.title).toBe('')
    expect(draft.goal).toBe('Похудение')
    expect(draft.meals).toHaveLength(1)
    expect(draft.meals[0]?.slot).toBe('Завтрак')
    expect(draftRationTotals(draft)).toEqual({ kcal: 0, protein: 0, fat: 0, carbs: 0 })
  })

  test('plan day averages split titled macros across every day in the draft', () => {
    const breakfast = { ...emptyMealDraft('Завтрак'), title: 'Омлет', kcal: '300', protein: '20' }
    const lunch = { ...emptyMealDraft('Обед'), title: 'Курица', kcal: '100', protein: '40' }
    expect(draftPlanDayAverages([[breakfast]])).toEqual({
      kcal: 300,
      protein: 20,
      fat: 0,
      carbs: 0,
    })
    expect(draftPlanDayAverages([[breakfast], [lunch]])).toEqual({
      kcal: 200,
      protein: 30,
      fat: 0,
      carbs: 0,
    })
    expect(draftPlanDayAverages([[breakfast], emptyPlanDayMeals()])).toEqual({
      kcal: 150,
      protein: 10,
      fat: 0,
      carbs: 0,
    })
  })

  test('plan draft can remove a day, including the last one', () => {
    const breakfast = { ...emptyMealDraft('Завтрак'), title: 'Омлет' }
    const lunch = { ...emptyMealDraft('Обед'), title: 'Курица' }
    const removed = removePlanDraftDay([[breakfast], [lunch], emptyPlanDayMeals()], 1)
    expect(removed).toHaveLength(2)
    expect(removed[0]?.[0]?.title).toBe('Омлет')
    expect(removed[1]?.[0]?.title).toBe('')
    expect(removePlanDraftDay([[breakfast]], 0)).toHaveLength(0)
    expect(removePlanDraftDay([[breakfast], [lunch]], -1)).toHaveLength(2)
    expect(removePlanDraftDay([[breakfast], [lunch]], 8)).toHaveLength(2)
  })

  test('plan draft can grow days and stamp meals onto each day', () => {
    const breakfast = { ...emptyMealDraft('Завтрак'), title: 'Омлет', kcal: '300' }
    const lunch = { ...emptyMealDraft('Обед'), title: 'Курица', kcal: '400' }
    const one = addPlanDraftDay([])
    expect(one).toHaveLength(1)
    expect(one[0]?.[0]?.slot).toBe('Завтрак')
    const two = addPlanDraftDay([[breakfast]])
    expect(two).toHaveLength(2)
    expect(two[1]).toHaveLength(1)
    expect(two[1]![0]?.slot).toBe('Завтрак')
    expect(two[1]![0]?.title).toBe('')
    let days = [emptyPlanDayMeals()]
    for (let index = 0; index < 10; index += 1) days = addPlanDraftDay(days)
    expect(days).toHaveLength(11)
    for (let index = 0; index < 40; index += 1) days = addPlanDraftDay(days)
    expect(days).toHaveLength(AUTHORED_PLAN_DAY_COUNT_MAX)

    const missingTitle = finalizePlanDaysDraft(
      { id: null, title: '  ', description: '', goal: 'Похудение' },
      [[breakfast]],
      'user-1',
      { emptyTitleError: 'Назовите план' },
    )
    expect(missingTitle).toEqual({ ok: false, error: 'Назовите план' })

    const hole = finalizePlanDaysDraft(
      { id: null, title: 'Офис', description: 'Два дня', goal: 'Поддержание' },
      [[emptyMealDraft('Завтрак')], [lunch]],
      'user-1',
    )
    expect(hole).toEqual({ ok: false, error: 'Добавьте приём в День 1' })

    const trailingEmpty = finalizePlanDaysDraft(
      { id: null, title: 'Офис', description: 'Два дня', goal: 'Поддержание' },
      [[breakfast], [emptyMealDraft('Завтрак')]],
      'user-1',
      { idPrefix: 'plan_', source: 'План' },
    )
    expect(trailingEmpty.ok).toBe(true)
    if (!trailingEmpty.ok) return
    expect(trailingEmpty.days).toHaveLength(1)
    expect(trailingEmpty.days[0]?.meals.map((meal) => meal.title)).toEqual(['Омлет'])

    const split = finalizePlanDaysDraft(
      { id: null, title: 'Офис', description: 'Два дня', goal: 'Поддержание' },
      [[breakfast], [lunch]],
      'user-1',
      { idPrefix: 'plan_', source: 'План' },
    )
    expect(split.ok).toBe(true)
    if (!split.ok) return
    expect(split.days).toHaveLength(2)
    expect(split.days[0]?.title).toBe('Офис')
    expect(split.days[0]?.description).toBe('Два дня')
    expect(split.days[0]?.days).toBe(2)
    expect(split.days[0]?.meals.map((meal) => meal.title)).toEqual(['Омлет'])
    expect(split.days[1]?.meals.map((meal) => meal.title)).toEqual(['Курица'])
    expect(split.days[0]?.kcal).toBe(300)
    expect(split.days[1]?.kcal).toBe(400)
  })

  test('reorderMealDrafts places a meal where another plaque sits', () => {
    const meals = [
      { key: 'breakfast', slot: 'Завтрак' },
      { key: 'lunch', slot: 'Обед' },
      { key: 'dinner', slot: 'Ужин' },
    ]
    expect(reorderMealDrafts(meals, 'breakfast', 'dinner').map((meal) => meal.key)).toEqual([
      'lunch',
      'dinner',
      'breakfast',
    ])
    expect(reorderMealDrafts(meals, 'dinner', 'breakfast').map((meal) => meal.key)).toEqual([
      'dinner',
      'breakfast',
      'lunch',
    ])
    expect(reorderMealDrafts(meals, 'lunch', 'lunch')).toEqual(meals)
    expect(reorderMealDrafts(meals, 'missing', 'lunch')).toEqual(meals)
    expect(reorderMealDrafts(meals, 'lunch', 'missing')).toEqual(meals)
  })

  test('reorderPlanDraftDays moves a day plaque without copying meals', () => {
    const breakfast = [{ ...emptyMealDraft('Завтрак'), title: 'Омлет' }]
    const lunch = [{ ...emptyMealDraft('Обед'), title: 'Курица' }]
    const snack = [{ ...emptyMealDraft('Перекус'), title: 'Йогурт' }]
    expect(
      reorderPlanDraftDays([breakfast, lunch, snack], 0, 2).map((day) => day[0]?.title),
    ).toEqual(['Курица', 'Йогурт', 'Омлет'])
    expect(
      reorderPlanDraftDays([breakfast, lunch, snack], 2, 0).map((day) => day[0]?.title),
    ).toEqual(['Йогурт', 'Омлет', 'Курица'])
    expect(reorderPlanDraftDays([breakfast, lunch], 0, 0)).toEqual([breakfast, lunch])
    expect(reorderPlanDraftDays([breakfast, lunch], -1, 1)).toEqual([breakfast, lunch])
    expect(reorderPlanDraftDays([breakfast, lunch], 0, 5)).toEqual([breakfast, lunch])
  })

  test('next unused slot follows breakfast, lunch, snack, dinner', () => {
    expect(nextUnusedMealSlot([{ slot: 'Завтрак' }])).toBe('Обед')
    expect(nextUnusedMealSlot([{ slot: 'Завтрак' }, { slot: 'Обед' }])).toBe('Перекус')
    expect(nextUnusedMealSlot([{ slot: 'Завтрак' }, { slot: 'Обед' }, { slot: 'Перекус' }])).toBe(
      'Ужин',
    )
    expect(nextUnusedMealSlot(RATION_MEAL_SLOTS.map((slot) => ({ slot })))).toBe('Перекус')
  })

  test('draft line items start as one empty row and grow one by one', () => {
    expect(draftLineItems('')).toEqual([''])
    expect(draftLineItems('яйца\nшпинат')).toEqual(['яйца', 'шпинат'])
    expect(addDraftLine(['яйца'])).toEqual(['яйца', ''])
    expect(addDraftLine(['яйца', 'тост'], 0)).toEqual(['яйца', '', 'тост'])
    expect(setDraftLine(['', 'шпинат'], 0, 'яйца')).toEqual(['яйца', 'шпинат'])
    expect(removeDraftLine(['яйца'], 0)).toEqual([''])
    expect(removeDraftLine(['яйца', 'шпинат'], 0)).toEqual(['шпинат'])
    expect(moveDraftLine(['яйца', 'шпинат', 'тост'], 0, 1)).toEqual(['шпинат', 'яйца', 'тост'])
    expect(moveDraftLine(['яйца', 'шпинат'], 0, -1)).toEqual(['яйца', 'шпинат'])
    expect(joinDraftLines(['яйца', 'шпинат'])).toBe('яйца\nшпинат')
  })

  test('parses ingredients, numbered steps and decimal macros', () => {
    expect(splitIngredientLines('яйца; шпинат\nтост, ')).toEqual(['яйца', 'шпинат', 'тост'])
    expect(splitStepLines('1. Взбейте яйца\n\n2) Обжарьте\n')).toEqual(['Взбейте яйца', 'Обжарьте'])
    expect(parseMacroField('12,5')).toBe(12.5)
    expect(parseMacroField('-3')).toBe(0)
  })

  test('preview and finalize ignore unnamed meals and sum macros', () => {
    const draft = emptyRationDraft()
    draft.title = 'Лёгкий день'
    draft.meals[0]!.title = 'Овсянка'
    draft.meals[0]!.kcal = '320'
    draft.meals[0]!.protein = '12'
    draft.meals[0]!.fat = '8'
    draft.meals[0]!.carbs = '48'
    draft.meals[0]!.ingredients = 'хлопья\nмолоко'
    draft.meals[0]!.stepsText = '1. Залейте хлопья\nВарите 5 минут'
    draft.meals.push({ ...draft.meals[0]!, key: 'unnamed', title: '' })
    const preview = previewRationFromDraft(draft)
    expect(preview.title).toBe('Лёгкий день')
    expect(preview.meals).toHaveLength(1)
    expect(preview.kcal).toBe(320)
    expect(preview.source).toBe(MENTOR_RATION_SOURCE)

    const saved = finalizeRationDraft(draft, 'mentor-user-1')
    expect(saved.ok).toBe(true)
    if (!saved.ok) return
    expect(saved.ration.meals[0]?.ingredients).toBe('хлопья, молоко')
    expect(saved.ration.meals[0]?.steps).toEqual(['Залейте хлопья', 'Варите 5 минут'])
    expect(saved.ration.id.startsWith('mentor-')).toBe(true)
    expect(saved.ration.mealsPerDay).toBe(1)
  })

  test('refuses a ration without a title or named meal', () => {
    const draft = emptyRationDraft()
    expect(finalizeRationDraft(draft, 'u1')).toEqual({ ok: false, error: 'Назовите рацион' })
    expect(finalizeRationDraft(draft, 'u1', { emptyTitleError: 'Назовите план' })).toEqual({
      ok: false,
      error: 'Назовите план',
    })
    draft.title = 'День'
    expect(finalizeRationDraft(draft, 'u1')).toEqual({
      ok: false,
      error: 'Добавьте хотя бы один приём с названием',
    })
  })

  test('splits a mentor plan into one draft per day', () => {
    const days = rationPlanDayDrafts({
      ...sample,
      meals: [
        { ...sample.meals[0]!, title: 'Овсянка', dayIndex: 0 },
        { ...sample.meals[0]!, title: 'Омлет', dayIndex: 1 },
      ],
    })
    expect(days).toHaveLength(2)
    expect(days.map((day) => day.map((meal) => meal.title))).toEqual([['Овсянка'], ['Омлет']])
  })

  test('round-trips a saved card and drops broken storage rows', () => {
    const draft = rationToDraft(sample)
    const saved = finalizeRationDraft(draft, 'u1')
    expect(saved.ok).toBe(true)
    if (!saved.ok) return
    expect(saved.ration.id).toBe('mentor-sample')
    expect(saved.ration.kcal).toBe(700)
    expect(draft.meals[0]?.ingredients).toBe('яйца\nшпинат')
    expect(draftLineItems(draft.meals[0]?.ingredients ?? '')).toEqual(['яйца', 'шпинат'])
    expect(draftLineItems(draft.meals[0]?.stepsText ?? '')).toEqual(['Взбейте яйца', 'Обжарьте'])
    expect(parseAuthoredRations([saved.ration, { id: 'x' }, null])).toEqual([saved.ration])
    expect(AUTHORED_RATIONS_STORAGE_PREFIX).toBe('nora:mentor-authored-rations:v1:')
  })

  test('two test mentor cards cover a light day and a gain day', () => {
    const cards = testAuthoredRations()
    expect(cards).toHaveLength(2)
    expect(cards.map((card) => card.title)).toEqual([
      'Тестовый лёгкий день',
      'Тестовый силовой день',
    ])
    expect(cards.every((card) => card.source === MENTOR_RATION_SOURCE)).toBe(true)
    expect(cards[0]?.meals.length).toBeGreaterThanOrEqual(2)
    expect(cards[1]?.meals.length).toBeGreaterThanOrEqual(2)
    expect(cards.every((card) => card.kcal > 0 && card.meals[0]?.title)).toBe(true)
    expect(ensureTestAuthoredRations('mentor-test-user').map((card) => card.id)).toEqual([
      'mentor-test-light-day',
      'mentor-test-gain-day',
    ])
  })

  test('mentor can send an authored ration to a user once', () => {
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
      const userId = 'mentee-assign-test'
      localStorage.removeItem(assignedAuthoredRationsStorageKey(userId))
      const first = assignAuthoredRationToUser(userId, sample)
      expect(first.kind).toBe('assigned')
      expect(first.rations).toHaveLength(1)
      expect(readAssignedAuthoredRations(userId)[0]?.title).toBe('Белковый день')
      const second = assignAuthoredRationToUser(userId, { ...sample, title: 'Другое название' })
      expect(second.kind).toBe('same')
      expect(second.rations[0]?.title).toBe('Белковый день')
      expect(assignedAuthoredRationState(first.rations, sample.id)).toBe('same')
      expect(assignedAuthoredRationState([], sample.id)).toBe('free')
      expect(menteePickerLabel({ displayName: 'Анна', nickname: 'anna', email: 'a@x.com' })).toBe(
        'Анна',
      )
      expect(menteePickerLabel({ displayName: null, nickname: 'anna', email: 'a@x.com' })).toBe(
        'anna',
      )
      expect(menteePickerInitials('Анна Петрова')).toBe('АП')
      expect(menteePickerInitials('Игорь')).toBe('ИГ')
      expect(
        mergeAssignedRations([{ ...sample, id: 'catalog-1', title: 'Каталог' }], first.rations).map(
          (ration) => ration.id,
        ),
      ).toEqual(['mentor-sample', 'catalog-1'])
      const catalogOnly = [{ ...sample, id: 'catalog-1', title: 'Каталог' }]
      expect(
        rationsForSectionTab({
          tab: 'Избранное',
          libraryRations: catalogOnly,
          catalog: catalogOnly,
          authored: first.rations,
          combineFavorites: true,
        }).map((ration) => ration.id),
      ).toEqual(['mentor-sample', 'catalog-1'])
      expect(
        rationsForSectionTab({
          tab: 'Все',
          libraryRations: catalogOnly,
          catalog: catalogOnly,
          authored: first.rations,
          combineFavorites: true,
        }).map((ration) => ration.id),
      ).toEqual(['catalog-1'])
      expect(
        rationsForSectionTab({
          tab: 'Избранное',
          libraryRations: catalogOnly,
          catalog: catalogOnly,
          authored: first.rations,
          combineFavorites: false,
        }).map((ration) => ration.id),
      ).toEqual(['catalog-1'])
      expect(ASSIGNED_AUTHORED_RATIONS_STORAGE_PREFIX).toBe(
        'nora:mentor-assigned-authored-rations:v1:',
      )
    } finally {
      Object.defineProperty(globalThis, 'localStorage', {
        configurable: true,
        value: originalStorage,
      })
    }
  })
})
