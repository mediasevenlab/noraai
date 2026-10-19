import { expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'

import {
  isEmptyPlanLibrary,
  putRequestFromSnapshot,
  snapshotFromPlanLibrary,
  toUserPlanLibrary,
} from '../src/platform/account-plan-library'
import {
  isEmptyPlanLibrarySnapshot,
  withAuthoredPlan,
  withoutAuthoredPlan,
  type PlanLibrarySnapshot,
} from '../src/platform/plan-library-local'
import { createAuthoredPlan, authoredPlanCanShareToFeed } from '../src/platform/authored-plans'

const authored = createAuthoredPlan({
  id: 'plan_11111111-1111-4111-8111-111111111111',
  title: 'Офис',
  coverImage: '/catalog/office.jpg',
  goal: 'Похудение',
  sourceCatalogId: 'catalog_office',
})!

test('putRequestFromSnapshot keeps week selection and authored metadata', () => {
  const snapshot: PlanLibrarySnapshot = {
    authoredPlans: [authored],
    savedPlanIds: ['catalog_loss', authored.id],
    selectedPlanIds: [authored.id, 'week:2026-08-31'],
    planStarts: { [authored.id]: '2026-09-01' },
  }
  const request = putRequestFromSnapshot(snapshot, new Date('2026-09-07T12:00:00.000Z'))
  expect(request.authoredPlans[0]).toMatchObject({
    id: authored.id,
    title: 'Офис',
    coverImage: '/catalog/office.jpg',
    sourceCatalogId: 'catalog_office',
  })
  expect(request.selectedPlanIds).toEqual([authored.id, 'week:2026-08-31'])
  expect(request.planStarts).toEqual([{ planId: authored.id, dayKey: '2026-09-01' }])
  expect(isEmptyPlanLibrary({ ...request, updatedAt: null })).toBe(false)
})

test('putRequestFromSnapshot keeps authored empty-day count', () => {
  const counted = { ...authored, dayCount: 4 }
  const request = putRequestFromSnapshot(
    {
      authoredPlans: [counted],
      savedPlanIds: [],
      selectedPlanIds: [],
      planStarts: {},
    },
    new Date('2026-09-07T12:00:00.000Z'),
  )
  expect(request.authoredPlans[0]?.dayCount).toBe(4)
  const library = toUserPlanLibrary({
    ...request,
    authoredPlans: [{ ...request.authoredPlans[0]!, createdAt: authored.createdAt }],
    updatedAt: '2026-09-07T12:00:00.000Z',
  })
  expect(snapshotFromPlanLibrary(library).authoredPlans[0]?.dayCount).toBe(4)
})

test('snapshot helpers add and remove authored plans', () => {
  const empty = {
    authoredPlans: [],
    savedPlanIds: [authored.id],
    selectedPlanIds: [authored.id],
    planStarts: { [authored.id]: '2026-09-01' },
  }
  expect(isEmptyPlanLibrarySnapshot(empty)).toBe(false)
  const added = withAuthoredPlan(empty, authored)
  expect(added.authoredPlans.map((plan) => plan.id)).toEqual([authored.id])
  expect(withoutAuthoredPlan(added, authored.id)).toEqual({
    authoredPlans: [],
    savedPlanIds: [],
    selectedPlanIds: [],
    planStarts: {},
  })
})

test('plan assignment generation survives the library round trip', () => {
  const snapshot: PlanLibrarySnapshot = {
    authoredPlans: [],
    savedPlanIds: [],
    selectedPlanIds: [authored.id],
    planStarts: { [authored.id]: '2026-09-01' },
    planGenerations: { [authored.id]: 2 },
  }
  const request = putRequestFromSnapshot(snapshot, new Date('2026-09-07T12:00:00.000Z'))
  expect(request.planStarts).toEqual([{ planId: authored.id, dayKey: '2026-09-01', generation: 2 }])
  expect(snapshotFromPlanLibrary(toUserPlanLibrary({ ...request, updatedAt: null })).planGenerations).toEqual({
    [authored.id]: 2,
  })
})

test('toUserPlanLibrary drops data-url covers', () => {
  const library = toUserPlanLibrary({
    authoredPlans: [
      {
        ...authored,
        createdAt: '2026-09-01T00:00:00.000Z',
        coverImage: 'data:image/jpeg;base64,aaaa',
      },
    ],
    savedPlanIds: ['catalog_loss'],
    selectedPlanIds: [],
    planStarts: [],
    updatedAt: '2026-09-07T12:00:00.000Z',
  })
  expect(library.authoredPlans[0]?.coverImage).toBe('')
  expect(snapshotFromPlanLibrary(library).savedPlanIds).toEqual(['catalog_loss'])
})

test('plans and diary persist the account plan library', () => {
  const page = readFileSync(new URL('../src/features/plans/pages.tsx', import.meta.url), 'utf8')
  const hook = readFileSync(new URL('../src/features/diary/use-plan-library.ts', import.meta.url), 'utf8')
  const news = readFileSync(new URL('../src/features/diary/pages/news.tsx', import.meta.url), 'utf8')
  const feed = readFileSync(new URL('../src/features/diary/SharedMealsFeed.tsx', import.meta.url), 'utf8')
  expect(page).toContain('useSyncedPlanLibrary(')
  expect(page).toContain('persist(')
  expect(hook).toContain('putUserPlanLibrary(')
  expect(hook).toContain('putRequestFromSnapshot(')
  expect(news).toContain('usePlanLibraryQuery(')
  expect(news).toContain('useSyncedPlanLibrary(')
  expect(news).toContain('withAuthoredPlan(')
  expect(feed).toContain('usePlanLibraryQuery(')
  expect(feed).toContain('useSyncedPlanLibrary(')
  expect(feed).toContain('withAuthoredPlan(')
})

test('cloned catalog or feed plans cannot be published to the feed', () => {
  expect(authoredPlanCanShareToFeed({})).toBe(true)
  expect(authoredPlanCanShareToFeed({ sourceCatalogId: 'catalog_office' })).toBe(false)
  expect(
    authoredPlanCanShareToFeed({ sourceSharedRationId: '019c0000-0000-7000-8000-000000000301' }),
  ).toBe(false)
  expect(
    authoredPlanCanShareToFeed({ sourceMentorPlanId: '019c0000-0000-7000-8000-000000000302' }),
  ).toBe(false)
})
