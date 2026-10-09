import { expect, test } from 'bun:test'

import {
  CATALOG_FAVORITE_SOURCE_MARK,
  FEED_DIARY_SOURCE_MARK,
  RATION_DIARY_DONE_MARK,
  RATION_DIARY_SOURCE_MARK,
} from './meal-share'
import {
  applyMealPlanDoneMark,
  countUnreadMealsByMentee,
  isMentorUnreadMeal,
  isPlannedMealPending,
  mentorUnreadEventAt,
} from './mentor-unread'

const before = new Date('2026-08-26T07:00:00.000Z')
const after = new Date('2026-08-26T09:00:00.000Z')

test('pending planned meals are not unread events', () => {
  expect(isPlannedMealPending([RATION_DIARY_SOURCE_MARK])).toBe(true)
  expect(isPlannedMealPending([FEED_DIARY_SOURCE_MARK])).toBe(true)
  expect(isPlannedMealPending([RATION_DIARY_SOURCE_MARK, RATION_DIARY_DONE_MARK])).toBe(false)
  expect(isPlannedMealPending([])).toBe(false)
  expect(isPlannedMealPending([CATALOG_FAVORITE_SOURCE_MARK])).toBe(false)
  expect(
    mentorUnreadEventAt({
      assumptions: [CATALOG_FAVORITE_SOURCE_MARK],
      createdAt: after,
      updatedAt: after,
    }),
  ).toBeNull()
  expect(
    mentorUnreadEventAt({
      assumptions: [RATION_DIARY_SOURCE_MARK],
      createdAt: after,
      updatedAt: after,
    }),
  ).toBeNull()
})

test('a meal stays unread until that card id has been viewed', () => {
  const uploaded = {
    id: '11111111-1111-4111-8111-111111111111',
    assumptions: [] as string[],
    createdAt: after,
    updatedAt: after,
  }
  expect(isMentorUnreadMeal(uploaded, new Set())).toBe(true)
  expect(isMentorUnreadMeal(uploaded, new Set([uploaded.id]))).toBe(false)
  expect(
    isMentorUnreadMeal(
      {
        id: '22222222-2222-4222-8222-222222222222',
        assumptions: [RATION_DIARY_SOURCE_MARK],
        createdAt: after,
        updatedAt: after,
      },
      new Set(),
    ),
  ).toBe(false)
  expect(
    isMentorUnreadMeal(
      {
        id: '33333333-3333-4333-8333-333333333333',
        assumptions: [RATION_DIARY_SOURCE_MARK, RATION_DIARY_DONE_MARK],
        createdAt: before,
        updatedAt: after,
      },
      new Set(),
    ),
  ).toBe(true)
})

test('plan-done stamp is added or removed without duplicating', () => {
  expect(applyMealPlanDoneMark([RATION_DIARY_SOURCE_MARK], true)).toEqual([
    RATION_DIARY_SOURCE_MARK,
    RATION_DIARY_DONE_MARK,
  ])
  expect(
    applyMealPlanDoneMark([RATION_DIARY_SOURCE_MARK, RATION_DIARY_DONE_MARK], true),
  ).toEqual([RATION_DIARY_SOURCE_MARK, RATION_DIARY_DONE_MARK])
  expect(
    applyMealPlanDoneMark([RATION_DIARY_SOURCE_MARK, RATION_DIARY_DONE_MARK], false),
  ).toEqual([RATION_DIARY_SOURCE_MARK])
})

test('counts unread meals per mentee and skips pending plan cards', () => {
  const menteeA = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
  const menteeB = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'
  const seenUploaded = '11111111-1111-4111-8111-111111111111'
  const counts = countUnreadMealsByMentee(
    [
      {
        id: seenUploaded,
        userId: menteeA,
        assumptions: [],
        createdAt: after,
        updatedAt: after,
      },
      {
        id: '22222222-2222-4222-8222-222222222222',
        userId: menteeA,
        assumptions: [RATION_DIARY_SOURCE_MARK],
        createdAt: after,
        updatedAt: after,
      },
      {
        id: '33333333-3333-4333-8333-333333333333',
        userId: menteeA,
        assumptions: [FEED_DIARY_SOURCE_MARK, RATION_DIARY_DONE_MARK],
        createdAt: before,
        updatedAt: after,
      },
      {
        id: '44444444-4444-4444-8444-444444444444',
        userId: menteeB,
        assumptions: [],
        createdAt: before,
        updatedAt: after,
      },
    ],
    new Set([seenUploaded]),
    [menteeA, menteeB],
  )
  expect(counts).toEqual([
    { userId: menteeA, unreadCount: 1 },
    { userId: menteeB, unreadCount: 1 },
  ])
})

test('a diary completion of a ration meal is not a mentor unread event', () => {
  expect(
    mentorUnreadEventAt({
      assumptions: [RATION_DIARY_SOURCE_MARK, RATION_DIARY_DONE_MARK, 'Выполнение:meal-1'],
      createdAt: after,
      updatedAt: after,
    }),
  ).toBeNull()
  expect(
    isMentorUnreadMeal(
      {
        id: '55555555-5555-4555-8555-555555555555',
        assumptions: [RATION_DIARY_SOURCE_MARK, 'Выполнение:meal-1'],
        createdAt: after,
        updatedAt: after,
      },
      new Set(),
    ),
  ).toBe(false)
})
