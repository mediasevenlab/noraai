import { expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'

import { ApiRequestError } from '../src/platform/api'
import { catalogCloneErrorMessage, mealCreateImageFields } from '../src/features/plans/plan-create'

test('plan create reuses the ration editor and stamps meals on day 1', () => {
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
  expect(create).toContain('rationMealCreateDrafts(')
  expect(create).toContain('rationPlanWeekDays(')
  expect(create).toContain('createMyMeal(')
  expect(create).toContain('mealCreateImageFields(')
  expect(page).not.toContain('CreatePlanDialog')
  expect(editor).toContain("mode?: 'ration' | 'plan'")
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

test('catalog clone maps rate-limit failures to a Russian retry', () => {
  expect(
    catalogCloneErrorMessage(new ApiRequestError(429, 'RATE_LIMITED', 'Too many authentication requests')),
  ).toBe('Слишком много запросов. Подождите минуту и попробуйте снова.')
  expect(catalogCloneErrorMessage(new Error('disk full'))).toBe('disk full')
  expect(catalogCloneErrorMessage('nope')).toBe('Не удалось добавить план')
})
