import { expect, test } from 'bun:test'
import type { SharedRation } from '@web-app-demo/contracts'

import {
  appendFeedMealToMentorPlan,
  authoredCloneOfSharedRation,
  canAddSharedRationToMine,
  createAuthoredPlanFromSharedRation,
  matchingMentorPlanByTitle,
  mentorPlanRequestFromSharedRation,
  mentorWeekdayIndex,
  sharedRationAddLabel,
  sharedRationMealCreateDrafts,
} from '../src/features/diary/feed-ration-clone'

const rationId = '019c0000-0000-7000-8000-000000000301'

function ration(overrides: Partial<SharedRation> = {}): SharedRation {
  return {
    id: rationId,
    sourcePlanId: 'plan_source',
    title: 'Офис',
    description: '',
    goal: 'Похудение',
    coverImage: '/cover.jpg',
    days: 2,
    kcal: 900,
    protein: 60,
    fat: 20,
    carbs: 80,
    meals: [
      {
        dayIndex: 0,
        slot: 'Обед',
        title: 'Курица',
        ingredients: 'курица',
        image: '',
        kcal: 420,
        protein: 35,
        fat: 12,
        carbs: 40,
      },
      {
        dayIndex: 1,
        slot: 'Завтрак',
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
    ...overrides,
  }
}

test('own or already copied feed rations cannot be added to mine', () => {
  expect(canAddSharedRationToMine(ration({ own: true }), [])).toBe(false)
  expect(sharedRationAddLabel(ration({ own: true }), [])).toBe('Это ваш рацион')
  const cloned = createAuthoredPlanFromSharedRation(ration())
  expect(cloned?.sourceSharedRationId).toBe(rationId)
  expect(authoredCloneOfSharedRation(cloned ? [cloned] : [], rationId)?.id).toBe(cloned?.id)
  expect(canAddSharedRationToMine(ration(), cloned ? [cloned] : [])).toBe(false)
  expect(sharedRationAddLabel(ration(), cloned ? [cloned] : [])).toBe('Уже в «Мои»')
  expect(canAddSharedRationToMine(ration(), [])).toBe(true)
  expect(sharedRationAddLabel(ration(), [])).toBe('В мои')
})

test('a shared ration becomes a mentor plan, and a meal lands on the chosen day', () => {
  const body = mentorPlanRequestFromSharedRation(ration())
  expect(body?.title).toBe('Офис')
  expect(body?.goal).toBe('Похудение')
  expect(body?.meals).toHaveLength(2)
  expect(body?.meals[0]?.dayIndex).toBe(0)
  expect(mentorPlanRequestFromSharedRation(ration({ goal: null, meals: [] }))).toBeNull()
  expect(matchingMentorPlanByTitle('Офис', [{ title: 'Офис' }])?.title).toBe('Офис')
  expect(mentorWeekdayIndex(new Date('2026-09-16T12:00:00'))).toBe(2)

  const added = appendFeedMealToMentorPlan(
    {
      title: 'Свой',
      description: '',
      goal: 'Набор',
      image: '',
      meals: [
        {
          slot: 'Обед',
          title: 'Курица',
          ingredients: '',
          steps: [],
          image: '',
          kcal: 1,
          protein: 1,
          fat: 1,
          carbs: 1,
          dayIndex: 0,
        },
      ],
    },
    {
      title: 'Курица',
      ingredients: '',
      meal: 'Обед',
      kcal: 1,
      protein: 1,
      fat: 1,
      carbs: 1,
    },
    0,
  )
  expect(added.ok).toBe(false)
  if (!added.ok) expect(added.reason).toBe('duplicate')
})

test('feed ration copy stamps meals onto authored plan days', () => {
  const drafts = sharedRationMealCreateDrafts(ration(), 'plan_copy', new Date('2026-09-16T12:00:00'))
  expect(drafts).toHaveLength(2)
  expect(drafts[0]?.meal).toBe('Обед')
  expect(drafts[1]?.meal).toBe('Завтрак')
  expect(drafts[0]?.assumptions).toContain('План:plan_copy')
  expect(new Date(drafts[0]!.recordedAt).getDay()).toBe(1)
  expect(new Date(drafts[1]!.recordedAt).getDay()).toBe(2)
})
