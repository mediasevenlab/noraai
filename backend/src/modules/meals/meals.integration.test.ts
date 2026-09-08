import { afterAll, beforeEach, describe, expect, test } from 'bun:test'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'

import { createApp } from '../../app'
import { createPrisma } from '../../db'
import { testAppEnv } from '../../test-app-env'

const databaseUrl = process.env.TEST_DATABASE_URL
const maybeDescribe = databaseUrl ? describe : describe.skip
const serviceToken = 'test-internal-service-token-meals'

maybeDescribe('meals API integration', () => {
  if (!databaseUrl) return

  const uploadDir = mkdtempSync(path.join(tmpdir(), 'meals-upload-'))
  const env = testAppEnv({
    DATABASE_URL: databaseUrl,
    JWT_SECRET: '12345678901234567890123456789012',
    INTERNAL_SERVICE_TOKEN: serviceToken,
    MEALS_UPLOAD_DIR: uploadDir,
  })
  const prisma = createPrisma(databaseUrl)
  const app = createApp({ env, prisma })

  beforeEach(async () => {
    await prisma.meal.deleteMany()
    await prisma.mentorMenteeMealCursor.deleteMany()
    await prisma.mentorAssignment.deleteMany()
    await prisma.authSession.deleteMany()
    await prisma.user.deleteMany()
  })

  afterAll(async () => {
    await prisma.$disconnect()
  })

  test('service token create + list me + mentor list; rejects unknown telegram and cross mentor', async () => {
    const user = await register('meals-user@example.com', 'User')
    const otherUser = await register('meals-other-user@example.com', 'Other user')
    const mentor = await register('meals-mentor@example.com', 'Mentor', 'mentor')
    const strangerMentor = await register(
      'meals-stranger@example.com',
      'Stranger',
      'mentor',
    )

    await prisma.user.update({
      where: { id: user.user.id },
      data: { telegramUsername: 'mediaseven' },
    })
    await prisma.mentorAssignment.create({
      data: {
        menteeId: user.user.id,
        mentorId: mentor.user.id,
      },
    })

    const lookupMissing = await app.request('/api/internal/users/by-telegram/nobodyhere', {
      headers: serviceHeaders(),
    })
    expect(lookupMissing.status).toBe(200)
    expect(await lookupMissing.json()).toEqual({ user: null })

    const lookup = await app.request('/api/internal/users/by-telegram/mediaseven', {
      headers: serviceHeaders(),
    })
    expect(lookup.status).toBe(200)
    const lookupBody = await lookup.json()
    expect(lookupBody.user.id).toBe(user.user.id)

    const transcribeUnauthorized = await app.request('/api/users/me/meals/transcribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ audioBase64: 'abc', audioMime: 'audio/webm' }),
    })
    expect(transcribeUnauthorized.status).toBe(401)

    const transcribeMissingAudio = await app.request('/api/users/me/meals/transcribe', {
      method: 'POST',
      headers: {
        ...bearer(user.accessToken),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}),
    })
    expect(transcribeMissingAudio.status).toBe(400)

    const composerOpen = await app.request('/api/users/me/meals/composer', {
      method: 'POST',
      headers: {
        ...bearer(user.accessToken),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ action: 'open' }),
    })
    expect(composerOpen.status).toBe(200)
    const composerBody = await composerOpen.json()
    expect(composerBody.status).toBe('idle')
    expect(composerBody.messages[0]?.text).toContain('Пришлите фото вашего приёма пищи')
    expect(composerBody.messages[0]?.text).not.toContain('/cancel')

    const tinyPngBase64 =
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='
    const composerPhoto = await app.request('/api/users/me/meals/composer', {
      method: 'POST',
      headers: {
        ...bearer(user.accessToken),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'photo',
        imageBase64: tinyPngBase64,
        imageMime: 'image/png',
      }),
    })
    expect(composerPhoto.status).toBe(200)
    expect((await composerPhoto.json()).photoCount).toBe(1)

    const composerRemoveMissing = await app.request('/api/users/me/meals/composer', {
      method: 'POST',
      headers: {
        ...bearer(user.accessToken),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ action: 'remove-photo' }),
    })
    expect(composerRemoveMissing.status).toBe(400)

    const composerRemove = await app.request('/api/users/me/meals/composer', {
      method: 'POST',
      headers: {
        ...bearer(user.accessToken),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ action: 'remove-photo', photoIndex: 0 }),
    })
    expect(composerRemove.status).toBe(200)
    const composerRemovedBody = await composerRemove.json()
    expect(composerRemovedBody.photoCount).toBe(0)
    expect(composerRemovedBody.messages.at(-1)?.text).toContain('Фото удалено')

    const create = await app.request('/api/internal/meals', {
      method: 'POST',
      headers: {
        ...serviceHeaders(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId: user.user.id,
        title: 'Рис с курицей',
        ingredients: 'Рис, курица',
        category: 'Птица',
        meal: 'Обед',
        kcal: 520,
        protein: 35,
        fat: 14,
        carbs: 55,
        portionItems: [
          { label: 'Рис ~150 г', kcal: 160, protein: 3, fat: 1, carbs: 35 },
          { label: 'Курица ~120 г', kcal: 200, protein: 28, fat: 8, carbs: 0 },
        ],
        clientComment: 'Обед в офисе',
        assumptions: ['Вес по фото'],
        micronutrients: [{ key: 'sodium', amount: 410 }, { key: 'vitaminC', amount: 12 }],
        source: 'telegram',
        telegramUpdateId: '1001',
        imageBase64: tinyPngBase64,
        imageMime: 'image/png',
      }),
    })
    expect(create.status).toBe(200)
    const createdBody = await create.json()
    expect(createdBody.created).toBe(true)
    expect(createdBody.meal.title).toBe('Рис с курицей')
    expect(createdBody.meal.micronutrients).toHaveLength(18)
    expect(createdBody.meal.micronutrients[0]).toMatchObject({
      key: 'sodium',
      label: 'Натрий',
      unit: 'мг',
      amount: 410,
    })

    const createAgain = await app.request('/api/internal/meals', {
      method: 'POST',
      headers: {
        ...serviceHeaders(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId: user.user.id,
        title: 'Рис с курицей',
        ingredients: 'Рис, курица',
        category: 'Птица',
        meal: 'Обед',
        kcal: 520,
        protein: 35,
        fat: 14,
        carbs: 55,
        telegramUpdateId: '1001',
      }),
    })
    expect(createAgain.status).toBe(200)
    const againBody = await createAgain.json()
    expect(againBody.created).toBe(false)
    expect(againBody.meal.id).toBe(createdBody.meal.id)

    const foreignTelegramCollision = await app.request('/api/internal/meals', {
      method: 'POST',
      headers: {
        ...serviceHeaders(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId: otherUser.user.id,
        title: 'Другой пользователь',
        ingredients: '',
        category: 'Завтрак',
        meal: 'Завтрак',
        kcal: 1,
        protein: 0,
        fat: 0,
        carbs: 0,
        telegramUpdateId: '1001',
      }),
    })
    expect(foreignTelegramCollision.status).toBe(409)
    expect(await prisma.meal.count({ where: { telegramUpdateId: '1001' } })).toBe(1)

    const sharedClientKeyMeal = {
      title: 'Общий ключ',
      ingredients: 'Тест',
      category: 'Завтрак',
      meal: 'Завтрак',
      kcal: 250,
      protein: 15,
      fat: 7,
      carbs: 30,
      clientKey: 'same-key-for-two-users',
    }
    const firstClientCreate = await app.request('/api/users/me/meals', {
      method: 'POST',
      headers: {
        ...bearer(user.accessToken),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(sharedClientKeyMeal),
    })
    const secondClientCreate = await app.request('/api/users/me/meals', {
      method: 'POST',
      headers: {
        ...bearer(otherUser.accessToken),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(sharedClientKeyMeal),
    })
    expect(firstClientCreate.status).toBe(200)
    expect(secondClientCreate.status).toBe(200)
    const firstClientBody = await firstClientCreate.json()
    const secondClientBody = await secondClientCreate.json()
    expect(firstClientBody).toMatchObject({
      created: true,
      meal: { userId: user.user.id },
    })
    expect(secondClientBody).toMatchObject({
      created: true,
      meal: { userId: otherUser.user.id },
    })
    expect(secondClientBody.meal.id).not.toBe(firstClientBody.meal.id)

    const firstClientRetry = await app.request('/api/users/me/meals', {
      method: 'POST',
      headers: {
        ...bearer(user.accessToken),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(sharedClientKeyMeal),
    })
    const secondClientRetry = await app.request('/api/users/me/meals', {
      method: 'POST',
      headers: {
        ...bearer(otherUser.accessToken),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(sharedClientKeyMeal),
    })
    expect(await firstClientRetry.json()).toMatchObject({
      created: false,
      meal: { id: firstClientBody.meal.id, userId: user.user.id },
    })
    expect(await secondClientRetry.json()).toMatchObject({
      created: false,
      meal: { id: secondClientBody.meal.id, userId: otherUser.user.id },
    })

    const myMeals = await app.request('/api/users/me/meals', {
      headers: bearer(user.accessToken),
    })
    expect(myMeals.status).toBe(200)
    const myBody = await myMeals.json()
    expect(myBody.items).toHaveLength(2)
    expect(myBody.items.some((meal: { id: string }) => meal.id === createdBody.meal.id)).toBe(true)

    const mentorList = await app.request(`/api/mentor/users/${user.user.id}/meals`, {
      headers: bearer(mentor.accessToken),
    })
    expect(mentorList.status).toBe(200)
    expect((await mentorList.json()).items).toHaveLength(2)

    const strangerList = await app.request(`/api/mentor/users/${user.user.id}/meals`, {
      headers: bearer(strangerMentor.accessToken),
    })
    expect(strangerList.status).toBe(403)

    const image = await app.request(createdBody.meal.imageUrl)
    expect(image.status).toBe(200)
    expect(image.headers.get('content-type')).toContain('image/')
  })

  test('owner can publish a meal into the shared feed and hide it again', async () => {
    const user = await register('meals-share-user@example.com', 'Иван Лента')
    const other = await register('meals-share-other@example.com', 'Other')
    const created = await app.request('/api/users/me/meals', {
      method: 'POST',
      headers: {
        ...bearer(user.accessToken),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title: 'Общий обед',
        ingredients: 'Рис',
        category: 'Птица',
        meal: 'Обед',
        kcal: 400,
        protein: 30,
        fat: 10,
        carbs: 40,
      }),
    })
    expect(created.status).toBe(200)
    const createdBody = await created.json()
    expect(createdBody.meal.shared).toBe(false)

    const unauthorized = await app.request('/api/meals/shared')
    expect(unauthorized.status).toBe(401)

    const emptyFeed = await app.request('/api/meals/shared', {
      headers: bearer(other.accessToken),
    })
    expect(emptyFeed.status).toBe(200)
    expect((await emptyFeed.json()).items).toEqual([])

    const foreignShare = await app.request(
      `/api/users/me/meals/${createdBody.meal.id}/share`,
      {
        method: 'PATCH',
        headers: {
          ...bearer(other.accessToken),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ shared: true }),
      },
    )
    expect(foreignShare.status).toBe(403)

    const published = await app.request(
      `/api/users/me/meals/${createdBody.meal.id}/share`,
      {
        method: 'PATCH',
        headers: {
          ...bearer(user.accessToken),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ shared: true }),
      },
    )
    expect(published.status).toBe(200)
    const publishedBody = await published.json()
    expect(publishedBody.meal.shared).toBe(true)

    const feed = await app.request('/api/meals/shared', {
      headers: bearer(other.accessToken),
    })
    expect(feed.status).toBe(200)
    const feedBody = await feed.json()
    expect(feedBody.items).toHaveLength(1)
    expect(feedBody.items[0]).toMatchObject({
      id: createdBody.meal.id,
      shared: true,
      authorName: 'Иван Лента',
      likeCount: 0,
      liked: false,
    })

    const liked = await app.request(`/api/meals/${createdBody.meal.id}/like`, {
      method: 'PATCH',
      headers: {
        ...bearer(other.accessToken),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ liked: true }),
    })
    expect(liked.status).toBe(200)
    expect((await liked.json()).meal).toMatchObject({ liked: true, likeCount: 1 })

    const likedFeed = await app.request('/api/meals/shared', {
      headers: bearer(other.accessToken),
    })
    expect((await likedFeed.json()).items[0]).toMatchObject({ liked: true, likeCount: 1 })

    const unliked = await app.request(`/api/meals/${createdBody.meal.id}/like`, {
      method: 'PATCH',
      headers: {
        ...bearer(other.accessToken),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ liked: false }),
    })
    expect(unliked.status).toBe(200)
    expect((await unliked.json()).meal.liked).toBe(false)

    const hidden = await app.request(
      `/api/users/me/meals/${createdBody.meal.id}/share`,
      {
        method: 'PATCH',
        headers: {
          ...bearer(user.accessToken),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ shared: false }),
      },
    )
    expect(hidden.status).toBe(200)
    expect((await hidden.json()).meal.shared).toBe(false)
    const afterHide = await app.request('/api/meals/shared', {
      headers: bearer(other.accessToken),
    })
    expect((await afterHide.json()).items).toEqual([])
  })

  test('mentor unread counts uploaded and completed plan meals, then clears after view', async () => {
    const user = await register('unread-user@example.com', 'User')
    const mentor = await register('unread-mentor@example.com', 'Mentor', 'mentor')
    const stranger = await register('unread-stranger@example.com', 'Stranger', 'mentor')
    await prisma.mentorAssignment.create({
      data: { menteeId: user.user.id, mentorId: mentor.user.id },
    })

    const mealBody = {
      title: 'Овсянка',
      ingredients: 'Овсянка',
      category: 'Завтрак',
      meal: 'Завтрак',
      kcal: 300,
      protein: 20,
      fat: 8,
      carbs: 40,
    }
    const uploaded = await app.request('/api/users/me/meals', {
      method: 'POST',
      headers: { ...bearer(user.accessToken), 'Content-Type': 'application/json' },
      body: JSON.stringify(mealBody),
    })
    expect(uploaded.status).toBe(200)
    const uploadedBody = await uploaded.json()

    const planned = await app.request('/api/users/me/meals', {
      method: 'POST',
      headers: { ...bearer(user.accessToken), 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...mealBody,
        title: 'План: гречка',
        clientKey: 'plan-unread-1',
        assumptions: ['Добавлено из рациона'],
      }),
    })
    expect(planned.status).toBe(200)
    const plannedBody = await planned.json()

    const afterUpload = await app.request('/api/mentor/unread-meals', {
      headers: bearer(mentor.accessToken),
    })
    expect(await afterUpload.json()).toEqual({
      items: [{ userId: user.user.id, unreadCount: 1 }],
    })

    const listedUnread = await app.request(`/api/mentor/users/${user.user.id}/meals`, {
      headers: bearer(mentor.accessToken),
    })
    const listedUnreadBody = await listedUnread.json()
    expect(listedUnreadBody.items.find((meal: { id: string }) => meal.id === uploadedBody.meal.id).unread).toBe(
      true,
    )
    expect(listedUnreadBody.items.find((meal: { id: string }) => meal.id === plannedBody.meal.id).unread).toBe(
      false,
    )

    const viewedPending = await app.request(
      `/api/mentor/users/${user.user.id}/meals-viewed`,
      {
        method: 'POST',
        headers: { ...bearer(mentor.accessToken), 'Content-Type': 'application/json' },
        body: JSON.stringify({ mealIds: [plannedBody.meal.id] }),
      },
    )
    expect(viewedPending.status).toBe(200)
    expect(await viewedPending.json()).toEqual({
      ok: true,
      viewedMealIds: [],
      unreadCount: 1,
    })

    const viewedUploaded = await app.request(
      `/api/mentor/users/${user.user.id}/meals-viewed`,
      {
        method: 'POST',
        headers: { ...bearer(mentor.accessToken), 'Content-Type': 'application/json' },
        body: JSON.stringify({ mealIds: [uploadedBody.meal.id] }),
      },
    )
    expect(viewedUploaded.status).toBe(200)
    expect(await viewedUploaded.json()).toEqual({
      ok: true,
      viewedMealIds: [uploadedBody.meal.id],
      unreadCount: 0,
    })

    const listedViewed = await app.request(`/api/mentor/users/${user.user.id}/meals`, {
      headers: bearer(mentor.accessToken),
    })
    expect(
      (await listedViewed.json()).items.find((meal: { id: string }) => meal.id === uploadedBody.meal.id)
        .unread,
    ).toBe(false)

    const done = await app.request(
      `/api/users/me/meals/${plannedBody.meal.id}/plan-done`,
      {
        method: 'PATCH',
        headers: { ...bearer(user.accessToken), 'Content-Type': 'application/json' },
        body: JSON.stringify({ done: true }),
      },
    )
    expect(done.status).toBe(200)
    expect((await done.json()).meal.assumptions).toContain('Выполнено по плану')

    const afterDone = await app.request('/api/mentor/unread-meals', {
      headers: bearer(mentor.accessToken),
    })
    expect(await afterDone.json()).toEqual({
      items: [{ userId: user.user.id, unreadCount: 1 }],
    })

    const strangerUnread = await app.request('/api/mentor/unread-meals', {
      headers: bearer(stranger.accessToken),
    })
    expect(await strangerUnread.json()).toEqual({ items: [] })

    const viewedDenied = await app.request(
      `/api/mentor/users/${user.user.id}/meals-viewed`,
      {
        method: 'POST',
        headers: { ...bearer(stranger.accessToken), 'Content-Type': 'application/json' },
        body: JSON.stringify({ mealIds: [plannedBody.meal.id] }),
      },
    )
    expect(viewedDenied.status).toBe(403)

    const viewedPlan = await app.request(
      `/api/mentor/users/${user.user.id}/meals-viewed`,
      {
        method: 'POST',
        headers: { ...bearer(mentor.accessToken), 'Content-Type': 'application/json' },
        body: JSON.stringify({ mealIds: [plannedBody.meal.id] }),
      },
    )
    expect(viewedPlan.status).toBe(200)
    expect(await viewedPlan.json()).toEqual({
      ok: true,
      viewedMealIds: [plannedBody.meal.id],
      unreadCount: 0,
    })

    const afterView = await app.request('/api/mentor/unread-meals', {
      headers: bearer(mentor.accessToken),
    })
    expect(await afterView.json()).toEqual({
      items: [{ userId: user.user.id, unreadCount: 0 }],
    })
  })

  async function register(
    email: string,
    displayName: string,
    role: 'user' | 'mentor' = 'user',
  ) {
    const response = await app.request('/api/auth/token/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        password: 'password123',
        displayName,
        role,
      }),
    })
    expect(response.status).toBe(201)
    return response.json() as Promise<{
      accessToken: string
      user: { id: string }
    }>
  }

  function serviceHeaders() {
    return { Authorization: `Bearer ${serviceToken}` }
  }

  function bearer(accessToken: string) {
    return { Authorization: `Bearer ${accessToken}` }
  }
})
