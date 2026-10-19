import { expect, test } from 'bun:test'

import { emptyPlanLibrary, normalizePlanLibrary, authoredPlanCanShareToFeed } from './plan-library'

const nowIso = '2026-09-07T12:00:00.000Z'

test('normalizePlanLibrary keeps authored metadata, favorites, selection and start days', () => {
  const authored = {
    id: 'plan_11111111-1111-4111-8111-111111111111',
    title: '  Офис  ',
    description: ' День в офисе ',
    coverImage: '/catalog/office.jpg',
    createdAt: '2026-09-01T00:00:00.000Z',
    goal: 'Похудение',
    sourceCatalogId: 'catalog_office',
    sourceSharedRationId: '019c0000-0000-7000-8000-000000000301',
    sourceMentorPlanId: '019c0000-0000-7000-8000-000000000302',
    dayCount: 4,
  }

  expect(
    normalizePlanLibrary(
      {
        authoredPlans: [authored, authored, { id: 'catalog_loss', title: 'Каталог' }],
        savedPlanIds: ['catalog_loss', ' catalog_loss ', authored.id],
        selectedPlanIds: [authored.id, authored.id],
        planStarts: [
          { planId: authored.id, dayKey: '2026-09-01' },
          { planId: authored.id, dayKey: '2026-09-08' },
          { planId: 'week:2026-08-31', dayKey: 'not-a-day' },
        ],
      },
      nowIso,
    ),
  ).toEqual({
    authoredPlans: [
      {
        id: authored.id,
        title: 'Офис',
        description: 'День в офисе',
        coverImage: '/catalog/office.jpg',
        createdAt: '2026-09-01T00:00:00.000Z',
        goal: 'Похудение',
        sourceCatalogId: 'catalog_office',
        sourceSharedRationId: '019c0000-0000-7000-8000-000000000301',
        sourceMentorPlanId: '019c0000-0000-7000-8000-000000000302',
        dayCount: 4,
      },
    ],
    savedPlanIds: ['catalog_loss', authored.id],
    selectedPlanIds: [authored.id],
    planStarts: [{ planId: authored.id, dayKey: '2026-09-01' }],
  })
})

test('normalizePlanLibrary drops data-url covers and fills missing createdAt', () => {
  expect(
    normalizePlanLibrary(
      {
        authoredPlans: [
          {
            id: 'plan_fixed-office',
            title: 'Офис',
            coverImage: 'data:image/jpeg;base64,aaaa',
            goal: 'unknown',
          },
        ],
        planStarts: { 'plan_fixed-office': '2026-09-02' },
      },
      nowIso,
    ),
  ).toEqual({
    authoredPlans: [
      {
        id: 'plan_fixed-office',
        title: 'Офис',
        description: '',
        coverImage: '',
        createdAt: nowIso,
        goal: null,
      },
    ],
    savedPlanIds: [],
    selectedPlanIds: [],
    planStarts: [{ planId: 'plan_fixed-office', dayKey: '2026-09-02' }],
  })
})

test('normalizePlanLibrary keeps the assignment generation', () => {
  expect(
    normalizePlanLibrary(
      {
        planStarts: [{ planId: 'plan_fixed-office', dayKey: '2026-09-02', generation: 2 }],
      },
      nowIso,
    ).planStarts,
  ).toEqual([{ planId: 'plan_fixed-office', dayKey: '2026-09-02', generation: 2 }])
})

test('emptyPlanLibrary is a blank document', () => {
  expect(emptyPlanLibrary()).toEqual({
    authoredPlans: [],
    savedPlanIds: [],
    selectedPlanIds: [],
    planStarts: [],
  })
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
