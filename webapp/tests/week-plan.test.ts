import { readFileSync } from 'node:fs'

import { describe, expect, test } from 'bun:test'

import {
  calorieBalanceTone,
  RATION_DIARY_DONE_MARK,
  RATION_DIARY_SOURCE_MARK,
  rationPlanAssumption,
  readSkippedPlanMealIds,
  type MealEntry,
  weekPlanAssumption,
  writeSkippedPlanMealIds,
} from '../src/features/diary'
import { SAMPLE_RATIONS } from './sample-ration'
import { allPlanOptions, appendAuthoredPlan, createAuthoredPlan, readAuthoredPlans, removeAuthoredPlan, weekPlanOptions } from '../src/features/mentor'
import { visiblePlanCards, partitionPlanCards } from '../src/features/plans/PlanToolbar'
import {
  planShoppingDayOptions,
  planShoppingItems,
  planShoppingItemsForDay,
} from '../src/features/plans/plan-shopping'
import { readSelectedPlanId, readSelectedPlanIds, writeSelectedPlanId, writeSelectedPlanIds } from '../src/features/plans/saved-plans'
import {
  averageMealsPerDayLabel,
  buildCurrentWeekPlan,
  buildWeekPlan,
  buildWeekPlanFromRation,
  CURRENT_WEEK_PLAN_TITLE,
  currentWeekPlanId,
  defaultPlanDayKey,
  formatPlanActiveRange,
  planOccupancyMarks,
  planOccupancyOnDay,
  planRangeFromStart,
  filledPlanBoardDays,
  mobilePlanDayTabs,
  nextPlanDayCount,
  padPlanDaysForEditor,
  removeEmptyPlanDay,
  planDayTabParts,
  rationDaysFromSharedRation,
  buildWeekPlanFromSharedRation,
  rationDaysFromBoard,
  rationStampDays,
  sharedRationSnapshotFromWeekPlan,
  WEEK_PLAN_CARD_SLOTS,
  type WeekPlan,
} from '../src/features/plans/week-plan'

const now = new Date(2026, 8, 1)

function mealOn(day: Date, patch: Partial<MealEntry> & Pick<MealEntry, 'id' | 'title'>): MealEntry {
  return {
    ingredients: 'яйца',
    category: 'Завтрак',
    meal: 'Завтрак',
    at: new Date(day.getFullYear(), day.getMonth(), day.getDate(), 9).toISOString(),
    kcal: 300,
    protein: 20,
    fat: 10,
    carbs: 15,
    image: '/rations/ration-01.jpg',
    fromApi: true,
    assumptions: [RATION_DIARY_SOURCE_MARK],
    ...patch,
  }
}

describe('current week plan', () => {
  test('keeps a stable week id and one empty card slot when nothing is planned', () => {
    const plan = buildCurrentWeekPlan({ meals: [], rations: SAMPLE_RATIONS, now })
    expect(plan.id).toBe(currentWeekPlanId(now))
    expect(plan.title).toBe(CURRENT_WEEK_PLAN_TITLE)
    expect(plan.days).toEqual([])
    expect(plan.kcal).toBe(0)
    expect(plan.mealsCount).toBe(0)
    expect(WEEK_PLAN_CARD_SLOTS).toBe(1)
    expect(plan.cardDays).toHaveLength(WEEK_PLAN_CARD_SLOTS)
    expect(plan.cardDays.map((day) => day.short)).toEqual(['День 1'])
    expect(plan.cardDays.every((day) => !day.filled)).toBe(true)
    expect(plan.cardDays.every((day) => day.kcal === 0 && day.mealsCount === 0)).toBe(true)
    expect(weekPlanOptions(now)[0]).toEqual({
      id: currentWeekPlanId(now),
      title: CURRENT_WEEK_PLAN_TITLE,
    })
  })

  test('average meals per day uses Russian plural forms', () => {
    expect(averageMealsPerDayLabel(0, 0)).toBe('0 приёмов в день')
    expect(averageMealsPerDayLabel(1, 1)).toBe('1 приём в день')
    expect(averageMealsPerDayLabel(3, 1)).toBe('3 приёма в день')
    expect(averageMealsPerDayLabel(21, 7)).toBe('3 приёма в день')
    expect(averageMealsPerDayLabel(15, 4)).toBe('4 приёма в день')
    expect(averageMealsPerDayLabel(13, 5)).toBe('3 приёма в день')
  })

  test('selected plan badge shows the active date range', () => {
    expect(formatPlanActiveRange(new Date(2026, 8, 7), 9)).toBe('07.09 - 15.09')
    expect(formatPlanActiveRange(new Date(2026, 8, 7), 1)).toBe('07.09 - 07.09')
    expect(formatPlanActiveRange(new Date(2026, 8, 28), 6)).toBe('28.09 - 03.10')
    expect(formatPlanActiveRange(new Date(2026, 8, 7), 0)).toBe('07.09 - 07.09')
  })

  test('placed rations keep their own color and stack on shared days', () => {
    const marks = planOccupancyMarks([
      { id: 'a', title: 'Сытная', dayCount: 6, start: '2026-09-19' },
      { id: 'b', title: 'Ровная', dayCount: 4, start: new Date(2026, 8, 22) },
      { id: 'empty', title: 'Без даты', dayCount: 3, start: null },
    ])
    expect(marks.map((mark) => mark.planId)).toEqual(['a', 'b'])
    expect(marks[0]!.color).not.toBe(marks[1]!.color)
    expect(planOccupancyOnDay(marks, new Date(2026, 8, 20)).map((mark) => mark.planId)).toEqual(['a'])
    expect(planOccupancyOnDay(marks, new Date(2026, 8, 23)).map((mark) => mark.planId)).toEqual([
      'a',
      'b',
    ])
    expect(planOccupancyOnDay(marks, new Date(2026, 8, 26))).toEqual([])
  })

  test('plan range from start covers the full day count', () => {
    const start = new Date(2026, 8, 21)
    expect(planRangeFromStart(start, 1)).toEqual({
      from: new Date(2026, 8, 21),
      to: new Date(2026, 8, 21),
    })
    expect(planRangeFromStart(start, 7)).toEqual({
      from: new Date(2026, 8, 21),
      to: new Date(2026, 8, 27),
    })
    expect(planRangeFromStart(start, 0)).toEqual({
      from: new Date(2026, 8, 21),
      to: new Date(2026, 8, 21),
    })
  })

  test('collects ration days added this week and ignores meals outside it', () => {
    const monday = new Date(2026, 7, 31)
    const tuesday = new Date(2026, 8, 1)
    const previousMonday = new Date(2026, 7, 24)
    const first = SAMPLE_RATIONS[0]!
    const second = SAMPLE_RATIONS[1]!
    const plan = buildCurrentWeekPlan({
      now,
      rations: SAMPLE_RATIONS,
      meals: [
        mealOn(monday, {
          id: 'm-mon',
          title: first.meals[0]!.title,
          assumptions: [RATION_DIARY_SOURCE_MARK, rationPlanAssumption(first.id)],
        }),
        mealOn(tuesday, {
          id: 'm-tue',
          title: second.meals[0]!.title,
          kcal: 400,
          assumptions: [RATION_DIARY_SOURCE_MARK, rationPlanAssumption(second.id)],
        }),
        mealOn(previousMonday, {
          id: 'm-old',
          title: first.meals[0]!.title,
          assumptions: [RATION_DIARY_SOURCE_MARK, rationPlanAssumption(first.id)],
        }),
      ],
    })
    expect(plan.days.map((day) => day.short)).toEqual(['День 1', 'День 2'])
    expect(plan.days[0]?.ration?.id).toBe(first.id)
    expect(plan.days[1]?.ration?.id).toBe(second.id)
    expect(plan.days[0]?.meals).toHaveLength(1)
    expect(plan.coverImage).toBe('/rations/ration-01.jpg')
    expect(plan.kcal).toBe(Math.round((first.kcal + second.kcal) / 2))
    expect(plan.mealsCount).toBe(2)
    expect(plan.cardDays).toHaveLength(1)
    expect(plan.cardDays[0]?.filled).toBe(true)
    expect(plan.cardDays[0]?.ration?.id).toBe(first.id)
  })

  test('fills an empty weekday from last week’s pending template', () => {
    const previousTuesday = new Date(2026, 7, 25)
    const first = SAMPLE_RATIONS[0]!
    const plan = buildCurrentWeekPlan({
      now,
      rations: SAMPLE_RATIONS,
      meals: [
        mealOn(previousTuesday, {
          id: 'm-last-tue',
          title: first.meals[0]!.title,
          assumptions: [
            RATION_DIARY_SOURCE_MARK,
            rationPlanAssumption(first.id),
            weekPlanAssumption('week:2026-08-24'),
          ],
        }),
      ],
    })
    expect(plan.days[0]?.filled).toBe(true)
    expect(plan.days[0]?.short).toBe('День 2')
    expect(plan.days[0]?.meals.map((meal) => meal.id)).toEqual(['m-last-tue'])
    expect(plan.cardDays[0]?.filled).toBe(false)
  })

  test('hides a meal detached from the weekly plan', () => {
    const tuesday = new Date(2026, 8, 1)
    const first = SAMPLE_RATIONS[0]!
    const plan = buildCurrentWeekPlan({
      detachedIds: new Set(['m-tue']),
      now,
      rations: SAMPLE_RATIONS,
      meals: [
        mealOn(tuesday, {
          id: 'm-tue',
          title: first.meals[0]!.title,
          assumptions: [RATION_DIARY_SOURCE_MARK, rationPlanAssumption(first.id)],
        }),
      ],
    })
    expect(plan.days).toEqual([])
    expect(plan.cardDays[0]?.filled).toBe(false)
    expect(plan.cardDays[0]?.meals).toEqual([])
  })

  test('keeps Thursday in the plan even when the list card only shows one day', () => {
    const thursday = new Date(2026, 8, 3)
    const ration = SAMPLE_RATIONS[0]!
    const plan = buildCurrentWeekPlan({
      now,
      rations: SAMPLE_RATIONS,
      meals: [
        mealOn(thursday, {
          id: 'm-thu',
          title: ration.meals[0]!.title,
          assumptions: [RATION_DIARY_SOURCE_MARK, rationPlanAssumption(ration.id)],
        }),
      ],
    })
    expect(plan.cardDays.map((day) => day.short)).toEqual(['День 1'])
    expect(plan.cardDays.map((day) => day.filled)).toEqual([false])
    expect(plan.mealsCount).toBe(1)
    expect(plan.days.map((day) => day.short)).toEqual(['День 4'])
    expect(plan.days[0]?.meals[0]?.title).toBe(ration.meals[0]!.title)
  })

  test('marks a day done only when every planned meal on that day is completed', () => {
    const monday = new Date(2026, 7, 31)
    const ration = SAMPLE_RATIONS[0]!
    const pending = buildCurrentWeekPlan({
      now,
      rations: SAMPLE_RATIONS,
      meals: [
        mealOn(monday, {
          id: 'm1',
          title: ration.meals[0]!.title,
          assumptions: [RATION_DIARY_SOURCE_MARK, rationPlanAssumption(ration.id)],
        }),
        mealOn(monday, {
          id: 'm2',
          title: ration.meals[1]?.title ?? 'Обед',
          meal: 'Обед',
          assumptions: [RATION_DIARY_SOURCE_MARK, rationPlanAssumption(ration.id)],
        }),
      ],
    })
    expect(pending.days[0]?.done).toBe(false)
    const done = buildCurrentWeekPlan({
      now,
      rations: SAMPLE_RATIONS,
      completedIds: new Set(['m1', 'm2']),
      meals: pending.days[0]
        ? [
            mealOn(monday, {
              id: 'm1',
              title: ration.meals[0]!.title,
              assumptions: [RATION_DIARY_SOURCE_MARK, rationPlanAssumption(ration.id)],
            }),
            mealOn(monday, {
              id: 'm2',
              title: ration.meals[1]?.title ?? 'Обед',
              meal: 'Обед',
              assumptions: [
                RATION_DIARY_SOURCE_MARK,
                RATION_DIARY_DONE_MARK,
                rationPlanAssumption(ration.id),
              ],
            }),
          ]
        : [],
    })
    expect(done.days[0]?.done).toBe(true)
  })

  test('keeps a mentor ration that is not in the ready-made catalog', () => {
    const monday = new Date(2026, 7, 31)
    const plan = buildCurrentWeekPlan({
      now,
      rations: SAMPLE_RATIONS,
      meals: [
        mealOn(monday, {
          id: 'mentor-meal',
          title: 'День от наставника',
          assumptions: [RATION_DIARY_SOURCE_MARK, rationPlanAssumption('mentor-fav-day')],
        }),
      ],
    })
    expect(plan.days).toHaveLength(1)
    expect(plan.days[0]?.ration?.id).toBe('mentor-fav-day')
    expect(plan.days[0]?.ration?.title).toBe('День от наставника')
    expect(plan.days[0]?.mealsCount).toBe(1)
    expect(plan.cardDays[0]?.filled).toBe(true)
    expect(plan.cardDays).toHaveLength(1)
  })
})

test('authored plans keep their own meals and cover', () => {
  const monday = new Date(2026, 7, 31)
  const ration = SAMPLE_RATIONS[0]!
  const weekId = currentWeekPlanId(now)
  const customId = 'plan_custom-office'
  const meals = [
    mealOn(monday, {
      id: 'week-meal',
      title: ration.meals[0]!.title,
      assumptions: [RATION_DIARY_SOURCE_MARK, rationPlanAssumption(ration.id), `План:${weekId}`],
    }),
    mealOn(monday, {
      id: 'custom-meal',
      title: 'Офисный обед',
      assumptions: [RATION_DIARY_SOURCE_MARK, rationPlanAssumption(ration.id), `План:${customId}`],
    }),
  ]
  const custom = buildWeekPlan({
    coverImage: '/plans/office.jpg',
    meals,
    now,
    planId: customId,
    rations: SAMPLE_RATIONS,
    title: 'Офис без срывов',
  })
  expect(custom.title).toBe('Офис без срывов')
  expect(custom.coverImage).toBe('/plans/office.jpg')
  expect(custom.days[0]?.meals.map((meal) => meal.id)).toEqual(['custom-meal'])
  const week = buildCurrentWeekPlan({ meals, now, rations: SAMPLE_RATIONS })
  expect(week.days[0]?.meals.map((meal) => meal.id)).toEqual(['week-meal'])
})

test('new plan cover uses the first real meal photo and skips the collage placeholder', () => {
  const monday = new Date(2026, 7, 31)
  const customId = 'plan_custom-office'
  const placeholderMeals = [
    mealOn(monday, {
      id: 'placeholder-meal',
      title: 'Круассан',
      image: '/diary/meal-preview-placeholder.jpg',
      assumptions: [RATION_DIARY_SOURCE_MARK, `План:${customId}`],
    }),
  ]
  const emptyCover = buildWeekPlan({
    coverImage: '',
    meals: placeholderMeals,
    now,
    planId: customId,
    rations: [],
    title: 'Другой план',
  })
  expect(emptyCover.coverImage).toBe('/rations/plan-cover-placeholder.png')

  const photoMeals = [
    mealOn(monday, {
      id: 'photo-meal',
      title: 'Круассан',
      image: '/diary/croissant.jpg',
      assumptions: [RATION_DIARY_SOURCE_MARK, `План:${customId}`],
    }),
  ]
  const fromMeal = buildWeekPlan({
    coverImage: '/diary/meal-preview-placeholder.jpg',
    meals: photoMeals,
    now,
    planId: customId,
    rations: [],
    title: 'Другой план',
  })
  expect(fromMeal.coverImage).toBe('/diary/croissant.jpg')

  const fromExpiredApiCover = buildWeekPlan({
    coverImage:
      '/api/meals/11111111-1111-4111-8111-111111111111/image?exp=1&sig=abc',
    meals: photoMeals,
    now,
    planId: customId,
    rations: [],
    title: 'Другой план',
  })
  expect(fromExpiredApiCover.coverImage).toBe('/diary/croissant.jpg')

  const extrasOnly = buildWeekPlan({
    coverImage: '',
    meals: [
      mealOn(monday, {
        id: 'extras-meal',
        title: 'Круассан',
        image: '/diary/meal-preview-placeholder.jpg',
        extraImages: ['/diary/croissant.jpg'],
        assumptions: [RATION_DIARY_SOURCE_MARK, `План:${customId}`],
      }),
    ],
    now,
    planId: customId,
    rations: [],
    title: 'Другой план',
  })
  expect(extrasOnly.coverImage).toBe('/diary/croissant.jpg')
})

test('mobile plan cards tuck share, favorite and delete into a more menu', () => {
  const source = readFileSync(new URL('../src/features/plans/WeekPlanCard.tsx', import.meta.url), 'utf8')
  expect(source).toContain('EllipsisIcon')
  expect(source).toContain('DropdownMenu')
  expect(source).toContain('data-plan-card-more=""')
  expect(source).toContain('aria-label="Ещё"')
  expect(source).toContain('В избранное')
  expect(source).toContain('Поделиться')
  expect(source).toContain("variant=\"destructive\"")
  expect(source).toContain('whitespace-nowrap')
  expect(source).toContain('side="bottom"')
  expect(source).not.toContain('side="top"')
  expect(source).not.toContain('min-w-44')
  expect(source).toContain('hidden items-center gap-1 md:flex')
  expect(source).toContain('md:hidden')
  expect(source).toContain('sm:group-hover:opacity-100')
  expect(source).toContain('ShoppingBagIcon')
})

test('week plan card paints a plan summary plaque and a taller preview', () => {
  const source = readFileSync(new URL('../src/features/plans/WeekPlanCard.tsx', import.meta.url), 'utf8')
  const page = readFileSync(new URL('../src/features/plans/pages.tsx', import.meta.url), 'utf8')
  expect(source).toContain('PlanSummaryPlaque')
  expect(source).toContain('daysCountLabel(plan.days.length)')
  expect(source).toContain('{plan.kcal} ккал')
  expect(source).toContain('data-plan-cover-kcal=""')
  expect(source).toContain('mealsCountAria(plan.mealsCount)')
  expect(source).toContain('{plan.mealsCount}')
  expect(source).toContain('data-plan-summary=""')
  expect(source).toContain('size-7')
  expect(source).not.toContain('size-[20px]')
  expect(source).toContain('ListIcon')
  expect(source).toContain('CircleCheckIcon')
  expect(source).not.toContain('<CheckIcon')
  expect(source).toContain('nora-tint-dimmed')
  expect(source).toContain("fromMentor={fromMentor}")
  expect(source).not.toContain("selected={selected}")
  expect(source).toContain('bg-[var(--nora-inset)]')
  expect(source).toContain('px-2')
  expect(source).toContain('gap-2')
  expect(source).not.toContain('plan.cardDays.map')
  expect(source).not.toContain('{day.kcal} ккал')
  expect(source).not.toContain("selected && 'scheme-editor-dark'")
  expect(source).not.toContain("data-selected={selected ? '' : undefined}")
  const css = readFileSync(new URL('../src/styles/card-hover.css', import.meta.url), 'utf8')
  expect(css).not.toContain("[data-slot='meal-card'][data-selected]")
  expect(css).not.toContain('--meal-card-fill: #2C2C2E')
  expect(css).not.toContain('--nora-panel: #2C2C2E')
  expect(source).toContain("selected ? 'Выбран' : 'Выбрать'")
  expect(source).toContain('CircleCheckIcon')
  expect(source).toContain("variant={selected ? 'primary' : 'default'}")
  expect(source).toContain('!selected && productCardFooterCtaClass')
  expect(source).toContain('!bg-[var(--nora-tint)] !text-white')
  expect(source).not.toContain('Выбрать план')
  expect(source).not.toContain('План выбран')
  expect(source).toContain('{plan.title}')
  expect(source).not.toContain('{plan.description}')
  expect(source).not.toContain('whitespace-pre-line')
  expect(source).toContain('averageMealsPerDayLabel(plan.mealsCount, plan.days.length)')
  expect(source).not.toContain('Текущий план')
  expect(source).toContain('{activeRange}')
  expect(source).toContain('max-md:hidden')
  expect(source).toContain('productCardGoalAnchorClass')
  expect(source).toContain('fromMentor')
  expect(source).toContain('ProductCardOriginBadge')
  expect(source).toContain('origin="mentor-rations"')
  expect(source).toContain('bg-[var(--nora-success)] text-white')
  expect(page).toContain('fromMentor={isAssignedPlanId(plan.id)}')
  expect(page).toContain('authoredPlanCanShareToFeed')
  expect(page).toContain('canShare={')
  expect(page).toContain('onShare={() => void toggleShare(plan)}')
  expect(page).not.toContain('onShare={isAuthoredPlanId(plan.id) ?')
  expect(source).toContain('const shareDisabled = !onShare || (!canShare && !shared)')
  expect(source).toContain('disabled={shareDisabled}')
  expect(source).not.toContain('{onShare ? (')
  expect(source).toContain("'Этот рацион нельзя отправить в ленту'")
  expect(page).toContain('formatPlanActiveRange(')
  expect(page).toContain('description: ration.description')
  expect(page).toContain('description: catalog.description')
  expect(page).toContain('plan?.description.trim()')
  expect(page).toContain('showHeaderOnMobile')
  expect(page).toContain(
    'const canMutateDays = Boolean(\n    plan && !catalogView && !feedPreview && !isAssignedPlanId(plan.id),\n  )',
  )
  expect(page).toContain('onAddEmptyDay={canMutateDays ? addEmptyDay : undefined}')
  expect(page).toContain('onRemoveEmptyDay={canMutateDays ? removeEmptyDay : undefined}')
  expect(page).not.toContain('!feedPreview && !isAssignedPlanId(plan.id) ? addEmptyDay')
  expect(page).toContain('nextPlanDayCount(')
  expect(page).toContain('removeEmptyPlanDay(')
  const shell = readFileSync(new URL('../src/features/plans/PlanPageShell.tsx', import.meta.url), 'utf8')
  expect(shell).toContain('data-plan-mobile-header=""')
  const mobileStart = shell.indexOf('data-plan-mobile-header=""')
  const mobileHeader = shell.slice(
    mobileStart,
    shell.indexOf('noraPageTitleClass', mobileStart),
  )
  expect(mobileHeader).toContain('noraProductTitleClass')
  expect(mobileHeader).toContain('aria-label="О рационе"')
  expect(mobileHeader).toContain('INFO_BAR_CLASS')
  expect(mobileHeader).toContain('INFO_MARK_CLASS')
  expect(mobileHeader).not.toContain('CalendarDaysIcon')
  expect(shell).toContain('rounded-[16px] bg-[var(--nora-inset)] p-2.5')
  expect(shell).toContain('noraProductTitleClass')
  expect(shell).toContain("'hidden md:block'")
  expect(shell).toContain('InfoIcon')
  expect(shell).toContain('data-plan-info=""')
  expect(shell).not.toContain('data-modal-frame="meal"')
  expect(shell).toContain('productSheetOverlayChipClass')
  expect(shell).toContain('aria-label="О рационе"')
  expect(shell).toContain('data-plan-info-open=""')
  expect(shell).toContain('flex size-8 shrink-0 items-center justify-center rounded-full bg-[var(--nora-text)]')
  expect(shell).toContain('h-auto max-h-[calc(100dvh-var(--modal-sheet-inset))]')
  expect(shell).not.toContain('top-[var(--modal-sheet-inset)] bottom-0')
  expect(shell).toContain('min-w-0 flex-1 truncate text-left')
  expect(shell).not.toContain('<DialogHeader')
  expect(shell).toContain('text-[13px] font-normal leading-5 text-[var(--nora-text)]')
  expect(shell).toContain(
    'text-[13px] font-light leading-5 text-[var(--nora-text-secondary)] dark:text-[color-mix(in_srgb,var(--nora-text)_42%,var(--nora-text-secondary))]',
  )
  expect(shell).toContain('Описание:')
  expect(shell).toContain('Показатели:')
  expect(shell).toContain('mb-1.5 pl-4 font-[family-name:var(--nora-font)] text-[13px] font-medium leading-5 text-[var(--nora-text)]')
  expect(shell).toContain('text-[13px] font-medium leading-5 text-[var(--nora-text)]')
  expect(shell).toContain('noraProductTitleClass')
  expect(shell).not.toContain('items-start justify-between')
  expect(shell).not.toContain('>Описание<')
  expect(shell).not.toContain('>Показатели<')
  expect(shell).not.toContain('Сводка')
  expect(shell).toContain('FACT_ICON_WRAP_CLASS')
  expect(shell).toContain('rounded-full')
  expect(shell).toContain('bg-[var(--nora-panel)] text-[var(--nora-text-secondary)]')
  expect(shell).not.toContain('bg-[var(--nora-input-bg)]/72')
  expect(shell).not.toContain('data-plan-info-divider=""')
  expect(shell).toContain('px-4 py-3')
  expect(shell).toContain('data-plan-info-summary=""')
  expect(shell).toContain('CalendarDaysIcon')
  expect(shell).toContain('UtensilsIcon')
  expect(shell).toContain('FlameIcon')
  expect(shell).toContain('onEdit')
  expect(shell).toContain('aria-label="Изменить"')
  expect(shell.slice(shell.indexOf('data-plan-info=""'))).not.toContain('Изменить')
  expect(page).toContain('onEdit={canEdit ? () => openEditor() : undefined}')
  const infoBody = shell.slice(shell.indexOf('overflow-y-auto'))
  expect(infoBody.indexOf('MealFeedPhoto')).toBeGreaterThan(-1)
  expect(infoBody.indexOf('MealFeedPhoto')).toBeLessThan(infoBody.indexOf('DialogDescription'))
  expect(infoBody.indexOf('DialogDescription')).toBeLessThan(infoBody.indexOf('data-plan-info-summary=""'))
  expect(shell).not.toContain('data-plan-info-edit=""')
  expect(shell).toContain('CalendarDaysIcon')
  expect(shell).toContain("fact.label !== 'Цель'")
  const coverBadge = source.slice(
    source.indexOf("cn(productCardGoalAnchorClass"),
    source.indexOf('absolute inset-x-0 bottom-0'),
  )
  expect(coverBadge).toContain('{activeRange}')
  expect(coverBadge).toContain('{!selected ? (')
  expect(coverBadge).toContain('{plan.kcal} ккал')
  expect(coverBadge).toContain('data-plan-cover-kcal=""')
  expect(coverBadge).toContain('tabular-nums md:hidden')
  expect(coverBadge.indexOf('ProductCardOriginBadge')).toBeLessThan(
    coverBadge.indexOf('data-plan-cover-kcal=""'),
  )
  expect(coverBadge).not.toContain('Текущий план')
  expect(coverBadge).not.toContain('{plan.days.length}')
  const coverCopy = source.slice(
    source.indexOf('absolute inset-x-0 bottom-0'),
    source.indexOf('{onDelete ?'),
  )
  expect(coverCopy).toContain('{plan.title}')
  expect(coverCopy).not.toContain('{plan.description}')
  expect(coverCopy).not.toContain('PLAN_COVER_FADE_BLUR_CLASS')
  expect(coverCopy).not.toContain('backdrop-blur-[16px]')
  expect(coverCopy).toContain('bg-gradient-to-t from-black/62 to-transparent')
  expect(source).not.toContain('PLAN_COVER_FADE_BLUR_CLASS')
  expect(coverCopy).toContain('averageMealsPerDayLabel(plan.mealsCount, plan.days.length)')
  expect(coverCopy).not.toContain('{plan.kcal} ккал')
  expect(coverCopy).not.toContain('daysCountLabel(plan.days.length)')
  expect(coverCopy).not.toContain('mealsCountLabel(plan.mealsCount)')
  expect(source).toContain('WEEK_PLAN_CARD_SLOTS')
  expect(source).toContain('h-[204px]')
  expect(source).toContain('md:h-[224px]')
  expect(source).not.toContain('aspect-[4/3]')
  expect(source).not.toContain('max-h-[108px]')
  expect(page).toContain('useSyncedPlanLibrary(')
  expect(page).toContain('persist(')
  expect(page).toContain('canReorder={canMutateDays}')
  const savedPlans = readFileSync(
    new URL('../src/features/plans/saved-plans.ts', import.meta.url),
    'utf8',
  )
  expect(savedPlans).toContain('clearSkippedPlanMealIds(')
  expect(source).toContain('productCardFooterCtaClass')
  expect(source).toContain("variant={selected ? 'primary' : 'default'}")
  expect(source).toContain('ShoppingBagIcon')
  expect(source).toContain('disabled={shoppingMeals.length === 0}')
  expect(source).not.toContain('shoppingMeals.length > 0 ?')
  const shopping = readFileSync(
    new URL('../src/features/plans/PlanShoppingDialog.tsx', import.meta.url),
    'utf8',
  )
  expect(shopping).toContain('rounded-[16px] bg-[var(--nora-inset)]')
  expect(shopping).toContain('ShoppingBagIcon')
  expect(shopping).toContain('Продукты')
  expect(shopping).toContain('data-plan-shopping-products=""')
  expect(shopping).toContain('куплено')
  expect(shopping).toContain('productSheetOverlayChipClass')
  expect(shopping).toContain('data-plan-shopping-day=""')
  expect(shopping).not.toContain('<ShoppingHeading>День</ShoppingHeading>')
  expect(shopping.indexOf('data-plan-shopping-list=""')).toBeLessThan(
    shopping.indexOf('data-plan-shopping-day=""'),
  )
  expect(shopping).toContain('planShoppingDayOptions(days.length)')
  expect(shopping).toContain('data-plan-shopping-day-tab')
  expect(shopping).toContain('data-plan-shopping-all-days')
  expect(shopping).toContain('CalendarDaysIcon')
  expect(shopping).toContain('PLAN_SHOPPING_ALL_DAYS')
  expect(shopping).toContain('aria-label={option.label}')
  expect(shopping).not.toContain('NoraSelect')
  expect(shopping).toContain('sr-only')
  expect(shopping).toContain('Список продуктов плана {title}')
  expect(shopping).not.toContain('shoppingDescription')
  expect(shopping).not.toContain('отметьте, что уже купили')
  const startDialog = readFileSync(
    new URL('../src/features/plans/PlanStartDialog.tsx', import.meta.url),
    'utf8',
  )
  expect(startDialog).toContain('rounded-[16px] bg-[var(--nora-inset)]')
  expect(startDialog).toContain('CalendarDaysIcon')
  expect(startDialog).toContain('data-plan-start-calendar=""')
  expect(startDialog).toContain('data-plan-start-dialog=""')
  expect(startDialog).toContain('noraSheetCalendarClass')
  expect(startDialog).toContain('compactDays')
  expect(startDialog).toContain('mode="range"')
  expect(startDialog).toContain('numberOfMonths={1}')
  expect(startDialog).toContain('planRangeFromStart')
  expect(startDialog).toContain('data-plan-occupied=""')
  expect(startDialog).toContain('data-plan-occupied-layer={mark.planId}')
  expect(startDialog).toContain('data-plan-start-occupied=""')
  expect(startDialog).toContain('planOccupancyOnDay')
  expect(page).toContain('planOccupancyMarks(')
  expect(page).toContain(".filter((id) => id !== startPickerPlanId)")
  expect(startDialog).toContain('h-auto')
  expect(startDialog).toContain('!pb-0')
  expect(startDialog).toContain('data-plan-start-divider=""')
  expect(startDialog).toContain('!h-10 !min-h-10 !max-h-10')
  expect(startDialog).toContain('sr-only')
  expect(startDialog).not.toContain('data-modal-frame')
  expect(startDialog).not.toContain('День 1 начнётся')
  expect(startDialog).toContain('text-[var(--nora-text-tertiary)]')
  expect(startDialog).not.toContain('text-[13px] font-light leading-5 text-[var(--nora-text-secondary)]')
  expect(source).toContain('h-10 min-h-10')
  expect(source).toContain('aria-label="Удалить"')
  expect(source).toContain('Trash2Icon')
  expect(source).toContain('onDelete')
  expect(source).toContain('sm:group-hover:opacity-100')
  expect(page).toContain('selectedPlanIds.has(plan.id)')
  expect(page).toContain('onDelete={() => setDeletePlanTarget({ id: plan.id, title: plan.title })}')
  expect(page).toContain('withoutAuthoredPlan(')
  expect(page).toContain('RationEditorDialog')
  expect(page).toContain('mode="plan"')
  expect(page).not.toContain('CreatePlanDialog')
  expect(page).toContain('PlanToolbar')
  const toolbar = readFileSync(new URL('../src/features/plans/PlanToolbar.tsx', import.meta.url), 'utf8')
  expect(toolbar).toContain('UtensilsIcon')
  expect(toolbar).not.toContain('UtensilsCrossedIcon')
  expect(toolbar).not.toContain('PlusIcon')
  expect(toolbar).not.toContain('ListIcon')
  expect(toolbar).toContain('LayoutGridIcon')
  expect(toolbar).toContain('Rows2Icon')
  expect(toolbar).toContain('data-plan-card-layout=""')
  expect(toolbar).toContain('Показать карточки списком')
  expect(toolbar).toContain('Показать карточки сеткой')
  expect(toolbar).toContain('md:hidden')
  expect(page).toContain('planFeedGridClass(cardLayout)')
  expect(page).toContain('writePlanCardLayout(next)')
  expect(page).toContain('layout={cardLayout}')
  const card = readFileSync(new URL('../src/features/plans/WeekPlanCard.tsx', import.meta.url), 'utf8')
  expect(card).toContain('max-md:flex-row max-md:items-stretch')
  expect(card).toContain('max-md:aspect-square')
  expect(card).toContain("layout = 'grid'")
  expect(toolbar).toContain('PlanGroupPlaque')
  expect(toolbar).toContain('PLAN_GROUP_PLAQUE_TONE')
  expect(toolbar).toContain("bg-[var(--nora-inset)] text-[var(--nora-text-secondary)]")
  expect(toolbar).toContain('bg-[var(--nora-success-dimmed)] text-[var(--nora-success)]')
  expect(toolbar).not.toContain("bg-[var(--nora-text)] text-[var(--nora-panel)]")
  expect(toolbar).not.toContain('bg-[var(--nora-success)] text-white')
  expect(toolbar).not.toContain('bg-[var(--nora-tint)] text-white')
  expect(toolbar).not.toContain('bg-[#16A34A] text-white')
  expect(toolbar).not.toContain('nora-tint-dimmed')
  expect(toolbar).not.toContain('nora-badge-green-bg')
  expect(toolbar).toContain('UserIcon')
  expect(toolbar).toContain('GraduationCapIcon')
  expect(page).toContain('onTabChange={setTab}')
  expect(page).toContain('Пока нет избранных планов')
  expect(page).toContain('visiblePlanCards(')
  expect(page).toContain('PlanGroupHeading')
  expect(page).toContain('label="Мои"')
  expect(page).toContain('tone="mine"')
  expect(page).toContain('label="Наставник"')
  expect(page).toContain('tone="mentor"')
  expect(page).toContain('label="Наставник"')
  expect(page).toContain('count={groupedCards.mine.length}')
  expect(page).toContain('count={groupedCards.mentor.length}')
  expect(toolbar).toContain('UtensilsIcon')
  expect(toolbar).not.toContain('UtensilsCrossedIcon')
  expect(toolbar).toContain('PlanGroupHeading')
  expect(page).toContain('partitionPlanCards(')
  expect(page).toContain('PlanStartDialog')
  expect(page).toContain('dayCount={Math.max(')
  expect(page).toContain('void selectPlan(plan.id)')
  expect(page).toContain("'Добавить'")
  expect(page).toContain('md:hidden">В рационах')
  expect(page).toContain("'В рационах'")
  expect(page).toContain('Уже в рационах')
  expect(page).not.toContain('Добавить в рационы')
  expect(page).toContain('addCatalogToMine')
  expect(page).toContain('PLAN_CATALOG')
  expect(page).toContain('canCreate={canCreate}')
  expect(page).toContain("library !== 'catalog'")
  expect(page).toContain('PLAN_MOBILE_DOCK_ACTION_ID')
  expect(page).toContain('UtensilsIcon')
  expect(page).not.toContain('UtensilsCrossedIcon')
  expect(page).not.toContain('PlusIcon')
  expect(page).toContain('MOBILE_DOCK_FAB_ICON_ACTIVE_CLASS')
  expect(page).toContain('buildWeekPlanFromCatalog')
  expect(page).toContain('buildWeekPlanFromSharedRation')
  expect(page).toContain('sharedRationId')
  expect(page).toContain('addSharedRationToMine')
  expect(page).toContain('planToolbarPillClass')
  expect(page).toContain('size-9 shrink-0 justify-center p-0')
  expect(page).toContain('aria-label="Назад"')
  expect(page).toContain('ArrowLeftIcon')
  expect(page).toContain('PlanOutlineDialog')
  expect(page).toContain('Изменить')
  expect(page).toContain('PencilIcon')
  expect(page).not.toContain('<PencilIcon aria-hidden className={MOBILE_DOCK_FAB_ICON_CLASS}')
  expect(page).not.toContain('>Редактировать<')
  expect(page).not.toContain('PLAN_MOBILE_DOCK_EDIT_ID')
  expect(page).toContain('data-plan-outline-open=""')
  expect(page).toContain('disabled={movingMeals}')
  expect(page).toContain("'disabled:opacity-100'")
  expect(page).toContain('onPickingChange={setMovingMeals}')
  expect(page).toContain('canEdit')
  expect(page).toContain('writePlanOutline')
  expect(page).toContain('applyWeekOutline')
  expect(page).toContain('onOpenPlan')
  expect(page).toContain('showMobileBackDock')
  expect(page).toContain('MOBILE_DOCK_FAB_CLASS')
  const dock = readFileSync(
    new URL('../src/features/plans/mobile-dock.ts', import.meta.url),
    'utf8',
  )
  expect(dock).toContain('ios-float-pill-dock')
  expect(dock).toContain('font-medium')
  expect(dock).toContain("size-4 text-[var(--nora-text-secondary)]")
  expect(page).toContain('createPortal')
  expect(page).toContain('PLAN_MOBILE_DOCK_EXTRA_ID')
  expect(page).toContain("cloned ? 'Открыть в «Мои»' : 'Добавить'")
  expect(page).toContain('max-md:hidden')
  expect(page).not.toContain(`{catalogView ? (
            <section className="flex flex-col">`)
  expect(page).toContain('catalogCloneErrorMessage')
  expect(page).not.toContain('planToolbarIconButtonClass')
  expect(page).toContain('productFeedToolbarRowClass')
  expect(page).not.toContain("variant={cloned ? 'default' : 'primary'}")
})

test('plan favorites tab keeps only bookmarked cards', () => {
  const week: WeekPlan = {
    id: 'week:1',
    title: 'План на неделю',
    kcal: 0,
    coverImage: '',
    cardDays: [],
    days: [],
    mealsCount: 0,
    goal: null,
  }
  const mine: WeekPlan = { ...week, id: 'mine_1', title: 'Мой', goal: 'Похудение' }
  const saved = new Set(['mine_1'])
  expect(visiblePlanCards([week, mine], '', saved, 'Избранное').map((plan) => plan.id)).toEqual([
    'mine_1',
  ])
  expect(visiblePlanCards([week, mine], 'мой', saved, 'Все').map((plan) => plan.id)).toEqual([
    'mine_1',
  ])
})

test('plan toolbar filters catalog apart from own and mentor cards', () => {
  const week: WeekPlan = {
    id: 'week:1',
    title: 'План на неделю',
    kcal: 0,
    coverImage: '',
    cardDays: [],
    days: [],
    mealsCount: 0,
    goal: null,
  }
  const mine: WeekPlan = { ...week, id: 'plan_office', title: 'Офис', goal: 'Похудение' }
  const catalog: WeekPlan = { ...week, id: 'catalog_loss', title: 'Минус', goal: 'Похудение' }
  const mentor: WeekPlan = {
    ...week,
    id: '3f1c0a1e-6b2d-4c8a-9e11-aaaaaaaaaaaa',
    title: 'От наставника',
    goal: 'Набор',
  }
  const all = [week, mine, catalog, mentor]
  expect(visiblePlanCards(all, '', new Set(), 'Все', 'mine').map((plan) => plan.id)).toEqual([
    'week:1',
    'plan_office',
    mentor.id,
  ])
  expect(visiblePlanCards(all, '', new Set(), 'Все', 'mentor').map((plan) => plan.id)).toEqual([
    'week:1',
    'plan_office',
    mentor.id,
  ])
  expect(visiblePlanCards(all, '', new Set(), 'Все', 'catalog').map((plan) => plan.id)).toEqual([
    'catalog_loss',
  ])
})

test('a ration-backed plan exposes meal cards on day 1', () => {
  const ration = SAMPLE_RATIONS[0]!
  const plan = buildWeekPlanFromRation({
    coverImage: ration.image,
    planId: 'plan-mentor-1',
    ration,
    title: 'План наставника',
  })
  expect(plan.days).toHaveLength(1)
  expect(plan.days[0]?.short).toBe('День 1')
  expect(plan.days[0]?.meals.map((meal) => meal.title)).toEqual(
    ration.meals.map((meal) => meal.title),
  )
  expect(plan.days[0]?.meals.every((meal) => meal.fromApi !== true)).toBe(true)
})

test('a mentor plan with day indexes keeps each day', () => {
  const ration = {
    ...SAMPLE_RATIONS[0]!,
    kcal: 700,
    meals: [
      { ...SAMPLE_RATIONS[0]!.meals[0]!, title: 'Овсянка', kcal: 300, dayIndex: 0 },
      { ...SAMPLE_RATIONS[0]!.meals[0]!, title: 'Омлет', kcal: 400, dayIndex: 1 },
    ],
  }
  const plan = buildWeekPlanFromRation({
    planId: 'plan-mentor-days',
    ration,
    title: 'Два дня',
  })
  expect(plan.days).toHaveLength(2)
  expect(plan.days.map((day) => day.short)).toEqual(['День 1', 'День 2'])
  expect(plan.days.map((day) => day.meals.map((meal) => meal.title))).toEqual([
    ['Овсянка'],
    ['Омлет'],
  ])
  expect(plan.days.map((day) => day.kcal)).toEqual([300, 400])
  expect(plan.kcal).toBe(350)
  expect(plan.mealsCount).toBe(2)
  const moved = rationDaysFromBoard(ration, [
    { meals: [...plan.days[0]!.meals, ...plan.days[1]!.meals] },
    { meals: [] },
  ])
  expect(moved.map((day) => day.meals.map((meal) => meal.title))).toEqual([['Овсянка', 'Омлет'], []])
})

test('stamping a mentor plan keeps each day instead of piling meals onto day 1', () => {
  const ration = {
    ...SAMPLE_RATIONS[0]!,
    meals: [
      { ...SAMPLE_RATIONS[0]!.meals[0]!, title: 'Овсянка', dayIndex: 0 },
      { ...SAMPLE_RATIONS[0]!.meals[0]!, title: 'Омлет', dayIndex: 0 },
      { ...SAMPLE_RATIONS[0]!.meals[0]!, title: 'Суп', dayIndex: 1 },
      { ...SAMPLE_RATIONS[0]!.meals[0]!, title: 'Рыба', dayIndex: 1 },
    ],
  }
  const days = rationStampDays(ration)
  expect(days).toHaveLength(2)
  expect(days.map((day) => day.meals.map((meal) => meal.title))).toEqual([
    ['Овсянка', 'Омлет'],
    ['Суп', 'Рыба'],
  ])
  const gapped = rationStampDays({
    ...ration,
    meals: [
      { ...SAMPLE_RATIONS[0]!.meals[0]!, title: 'Завтрак', dayIndex: 0 },
      { ...SAMPLE_RATIONS[0]!.meals[0]!, title: 'Ужин', dayIndex: 2 },
    ],
  })
  expect(gapped).toHaveLength(3)
  expect(gapped[1]?.meals).toEqual([])
  expect(gapped[2]?.meals.map((meal) => meal.title)).toEqual(['Ужин'])
})

test('plan day kcal follows the diary calorie balance tones', () => {
  expect(calorieBalanceTone(1606, 1800)).toBe('yellow')
  expect(calorieBalanceTone(2140, 1800)).toBe('red')
  expect(calorieBalanceTone(1800, 1800)).toBe('green')
})

test('mobile plan day tabs show ordinal day number and open on day 1', () => {
  expect(
    planDayTabParts({
      short: 'День 4',
      label: 'День 4',
    }),
  ).toEqual({ ordinal: 4, label: 'День 4' })
  expect(planDayTabParts({ short: 'Слот', label: 'План' }, 2)).toEqual({
    ordinal: 3,
    label: 'День 3',
  })
  expect(
    defaultPlanDayKey(
      [{ dayKey: '2026-09-01' }, { dayKey: '2026-09-03' }],
      new Date(2026, 8, 3),
    ),
  ).toBe('2026-09-01')
  expect(
    defaultPlanDayKey([{ dayKey: '2026-09-01' }], new Date(2026, 8, 3)),
  ).toBe('2026-09-01')
  expect(defaultPlanDayKey([])).toBeNull()
})

test('filledPlanBoardDays hides a day that lost its last meal', () => {
  const empty: WeekPlan['days'][number] = {
    dayKey: '2026-09-01',
    short: 'День 1',
    label: 'День 1',
    dayIso: '2026-09-01T12:00:00',
    filled: false,
    ration: null,
    meals: [],
    mealsCount: 0,
    kcal: 0,
    done: false,
  }
  const filled = {
    ...empty,
    dayKey: '2026-09-02',
    short: 'День 2',
    label: 'День 2',
    dayIso: '2026-09-02T12:00:00',
    filled: true,
    meals: [mealOn(new Date(2026, 8, 2), { id: 'moved', title: 'Круассан' })],
    mealsCount: 1,
    kcal: 784,
  }
  expect(filledPlanBoardDays([empty, filled]).map((day) => day.dayKey)).toEqual(['2026-09-02'])
  expect(filledPlanBoardDays([filled])).toHaveLength(1)
})

test('mobilePlanDayTabs drops trailing empty padded days unless selected', () => {
  const monday = {
    dayKey: '2026-08-31',
    short: 'Пн 31',
    label: 'Понедельник, 31 августа',
    dayIso: '2026-08-31',
    ration: null,
    filled: true,
    meals: [mealOn(new Date(2026, 7, 31), { id: 'a', title: 'Круассан' })],
    mealsCount: 1,
    kcal: 300,
  }
  const emptySunday = {
    dayKey: '2026-09-06',
    short: 'Вс 6',
    label: 'Воскресенье, 6 сентября',
    dayIso: '2026-09-06',
    ration: null,
    filled: false,
    meals: [],
    mealsCount: 0,
    kcal: 0,
  }
  expect(mobilePlanDayTabs([monday, emptySunday]).map((day) => day.dayKey)).toEqual(['2026-08-31'])
  expect(
    mobilePlanDayTabs([monday, emptySunday], emptySunday.dayKey).map((day) => day.dayKey),
  ).toEqual(['2026-08-31', '2026-09-06'])
})

test('nextPlanDayCount appends an empty day up to the plan day cap', () => {
  expect(nextPlanDayCount(0)).toBe(1)
  expect(nextPlanDayCount(3)).toBe(4)
  expect(nextPlanDayCount(7)).toBe(8)
  expect(nextPlanDayCount(0, 4)).toBe(5)
  expect(nextPlanDayCount(30)).toBe(30)
})

test('removeEmptyPlanDay drops a trailing empty day and keeps filled meals', () => {
  const now = new Date(2026, 8, 1)
  const padded = padPlanDaysForEditor(
    [
      {
        dayKey: '2026-08-31',
        short: 'День 1',
        label: 'День 1',
        dayIso: '2026-08-31T12:00:00',
        filled: true,
        ration: null,
        meals: [mealOn(new Date(2026, 7, 31), { id: 'mon', title: 'Круассан' })],
        mealsCount: 1,
        kcal: 784,
        done: false,
      },
    ],
    now,
    3,
  )
  expect(padded).toHaveLength(3)
  expect(removeEmptyPlanDay(padded, padded[0]!.dayKey, now)).toHaveLength(3)
  const next = removeEmptyPlanDay(padded, padded[2]!.dayKey, now)
  expect(next).toHaveLength(2)
  expect(next.map((day) => day.short)).toEqual(['День 1', 'День 2'])
  expect(next[0]?.meals.map((meal) => meal.id)).toEqual(['mon'])
  expect(next[1]?.meals).toEqual([])
})

test('current plan lays meals under a diary-sized day badge', () => {
  const source = readFileSync(
    new URL('../src/features/plans/CurrentPlanMeals.tsx', import.meta.url),
    'utf8',
  )
    expect(source).toContain('{day.short}')
    expect(source).toContain('{day.kcal} ккал')
    expect(source).toContain('mealsCountLabel(day.mealsCount)')
    expect(source).toContain('UtensilsIcon')
    expect(source).toContain('ml-auto')
    expect(source).toContain('Удалить')
    expect(source).toContain('data-plan-remove-day')
    expect(source).toContain('onRemoveEmptyDay')
    expect(source).toContain('calorieBalanceTone(day.kcal, dailyCalories)')
    expect(source).toContain('CALORIE_BALANCE_CHIP_CLASS')
    expect(source).toContain('ZapIcon')
    expect(source).toContain('role="tablist"')
    expect(source).toContain('md:hidden')
    expect(source).toContain('hidden flex-col gap-6 md:flex')
    expect(source).toContain('padPlanDaysForEditor(')
    expect(source).toContain('filledPlanBoardDays(')
    expect(source).toContain('mobilePlanDayTabs(')
    expect(source).toContain('tabDays')
    expect(source).toContain('PlusIcon')
    expect(source).toContain('data-plan-add-day')
    expect(source).toContain('onAddEmptyDay')
    expect(source).toContain('const canAddEmptyDay = Boolean(onAddEmptyDay) && picking')
    expect(source).toContain('disabled={tabDays.length >= PLAN_DAY_TAB_SLOTS}')
    expect(source).toContain("list.scrollTo({ left: 0, behavior: 'smooth' })")
    const addDayChip = source.slice(
      source.indexOf('data-plan-add-day'),
      source.indexOf('tabDays.map'),
    )
    expect(addDayChip).toContain('bg-[var(--nora-text)] text-[var(--nora-panel)]')
    expect(addDayChip).not.toContain('nora-tint')
    expect(source).toContain('active && !picking &&')
    expect(source).toContain('PLAN_DAY_TAB_SLOTS')
    expect(source).toContain('PLAN_DAY_TAB_SIZE_CLASS')
    expect(source).toContain('w-[3.25rem] min-w-[3.25rem] max-w-[3.25rem] shrink-0 grow-0')
    expect(source).toContain('no-scrollbar flex w-full gap-1.5 overflow-x-auto overscroll-x-contain')
    expect(source).not.toContain('placeholderCount')
    expect(source).not.toContain('PLAN_DAY_TAB_PLACEHOLDER_CLASS')
    expect(source).toContain('bg-[var(--nora-inset)]')
    expect(source).not.toContain('shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--nora-text)_5%,transparent)]')
    expect(source).not.toContain('PLAN_DAY_TAB_PLATE_CLASS')
    expect(source).toContain('rounded-full')
    expect(source).not.toContain('CheckIcon')
    expect(source).toContain('PLAN_DAY_TAB_SELECTED_CLASS')
    expect(source).toContain('bg-[#2C2C2E]')
    expect(source).toContain('text-[#888888]')
    expect(source).toContain('bg-[var(--nora-tint)] text-white')
    expect(source).toContain('выполнен')
    expect(source).toContain('{parts.ordinal}')
    expect(source).toContain('defaultPlanDayKey(')
    expect(source.slice(source.indexOf('{day.short}'), source.indexOf('{day.kcal}'))).toContain('</div>')
    expect(source).toContain("quiet: true")
    expect(source).toContain("id: 'favorite-added'")
    expect(source).toContain("id: 'favorite-removed'")
    expect(source).toContain('reconcileLocalFavoriteIds(')
    expect(source).not.toContain('stampStyle=')
    expect(source).not.toContain('feedDayHeading')
    expect(source).toContain('PlanMealGrid')
    expect(source).toContain('canReorder')
    expect(source).toContain('data-plan-day-tab')
  expect(source).toContain("aria-label={picking ? 'Отмена' : 'Переместить'}")
  expect(source).toContain('MOBILE_DOCK_PILL_CLASS')
  expect(source).toContain('Переместить')
  expect(source).toContain('ArrowLeftRightIcon')
  expect(source).toContain('XIcon')
  expect(source).toContain('PLAN_MEALS_MOVE_HINT')
  expect(source).toContain('data-plan-move-hint=""')
  expect(source.indexOf('data-plan-move-hint=""')).toBeGreaterThan(source.indexOf('role="tablist"'))
  expect(source.slice(source.indexOf('data-plan-move-hint=""') - 120, source.indexOf('data-plan-move-hint=""'))).toContain('pl-2.5')
  expect(source).toContain('active && !picking\n                          ? \'bg-[var(--nora-tint)] text-white\'')
  expect(source).toContain('noraPageDescriptionClass')
  expect(source).not.toContain('toast.info(PLAN_MEALS_MOVE_HINT')
  expect(source).not.toContain("id: 'plan-meals-move-hint'")
  expect(source).toContain("className={!picking ? 'max-md:hidden' : undefined}")
  expect(source).toContain('onPickingChange')
    expect(source).toContain('orderBadge')
    expect(source).toContain('showPlanState={false}')
    expect(source).toContain('isRationPlanDone(')
    expect(source).toContain('onDetachPlanMeal')
    expect(source).toContain('Убрано из плана')
    expect(source).not.toContain('allowCompletePlan')
    expect(source).not.toContain('onCompletePlan')
    expect(source).toContain('PLAN_DAY_BADGE_CLASS')
  expect(source).toContain('h-7 min-h-7 max-h-7')
  expect(source).toContain('readOnly')
  expect(source).toContain('onAddToPlan')
  expect(source).toContain('DiaryPlanDayPicker')
  expect(source).toContain('lockedPlan')
  expect(source).toContain('allowPendingCopies')
  expect(source).toContain('addMealToPlanDay')
  expect(source).toContain('diaryMealPhotoSrc')
  expect(source).toContain('catalogFavoriteCreateDraft')
  expect(source).not.toContain('hideFooterShare={readOnly}')
  expect(source).toContain('mealCanShareToFeed')
  expect(source).toContain('useUserFavoritesQuery(')
  expect(source).not.toContain("id: 'favorites-load-failed'")
})

test('mentor plan cards open a day view instead of the create modal', () => {
  const page = readFileSync(
    new URL('../src/features/plans/MentorPlansPage.tsx', import.meta.url),
    'utf8',
  )
  expect(page).toContain("to: '/mentor/plans/$planId'")
  expect(page).toContain('emptyRationDraft')
  expect(page).toContain('<CurrentPlanMeals')
  expect(page).toContain('readOnly')
  expect(page).not.toContain('setDraft(rationToDraft')
})

test('mentee assigned plans drill into meal cards by day', () => {
  const mentee = readFileSync(
    new URL('../src/features/plans/MenteeAssignedPlans.tsx', import.meta.url),
    'utf8',
  )
  expect(mentee).toContain('usePlanAssignmentQuery')
  expect(mentee).not.toContain('useMentorUserPlanLibraryQuery')
  expect(mentee).not.toContain('label="Мои"')
  expect(mentee).toContain('label="От наставника"')
  expect(mentee).not.toContain('label="Наставник"')
  expect(mentee).toContain('<CurrentPlanMeals')
  expect(mentee).toContain('readOnly')
  expect(mentee).toContain('onDetailBack')
})

test('plan shopping drops catalog garnish notes from grocery rows', () => {
  const monday = new Date(2026, 7, 31)
  const items = planShoppingItems([
    mealOn(monday, {
      id: 'shop-notes',
      title: 'Вареники',
      ingredients:
        'Мука – 1 кг , в тесто, Яйцо – 2 шт. , СО, в тесто, Вода – 420 г , в тесто, Соль – 1 ч.л. , в тесто, Картофель – 1 кг, Масло сливочное – 50 г , 72,5%, Приправа – 1 ст.л. , "Для свинины"',
      assumptions: [],
      fromApi: false,
    }),
  ])
  expect(items.map((item) => item.label)).toEqual([
    'Мука – 1 кг',
    'Яйцо – 2 шт',
    'Вода – 420 г',
    'Соль – 1 ч.л',
    'Картофель – 1 кг',
    'Масло сливочное – 50 г',
    'Приправа – 1 ст.л',
  ])
  expect(items.some((item) => /для подачи|в тесто|^со$|72|для свинины/i.test(item.label))).toBe(false)
})

test('plan shopping sums the same product across meals and days', () => {
  const monday = new Date(2026, 7, 31)
  const tuesday = new Date(2026, 8, 1)
  expect(
    planShoppingItems([
      mealOn(monday, {
        id: 'flour-1',
        title: 'Сырники',
        ingredients: 'Мука – 30 г, Творог – 1 кг',
        assumptions: [],
        fromApi: false,
      }),
      mealOn(tuesday, {
        id: 'flour-2',
        title: 'Пирог',
        ingredients: 'Мука – 400 г, Сахар – 70 г',
        assumptions: [],
        fromApi: false,
      }),
    ]).map((item) => item.label),
  ).toEqual(['Мука – 430 г', 'Творог – 1 кг', 'Сахар – 70 г'])
})

test('plan shopping sums the same oil across millilitres and spoons', () => {
  const monday = new Date(2026, 7, 31)
  expect(
    planShoppingItems([
      mealOn(monday, {
        id: 'oil-1',
        title: 'Салат',
        ingredients: 'Масло растительное – 110 мл, Соль – 1 ч.л',
        assumptions: [],
        fromApi: false,
      }),
      mealOn(monday, {
        id: 'oil-2',
        title: 'Жаркое',
        ingredients: 'Масло растительное – 1 ч.л, Масло растительное – 5 ст.л',
        assumptions: [],
        fromApi: false,
      }),
    ]).map((item) => item.label),
  ).toEqual(['Масло растительное – 190 мл', 'Соль – 1 ч.л'])
})

test('plan shopping lists unique groceries from every planned meal', () => {
  const monday = new Date(2026, 7, 31)
  const items = planShoppingItems([
    mealOn(monday, {
      id: 'shop-1',
      title: 'Омлет',
      ingredients: 'яйца, хлеб',
      assumptions: [],
      fromApi: false,
    }),
    mealOn(monday, {
      id: 'shop-2',
      title: 'Суп',
      ingredients: 'хлеб, морковь',
      assumptions: [],
      fromApi: false,
    }),
  ])
  expect(items.map((item) => item.label)).toEqual(['Яйца', 'Хлеб', 'Морковь'])
})

test('plan shopping splits newline ingredients and portion lines', () => {
  const monday = new Date(2026, 7, 31)
  expect(
    planShoppingItems([
      mealOn(monday, {
        id: 'nl-1',
        title: 'Салат',
        ingredients: 'кефир 1%\nяблоко 150 г',
        assumptions: [],
        fromApi: false,
      }),
    ]).map((item) => item.label),
  ).toEqual(['Кефир 1%', 'Яблоко 150 г'])
  expect(
    planShoppingItems([
      mealOn(monday, {
        id: 'pi-1',
        title: 'Обед',
        ingredients: 'ignored blob',
        portionItems: ['треска 150 г', 'кабачок'],
        assumptions: [],
        fromApi: false,
      }),
    ]).map((item) => item.label),
  ).toEqual(['Треска 150 г', 'Кабачок'])
})

test('plan shopping can list groceries for one plan day', () => {
  const monday = new Date(2026, 7, 31)
  const tuesday = new Date(2026, 8, 1)
  const days = [
    {
      meals: [
        mealOn(monday, {
          id: 'd1',
          title: 'Омлет',
          ingredients: 'яйца, хлеб',
          assumptions: [],
          fromApi: false,
        }),
      ],
    },
    {
      meals: [
        mealOn(tuesday, {
          id: 'd2',
          title: 'Суп',
          ingredients: 'хлеб, морковь',
          assumptions: [],
          fromApi: false,
        }),
      ],
    },
  ]
  expect(planShoppingDayOptions(2).map((item) => item.label)).toEqual([
    'Все дни',
    '1 день',
    '2 день',
  ])
  expect(planShoppingItemsForDay(days, 'all').map((item) => item.label)).toEqual([
    'Яйца',
    'Хлеб',
    'Морковь',
  ])
  expect(planShoppingItemsForDay(days, '1').map((item) => item.label)).toEqual(['Яйца', 'Хлеб'])
  expect(planShoppingItemsForDay(days, '2').map((item) => item.label)).toEqual(['Хлеб', 'Морковь'])
})

test('week plan preview meals fill the shopping list without a diary stamp', () => {
  const plan = buildWeekPlanFromRation({
    planId: 'plan:preview-shop',
    title: 'Превью',
    ration: SAMPLE_RATIONS[0]!,
    now,
  })
  expect(plan.days[0]?.meals[0]?.assumptions).toEqual(['mentor-meal:0:0'])
  expect(plan.days[0]?.meals[0]?.fromApi).toBe(false)
  expect(
    planShoppingItems(plan.days.flatMap((day) => day.meals)).map((item) => item.label),
  ).toEqual(['Яйца', 'Кабачок', 'Помидор', 'Огурец'])
  expect(planShoppingItemsForDay(plan.days, '1').map((item) => item.label)).toEqual([
    'Яйца',
    'Кабачок',
    'Помидор',
    'Огурец',
  ])
})

test('plan shopping dialog keeps the day filter usable inside the cart', () => {
  const source = readFileSync(
    new URL('../src/features/plans/PlanShoppingDialog.tsx', import.meta.url),
    'utf8',
  )
  expect(source).toContain('disablePointerDismissal')
  expect(source).toContain('data-plan-shopping-day-tab')
  expect(source).not.toMatch(/<NoraSelect[\s\S]*?\bmodal\b/)
  expect(source).toContain('planShoppingItemsForDay')
})

test('plan list splits own cards from mentor cards', () => {
  const week: WeekPlan = {
    id: 'week:1',
    title: 'План на неделю',
    kcal: 0,
    coverImage: '',
    cardDays: [],
    days: [],
    mealsCount: 0,
    goal: null,
  }
  const mine: WeekPlan = { ...week, id: 'plan_office', title: 'Офис', goal: 'Похудение' }
  const mentor: WeekPlan = {
    ...week,
    id: '3f1c0a1e-6b2d-4c8a-9e11-aaaaaaaaaaaa',
    title: 'От наставника',
    goal: 'Набор',
  }
  expect(partitionPlanCards([week, mine, mentor])).toEqual({
    mine: [week, mine],
    mentor: [mentor],
  })
})

test('selecting plans keeps every active plan id', () => {
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
    const scope = { userId: 'user-1', email: 'plan@example.com' }
    writeSelectedPlanIds(scope, new Set(['week:2026-08-31']))
    expect(readSelectedPlanId(scope)).toBe('week:2026-08-31')
    writeSelectedPlanIds(scope, new Set(['week:2026-08-31', 'plan_office']))
    expect([...readSelectedPlanIds(scope)]).toEqual(['week:2026-08-31', 'plan_office'])
    writeSelectedPlanId(scope, 'week:2026-09-07')
    expect(readSelectedPlanId(scope)).toBe('week:2026-09-07')
    expect(readSelectedPlanIds(scope).size).toBe(1)
    writeSelectedPlanId(scope, null)
    expect(readSelectedPlanId(scope)).toBe(null)
    expect(readSelectedPlanIds(scope).size).toBe(0)
  } finally {
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      value: originalStorage,
    })
  }
})

test('selecting a plan restores skipped pending diary cards', () => {
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
    const scope = { userId: 'user-1', email: 'plan@example.com' }
    writeSkippedPlanMealIds(scope, new Set(['kefir-apple']))
    expect(readSkippedPlanMealIds(scope).has('kefir-apple')).toBe(true)
    writeSelectedPlanId(scope, null)
    expect(readSkippedPlanMealIds(scope).has('kefir-apple')).toBe(true)
    writeSelectedPlanId(scope, 'week:2026-08-31')
    expect(readSkippedPlanMealIds(scope).size).toBe(0)
  } finally {
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      value: originalStorage,
    })
  }
})

test('authored plans persist and join the ration picker options', () => {
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
    const scope = { userId: 'user-1', email: 'plan@example.com' }
    expect(createAuthoredPlan({ title: '   ', coverImage: '' })).toBe(null)
    const created = createAuthoredPlan({
      title: 'Офис',
      coverImage: '/cover.jpg',
      id: 'plan_fixed-office',
      goal: 'Похудение',
    })
    expect(created?.id).toBe('plan_fixed-office')
    expect(created?.goal).toBe('Похудение')
    expect(created?.description).toBe('')
    const counted = createAuthoredPlan({
      title: 'Четыре дня',
      coverImage: '/cover.jpg',
      dayCount: 4,
    })
    expect(counted?.dayCount).toBe(4)
    const withCopy = createAuthoredPlan({
      title: 'Офис',
      coverImage: '/cover.jpg',
      description: '  День в офисе.\nБез срывов к вечеру.  ',
    })
    expect(withCopy?.description).toBe('День в офисе.\nБез срывов к вечеру.')
    appendAuthoredPlan(scope, created!)
    expect(readAuthoredPlans(scope).map((plan) => plan.title)).toEqual(['Офис'])
    expect(readAuthoredPlans(scope)[0]?.goal).toBe('Похудение')
    appendAuthoredPlan(scope, { ...created!, dayCount: 4 })
    expect(readAuthoredPlans(scope)[0]?.dayCount).toBe(4)
    const cloned = createAuthoredPlan({
      title: 'Минус без голода',
      coverImage: '/rations/ration-08.jpg',
      sourceCatalogId: 'catalog_loss',
    })
    expect(cloned?.sourceCatalogId).toBe('catalog_loss')
    appendAuthoredPlan(scope, cloned!)
    expect(readAuthoredPlans(scope)[0]?.sourceCatalogId).toBe('catalog_loss')
    const options = allPlanOptions(scope, now)
    expect(options[0]).toEqual(weekPlanOptions(now)[0])
    expect(options.some((plan) => plan.id === created?.id && plan.title === 'Офис')).toBe(true)
    expect(removeAuthoredPlan(scope, created!.id).map((plan) => plan.id)).not.toContain(created!.id)
    expect(readAuthoredPlans(scope)[0]?.sourceCatalogId).toBe('catalog_loss')
    expect(removeAuthoredPlan(scope, cloned!.id)).toEqual([])
  } finally {
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      value: originalStorage,
    })
  }
})

test('week plan snapshot for the feed keeps meals by day', () => {
  const plan: WeekPlan = {
    id: 'plan_11111111-1111-4111-8111-111111111111',
    title: 'Офис',
    description: 'День',
    kcal: 420,
    coverImage: '/cover.jpg',
    mealsCount: 1,
    goal: 'Похудение',
    cardDays: [],
    days: [
      {
        dayKey: '2026-09-16',
        short: 'День 1',
        label: 'День 1',
        dayIso: '2026-09-16T12:00:00',
        filled: true,
        ration: null,
        meals: [
          mealOn(now, { id: 'm1', title: 'Курица', kcal: 420 }),
        ],
        mealsCount: 1,
        kcal: 420,
        done: false,
      },
    ],
  }
  const snapshot = sharedRationSnapshotFromWeekPlan(plan)
  expect(snapshot).toMatchObject({
    title: 'Офис',
    goal: 'Похудение',
    meals: [{ dayIndex: 0, title: 'Курица', kcal: 420, slot: 'Завтрак' }],
  })
})

test('shared feed ration opens as the same day-board plan', () => {
  const rationId = '019c0000-0000-7000-8000-000000000301'
  const sourcePlanId = 'plan_11111111-1111-4111-8111-111111111111'
  const ration = {
    id: rationId,
    sourcePlanId,
    title: 'Офис',
    description: 'День в офисе',
    goal: 'Похудение' as const,
    coverImage: '/cover.jpg',
    days: 2,
    kcal: 900,
    protein: 60,
    fat: 20,
    carbs: 80,
    meals: [
      {
        dayIndex: 0,
        slot: 'Обед' as const,
        title: 'Курица',
        ingredients: 'курица',
        image: '/diary/meals/meal-01.jpg',
        kcal: 420,
        protein: 35,
        fat: 12,
        carbs: 40,
      },
      {
        dayIndex: 1,
        slot: 'Завтрак' as const,
        title: 'Омлет',
        ingredients: 'яйца',
        image: '',
        kcal: 480,
        protein: 25,
        fat: 8,
        carbs: 40,
      },
    ],
    shared: true,
    sharedAt: '2026-09-16T10:00:00.000Z',
    createdAt: '2026-09-16T10:00:00.000Z',
    updatedAt: '2026-09-16T10:00:00.000Z',
    likeCount: 0,
    liked: false,
    own: false,
  }
  expect(rationDaysFromSharedRation(ration)).toHaveLength(2)
  const plan = buildWeekPlanFromSharedRation({ ration, now })
  expect(plan.id).toBe(sourcePlanId)
  expect(plan.title).toBe('Офис')
  expect(plan.days).toHaveLength(2)
  expect(plan.days[0]?.meals[0]?.title).toBe('Курица')
  expect(plan.days[1]?.meals[0]?.title).toBe('Омлет')
})
