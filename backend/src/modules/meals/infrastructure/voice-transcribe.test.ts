import { afterEach, describe, expect, test } from 'bun:test'

import { transcribeMealVoice } from './voice-transcribe'

const originalFetch = globalThis.fetch
const originalWarn = console.warn

afterEach(() => {
  globalThis.fetch = originalFetch
  console.warn = originalWarn
})

describe('transcribeMealVoice', () => {
  test('uses n8n text when the webhook succeeds', async () => {
    globalThis.fetch = (async () =>
      new Response(
        JSON.stringify({ ok: true, text: 'Это обед', model: 'via-n8n' }),
        { status: 200 },
      )) as unknown as typeof fetch

    const result = await transcribeMealVoice(
      { N8N_TRANSCRIBE_WEBHOOK_URL: 'http://127.0.0.1:5679/webhook/meal-voice-transcribe' },
      async () => {
        throw new Error('should not call gemini')
      },
      { audioBase64: 'abc', audioMime: 'audio/webm' },
    )

    expect(result).toEqual({ ok: true, text: 'Это обед', model: 'via-n8n' })
  })

  test('falls back to Gemini when n8n is down', async () => {
    console.warn = () => undefined
    globalThis.fetch = (async () => {
      throw new Error('n8n down')
    }) as unknown as typeof fetch

    const result = await transcribeMealVoice(
      { N8N_TRANSCRIBE_WEBHOOK_URL: 'http://127.0.0.1:5679/webhook/meal-voice-transcribe' },
      async () => ({ ok: true, text: 'fallback', model: 'gemini' }),
      { audioBase64: 'abc' },
    )

    expect(result.text).toBe('fallback')
    expect(result.fallbackFrom).toBe('n8n')
  })

  test('calls Gemini directly when no webhook is configured', async () => {
    const result = await transcribeMealVoice(
      {},
      async () => ({ ok: true, text: 'direct', model: 'gemini' }),
      { audioBase64: 'abc' },
    )
    expect(result.text).toBe('direct')
    expect(result.fallbackFrom).toBeUndefined()
  })
})
