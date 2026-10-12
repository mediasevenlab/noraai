import { expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'

import { ApiRequestError } from '../src/platform/api'
import { PLAN_COVER_PLACEHOLDER_SRC } from '../src/features/diary/meal-cover'
import { catalogCloneErrorMessage, firstDurablePlanCover, mealCreateImageFields, rationDayStampDate } from '../src/features/plans/plan-create'

test('plan create reuses the ration editor and stamps meals on chosen days', () => {
  const page = readFileSync(new URL('../src/features/plans/pages.tsx', import.meta.url), 'utf8')
  const create = readFileSync(new URL('../src/features/plans/plan-create.ts', import.meta.url), 'utf8')
  const editor = readFileSync(
    new URL('../src/features/mentor/MentorRationEditor.tsx', import.meta.url),
    'utf8',
  )
  expect(page).toContain('RationEditorDialog')
  expect(page).toContain('mode="plan"')
  expect(page).toContain('emptyRationDraft()')
  expect(page).toContain('AUTHORED_PLAN_ID_PREFIX')
  expect(page).toContain('stampRationDaysOntoPlan(')
  expect(page).toContain('onSaveDays=')
  expect(page).toContain('saveCreatedPlan(days, dayCount)')
  expect(page).toContain('firstDurablePlanCover(')
  expect(page).toContain('stampDaysOntoPlan(days, created.id)')
  expect(page).toContain('stampRationDaysOntoPlan(auth.transport, days, planId)')
  expect(create).toContain('rationMealCreateDrafts(')
  expect(create).toContain('rationPlanDaySlots(')
  expect(create).toContain('rationDayStampDate(')
  expect(create).toContain('createMyMeal(')
  expect(create).toContain('preferredMealPhotoSrc(')
  expect(create).toContain('firstDurablePlanCover(')
  expect(page).not.toContain('CreatePlanDialog')
  expect(editor).toContain("mode?: 'ration' | 'plan'")
  expect(editor).toContain("const showGoal = mode === 'ration'")
  expect(editor).toContain('data-plan-editor-header=""')
  expect(editor).toContain('data-plan-editor-add-day=""')
})

test('inline meal photos become create-meal image fields', () => {
  expect(mealCreateImageFields('')).toBeNull()
  expect(mealCreateImageFields('/rations/ration-01.jpg')).toBeNull()
  expect(
    mealCreateImageFields('data:image/jpeg;base64,abc123'),
  ).toEqual({ imageBase64: 'abc123', imageMime: 'image/jpeg' })
  expect(
    mealCreateImageFields('data:image/png;base64,xyz'),
  ).toEqual({ imageBase64: 'xyz', imageMime: 'image/png' })
})

test('durable plan cover prefers a saved photo then the first stamped meal', () => {
  expect(firstDurablePlanCover('/plans/office.jpg', [{ imageUrl: '/diary/croissant.jpg' }])).toBe(
    '/plans/office.jpg',
  )
  expect(firstDurablePlanCover('', [{ imageUrl: '/diary/croissant.jpg' }])).toBe(
    '/diary/croissant.jpg',
  )
  expect(
    firstDurablePlanCover('data:image/jpeg;base64,abc', [{ imageUrl: '/diary/croissant.jpg' }]),
  ).toBe('/diary/croissant.jpg')
  expect(firstDurablePlanCover('/diary/meal-preview-placeholder.jpg', [])).toBe(
    PLAN_COVER_PLACEHOLDER_SRC,
  )
  expect(firstDurablePlanCover('', [])).toBe(PLAN_COVER_PLACEHOLDER_SRC)
  expect(
    firstDurablePlanCover(
      '/api/meals/11111111-1111-4111-8111-111111111111/image?exp=1&sig=abc',
      [{ imageUrl: '/diary/croissant.jpg' }],
    ),
  ).toBe('/diary/croissant.jpg')
  expect(
    firstDurablePlanCover(
      '/api/meals/11111111-1111-4111-8111-111111111111/image?exp=1&sig=abc',
      [{ imageUrl: '/api/meals/11111111-1111-4111-8111-111111111111/image?exp=1&sig=abc' }],
    ),
  ).toBe(PLAN_COVER_PLACEHOLDER_SRC)
})

test('catalog clone maps rate-limit failures to a Russian retry', () => {
  expect(
    catalogCloneErrorMessage(new ApiRequestError(429, 'RATE_LIMITED', 'Too many authentication requests')),
  ).toBe('Слишком много запросов. Подождите минуту и попробуйте снова.')
  expect(catalogCloneErrorMessage(new Error('disk full'))).toBe('disk full')
  expect(catalogCloneErrorMessage('nope')).toBe('Не удалось добавить план')
})

test('day 8 is stamped a week after day 1', () => {
  const now = new Date(2026, 9, 12)
  const first = rationDayStampDate(0, 8, now)
  const eighth = rationDayStampDate(7, 8, now)
  expect(first?.getDate()).toBe(12)
  expect(eighth?.getDate()).toBe(19)
  expect(eighth?.getTime()).not.toBe(first?.getTime())
})
