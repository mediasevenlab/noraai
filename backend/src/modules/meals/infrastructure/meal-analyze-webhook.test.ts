import { afterEach, describe, expect, test } from 'bun:test'

import { analyzeMealWithWebhook } from './meal-analyze-webhook'

const originalFetch = globalThis.fetch
const originalWarn = console.warn
const card = {
  ok: true as const,
  model: 'via-n8n',
  meal: {
    title: 'Овсянка',
    excerpt: 'Овсянка',
    body: 'Овсянка',
    category: 'Завтрак',
    mealType: 'Завтрак',
    tags: [],
    nutrition: { kcal: 420, protein: 28, fat: 10, carbs: 55 },
    clientNoteStructured: '',
    composition: [],
    assumptions: [],
    micronutrients: [],
  },
}

afterEach(() => {
  globalThis.fetch = originalFetch
  console.warn = originalWarn
})

describe('analyzeMealWithWebhook', () => {
  test('calls Gemini directly when the user turned reasoning off', async () => {
    let fetched = false
    globalThis.fetch = (async () => {
      fetched = true
      return new Response(JSON.stringify(card), { status: 200 })
    }) as unknown as typeof fetch
    let directThinking: boolean | undefined = true
    const result = await analyzeMealWithWebhook(
      'http://127.0.0.1:5679/webhook/meal-app-analyze',
      async (input) => {
        directThinking = input.thinking
        return { ...card, model: 'direct' }
      },
      { imageBase64: 'abc', imageMime: 'image/jpeg', thinking: false },
    )
    expect(fetched).toBe(false)
    expect(directThinking).toBe(false)
    expect(result.model).toBe('direct')
  })

  test('uses n8n when the webhook succeeds', async () => {
    globalThis.fetch = (async () =>
      new Response(JSON.stringify(card), { status: 200 })) as unknown as typeof fetch

    const result = await analyzeMealWithWebhook(
      'http://127.0.0.1:5679/webhook/meal-app-analyze',
      async () => {
        throw new Error('should not call gemini')
      },
      { imageBase64: 'abc', imageMime: 'image/jpeg' },
    )

    expect(result.model).toBe('via-n8n')
    expect(result.meal.title).toBe('Овсянка')
  })

  test('keeps token usage captured while n8n calls Gemini, even if n8n drops it', async () => {
    const { generationRequestKey, rememberGenerationUsage } = await import('../application/generation-usage-bridge')
    const input = { imageBase64: 'photo-bytes', imageMime: 'image/jpeg' as const, note: 'фасоль' }
    rememberGenerationUsage(generationRequestKey(input), {
      'gemini-2.5-flash': { inputTokens: 800, audioInputTokens: 0, outputTokens: 120 },
    })
    globalThis.fetch = (async () =>
      new Response(JSON.stringify(card), { status: 200 })) as unknown as typeof fetch

    const result = await analyzeMealWithWebhook(
      'http://127.0.0.1:5679/webhook/meal-app-analyze',
      async () => {
        throw new Error('should not call gemini')
      },
      input,
    )

    expect(result.usage?.['gemini-2.5-flash']).toEqual({
      inputTokens: 800,
      audioInputTokens: 0,
      outputTokens: 120,
    })
  })

  test('falls back to Gemini when n8n is down', async () => {
    console.warn = () => undefined
    globalThis.fetch = (async () => {
      throw new Error('n8n down')
    }) as unknown as typeof fetch

    const result = await analyzeMealWithWebhook(
      'http://127.0.0.1:5679/webhook/meal-app-analyze',
      async () => ({ ...card, model: 'gemini' }),
      { imageBase64: 'abc' },
    )
    expect(result.model).toBe('gemini')
    expect(result.fallbackFrom).toBe('n8n')
  })

  test('calls Gemini directly when no webhook is configured', async () => {
    const result = await analyzeMealWithWebhook(
      undefined,
      async () => ({ ...card, model: 'direct' }),
      { imageBase64: 'abc' },
    )
    expect(result.model).toBe('direct')
    expect(result.fallbackFrom).toBeUndefined()
  })

  test('falls back to Gemini when n8n returns an empty stub meal', async () => {
    console.warn = () => undefined
    globalThis.fetch = (async () =>
      new Response(
        JSON.stringify({
          ok: true,
          model: 'via-n8n',
          meal: {
            title: 'Приём пищи',
            excerpt: '',
            body: '',
            category: 'Баланс',
            mealType: 'Перекус',
            tags: [],
            nutrition: { kcal: 0, protein: 0, fat: 0, carbs: 0 },
            clientNoteStructured: '',
            composition: [],
            assumptions: [],
            micronutrients: [],
          },
        }),
        { status: 200 },
      )) as unknown as typeof fetch

    const result = await analyzeMealWithWebhook(
      'http://127.0.0.1:5679/webhook/meal-app-analyze',
      async () => ({ ...card, model: 'gemini' }),
      {
        images: [
          { base64: 'abc', mime: 'image/jpeg' },
          { base64: 'def', mime: 'image/jpeg' },
        ],
        imageBase64: 'abc',
      },
    )
    expect(result.model).toBe('gemini')
    expect(result.meal.title).toBe('Овсянка')
    expect(result.fallbackFrom).toBe('n8n')
  })

  test('warns when falling back because n8n is down', async () => {
    const warnings: string[] = []
    console.warn = ((message: unknown) => {
      warnings.push(String(message))
    }) as typeof console.warn
    globalThis.fetch = (async () => {
      throw new Error('n8n down')
    }) as unknown as typeof fetch

    await analyzeMealWithWebhook(
      'http://127.0.0.1:5679/webhook/meal-app-analyze',
      async () => ({ ...card, model: 'gemini' }),
      { imageBase64: 'abc' },
    )

    expect(warnings.some((line) => line.includes('n8n analyze fallback to Gemini: request failed'))).toBe(true)
  })
})
