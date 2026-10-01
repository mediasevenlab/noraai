import { readFileSync } from 'node:fs'
import { describe, expect, test } from 'bun:test'

import {
  AUTH_MENTOR_CREATE_DEMO,
  AUTH_MENTOR_CREATE_MEALS,
  AUTH_MENTOR_CREATE_SCRIPT,
  authMentorCreateAddMealAtMs,
  authMentorCreateCloseAtMs,
  authMentorCreateDraftRation,
  authMentorCreateExistingRation,
  authMentorCreateMealTabAtMs,
  authMentorCreateOpenAtMs,
  authMentorCreatePressAtMs,
  authMentorCreateProgress,
  authMentorCreateSavedAtMs,
  authMentorCreateSavePressAtMs,
  authMentorCreateStepDoneAtMs,
} from './auth-mentor-ration-demo'

describe('auth mentor ration create choreography', () => {
  test('opens the editor, fills breakfast, then reveals lunch and dinner tabs', () => {
    expect(AUTH_MENTOR_CREATE_MEALS.map((meal) => meal.slot)).toEqual([
      'Завтрак',
      'Обед',
      'Ужин',
    ])
    expect(AUTH_MENTOR_CREATE_MEALS.every((meal) => meal.image.includes('/rations/mn-mentor-'))).toBe(
      true,
    )
    expect(AUTH_MENTOR_CREATE_MEALS.every((meal) => meal.steps.length >= 3)).toBe(true)
    expect(AUTH_MENTOR_CREATE_MEALS.every((meal) => meal.ingredients.length >= 3)).toBe(true)
    expect(AUTH_MENTOR_CREATE_MEALS.map((meal) => meal.title).join(' ')).toMatch(
      /кабачк|отбивн|скумбр/i,
    )
    expect(AUTH_MENTOR_CREATE_SCRIPT.description).toMatch(/меню недели/i)
    expect(authMentorCreateExistingRation().title).toBe('Тестовый лёгкий день')
    expect(authMentorCreateDraftRation().title).toBe(AUTH_MENTOR_CREATE_SCRIPT.title)
    expect(authMentorCreateDraftRation().kcal).toBe(1500)
    expect(authMentorCreateDraftRation().meals[0]?.steps).toHaveLength(3)
    expect(authMentorCreateDraftRation().id).not.toBe(authMentorCreateExistingRation().id)
    expect(authMentorCreateDraftRation().meals.map((meal) => meal.slot)).toEqual([
      'Завтрак',
      'Обед',
      'Ужин',
    ])
    expect(authMentorCreatePressAtMs()).toBe(AUTH_MENTOR_CREATE_DEMO.listSettleMs)
    expect(authMentorCreateOpenAtMs()).toBeGreaterThan(authMentorCreatePressAtMs())
    expect(authMentorCreateMealTabAtMs(1)).toBeGreaterThan(authMentorCreateStepDoneAtMs(0))
    expect(authMentorCreateAddMealAtMs(1)).toBeGreaterThan(authMentorCreateAddMealAtMs(0))
    expect(authMentorCreateSavePressAtMs()).toBeGreaterThan(authMentorCreateAddMealAtMs(1))
    expect(authMentorCreateSavedAtMs()).toBeGreaterThan(authMentorCreateSavePressAtMs())
    expect(authMentorCreateCloseAtMs()).toBeGreaterThan(authMentorCreateSavedAtMs())
    expect(authMentorCreateCloseAtMs()).toBeGreaterThan(12_000)
    expect(authMentorCreateCloseAtMs()).toBeLessThan(60_000)
  })

  test('seek progress lands on list, empty editor, then three saved meals', () => {
    expect(authMentorCreateProgress(0)).toMatchObject({
      phase: 'list',
      caption: 'mentorCreate',
      title: '',
      meals: [{ slot: 'Завтрак', title: '' }],
    })
    const opened = authMentorCreateProgress(authMentorCreateOpenAtMs())
    expect(opened.phase).toBe('editor')
    expect(opened.tab).toBe('description')
    expect(opened.meals).toHaveLength(1)
    const lunch = authMentorCreateProgress(authMentorCreateAddMealAtMs(0))
    expect(lunch.tab).toBe(0)
    expect(lunch.meals).toHaveLength(2)
    expect(lunch.meals[0]?.title).toBe(AUTH_MENTOR_CREATE_MEALS[0]!.title)
    expect(lunch.meals[1]?.slot).toBe('Обед')
    expect(lunch.meals[1]?.title).toBe('')
    const dinner = authMentorCreateProgress(authMentorCreateAddMealAtMs(1))
    expect(dinner.tab).toBe(0)
    expect(dinner.meals).toHaveLength(3)
    expect(dinner.meals[2]?.slot).toBe('Ужин')
    expect(dinner.meals[2]?.title).toBe('')
    const saved = authMentorCreateProgress(authMentorCreateSavedAtMs())
    expect(saved.phase).toBe('saved')
    expect(saved.meals.map((meal) => meal.slot)).toEqual(['Завтрак', 'Обед', 'Ужин'])
  })

  test('create sheet is the editor only — list and saved stay on the card', () => {
    const sheet = readFileSync(new URL('./AuthMentorRationCreateSheet.tsx', import.meta.url), 'utf8')
    expect(sheet).not.toContain('RationCard')
    expect(sheet).not.toContain('authMentorCreateExistingRation')
    expect(sheet).toContain('onRevealCreated')
    expect(sheet).toContain('scroller.scrollTo')
    expect(sheet).toContain('data-mentor-create-focus')
    expect(sheet).toContain('Завтрак')
    expect(sheet).toContain('Обед')
    expect(sheet).toContain('Ужин')
  })
})
