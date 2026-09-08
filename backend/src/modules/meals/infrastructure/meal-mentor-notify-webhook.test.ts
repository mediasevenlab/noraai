import { afterEach, describe, expect, test } from 'bun:test'

import { notifyMentorMealViaWebhook } from './meal-mentor-notify-webhook'

const originalFetch = globalThis.fetch
const payload = {
  chatId: '99',
  menteeLabel: 'Аня',
  menteePublicId: 104,
  title: 'Овсянка',
  mealSlot: 'Завтрак',
  kcal: 320,
  protein: 12,
  fat: 8,
  carbs: 48,
  ingredients: 'овсянка',
  source: 'manual' as const,
  text: '🍽 Новый приём',
}

afterEach(() => {
  globalThis.fetch = originalFetch
})

describe('notifyMentorMealViaWebhook', () => {
  test('posts the structured payload to n8n', async () => {
    let body = ''
    globalThis.fetch = (async (_url: string | URL | Request, init?: RequestInit) => {
      body = String(init?.body ?? '')
      return new Response(JSON.stringify({ ok: true }), { status: 200 })
    }) as unknown as typeof fetch

    await notifyMentorMealViaWebhook('http://127.0.0.1:5679/webhook/mentor-meal-notify', payload)
    expect(JSON.parse(body)).toMatchObject({
      chatId: '99',
      title: 'Овсянка',
      text: '🍽 Новый приём',
    })
  })

  test('no-ops when the webhook is not configured', async () => {
    let called = false
    globalThis.fetch = (async () => {
      called = true
      return new Response('ok', { status: 200 })
    }) as unknown as typeof fetch

    await notifyMentorMealViaWebhook(undefined, payload)
    expect(called).toBe(false)
  })

  test('throws when n8n is down so the service can swallow without failing the meal', async () => {
    globalThis.fetch = (async () => {
      throw new Error('n8n down')
    }) as unknown as typeof fetch

    await expect(
      notifyMentorMealViaWebhook('http://127.0.0.1:5679/webhook/mentor-meal-notify', payload),
    ).rejects.toThrow('n8n down')
  })
})
