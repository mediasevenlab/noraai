import { expect, test } from 'bun:test'

import { emptyPlanLibrary, normalizePlanLibrary } from './plan-library'

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

test('emptyPlanLibrary is a blank document', () => {
  expect(emptyPlanLibrary()).toEqual({
    authoredPlans: [],
    savedPlanIds: [],
    selectedPlanIds: [],
    planStarts: [],
  })
})
