import { expect, test } from 'bun:test'
import { Hono } from 'hono'

import { createAuthSecurity, isAuthWriteBudgetExemptPath, isDocumentComparePath, isFavoritesPath, isKnowledgeUploadPath, isMealWritePath, isMeetingUploadPath, isMentorPlanBodyPath, isModelChatPath, isPlanLibraryPath, mealWriteRateLimitMax } from './security'

test('meal write paths are distinct from account mutations', () => {
  expect(isMealWritePath('/api/users/me')).toBe(false)
  expect(isMealWritePath('/api/admin/users/0196f6f8-6600-7000-8000-000000000001/role')).toBe(false)
  expect(isMealWritePath('/api/mentor/rations')).toBe(false)
  expect(isMealWritePath('/api/users/me/meals')).toBe(true)
  expect(isMealWritePath('/api/users/me/meals/transcribe')).toBe(true)
  expect(isMealWritePath('/api/mentor/users/0196f6f8-6600-7000-8000-000000000001/meals')).toBe(true)
  expect(isMealWritePath('/api/users/me/favorites')).toBe(false)
  expect(isMentorPlanBodyPath('/api/mentor/plans')).toBe(true)
  expect(isMentorPlanBodyPath('/api/mentor/plans/0196f6f8-6600-7000-8000-000000000001')).toBe(true)
  expect(isMentorPlanBodyPath('/api/mentor/users')).toBe(false)
  expect(isModelChatPath('/api/users/me/model-chat')).toBe(true)
  expect(isKnowledgeUploadPath('/api/users/me/knowledge-bases/base/files')).toBe(true)
  expect(isKnowledgeUploadPath('/api/users/me/knowledge-bases')).toBe(false)
  expect(isMeetingUploadPath('/api/users/me/meetings')).toBe(true)
  expect(isMeetingUploadPath('/api/users/me/meetings/0196f6f8-6600-7000-8000-000000000001')).toBe(true)
  expect(isMeetingUploadPath('/api/users/me')).toBe(false)
  expect(isModelChatPath('/api/users/me/meals')).toBe(false)
  expect(isFavoritesPath('/api/users/me/favorites')).toBe(true)
  expect(isFavoritesPath('/api/users/me')).toBe(false)
  expect(isPlanLibraryPath('/api/users/me/plan-library')).toBe(true)
  expect(isPlanLibraryPath('/api/users/me/plans')).toBe(false)
  expect(isAuthWriteBudgetExemptPath('/api/users/me/favorites')).toBe(true)
  expect(isAuthWriteBudgetExemptPath('/api/users/me/plan-library')).toBe(true)
  expect(isAuthWriteBudgetExemptPath('/api/users/me')).toBe(false)
})

function usersApp(options: { rateLimitMax: number; mealRateLimitMax?: number }) {
  const app = new Hono()
  for (const middleware of createAuthSecurity({
    bodyLimitBytes: 1024,
    rateLimitMax: options.rateLimitMax,
    mealRateLimitMax: options.mealRateLimitMax,
    rateLimitWindowSeconds: 60,
    trustProxy: false,
  })) {
    app.use('/api/users/*', middleware)
  }
  app.post('/api/users/me/meals', (c) => c.json({ ok: true }))
  app.patch('/api/users/me', (c) => c.json({ ok: true }))
  app.put('/api/users/me/favorites', (c) => c.json({ ok: true }))
  app.put('/api/users/me/plan-library', (c) => c.json({ ok: true }))
  return app
}

test('favorites writes do not consume the account auth write budget', async () => {
  const app = usersApp({ rateLimitMax: 1 })
  const favorite = () => app.request('/api/users/me/favorites', { method: 'PUT', body: '{}' })
  const library = () => app.request('/api/users/me/plan-library', { method: 'PUT', body: '{}' })
  const account = () => app.request('/api/users/me', { method: 'PATCH', body: '{}' })

  expect((await favorite()).status).toBe(200)
  expect((await favorite()).status).toBe(200)
  expect((await library()).status).toBe(200)
  expect((await account()).status).toBe(200)
  const limited = await account()
  expect(limited.status).toBe(429)
  expect(await limited.json()).toMatchObject({
    error: { message: 'Too many authentication requests' },
  })
})

test('meal writes do not consume the account auth write budget', async () => {
  const app = usersApp({ rateLimitMax: 1 })
  const meal = () => app.request('/api/users/me/meals', { method: 'POST', body: '{}' })
  const account = () => app.request('/api/users/me', { method: 'PATCH', body: '{}' })

  expect((await meal()).status).toBe(200)
  expect((await meal()).status).toBe(200)
  expect((await account()).status).toBe(200)
  const limited = await account()
  expect(limited.status).toBe(429)
  expect(await limited.json()).toMatchObject({
    error: { message: 'Too many authentication requests' },
  })
})

test('mentor plan writes accept a meal-sized photo that account routes reject', async () => {
  const app = new Hono()
  for (const middleware of createAuthSecurity({
    bodyLimitBytes: 32,
    mealBodyLimitBytes: 200,
    rateLimitMax: 10,
    rateLimitWindowSeconds: 60,
    trustProxy: false,
  })) {
    app.use('/api/mentor/*', middleware)
  }
  app.post('/api/mentor/plans', (c) => c.json({ ok: true }))
  app.put('/api/mentor/plans/:planId', (c) => c.json({ ok: true }))
  app.post('/api/mentor/settings', (c) => c.json({ ok: true }))

  const photo = 'x'.repeat(80)
  expect((await app.request('/api/mentor/plans', { method: 'POST', body: photo })).status).toBe(200)
  expect((await app.request('/api/mentor/plans/plan-1', { method: 'PUT', body: photo })).status).toBe(200)
  const limited = await app.request('/api/mentor/settings', { method: 'POST', body: photo })
  expect(limited.status).toBe(413)
  expect(await limited.json()).toMatchObject({
    error: { code: 'PAYLOAD_TOO_LARGE' },
  })
})

test('model chat accepts a photo that account routes reject', async () => {
  const app = new Hono()
  for (const middleware of createAuthSecurity({
    bodyLimitBytes: 32,
    mealBodyLimitBytes: 200,
    rateLimitMax: 10,
    rateLimitWindowSeconds: 60,
    trustProxy: false,
  })) {
    app.use('/api/users/*', middleware)
  }
  app.post('/api/users/me/model-chat', (c) => c.json({ ok: true }))
  app.patch('/api/users/me', (c) => c.json({ ok: true }))

  const photo = 'x'.repeat(80)
  expect((await app.request('/api/users/me/model-chat', { method: 'POST', body: photo })).status).toBe(200)
  const limited = await app.request('/api/users/me', { method: 'PATCH', body: photo })
  expect(limited.status).toBe(413)
  expect(await limited.json()).toMatchObject({
    error: { code: 'PAYLOAD_TOO_LARGE' },
  })
})

test('document compare accepts a workbook pair that the account limit rejects', async () => {
  const app = new Hono()
  for (const middleware of createAuthSecurity({
    bodyLimitBytes: 64,
    documentCompareBodyLimitBytes: 4_000,
    rateLimitMax: 20,
    rateLimitWindowSeconds: 60,
    trustProxy: false,
  })) {
    app.use('/api/users/*', middleware)
  }
  app.post('/api/users/me/document-compare', (c) => c.json({ ok: true }))
  app.patch('/api/users/me', (c) => c.json({ ok: true }))
  const pair = 'x'.repeat(200)
  expect((await app.request('/api/users/me/document-compare', { method: 'POST', body: pair })).status).toBe(200)
  const account = await app.request('/api/users/me', { method: 'PATCH', body: pair })
  expect(account.status).toBe(413)
})

test('meal write burst uses a higher dedicated budget', async () => {
  expect(mealWriteRateLimitMax(1)).toBe(120)
  expect(mealWriteRateLimitMax(40)).toBe(160)
  const app = usersApp({ rateLimitMax: 1, mealRateLimitMax: 2 })
  const meal = () => app.request('/api/users/me/meals', { method: 'POST', body: '{}' })
  expect((await meal()).status).toBe(200)
  expect((await meal()).status).toBe(200)
  const limited = await meal()
  expect(limited.status).toBe(429)
  expect(await limited.json()).toMatchObject({
    error: { message: 'Too many meal requests' },
  })
})
