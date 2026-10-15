import { describe, expect, test } from 'bun:test'

import { MealsFailure } from '../domain/errors'
import { transcribeOfficeSpeech } from './nora-office'

describe('office speech', () => {
  test('sends the recording to the speech service and returns its text', async () => {
    const original = globalThis.fetch
    let contentType = ''
    let size = 0
    globalThis.fetch = (async (_input: RequestInfo | URL, init?: RequestInit) => {
      contentType = new Headers(init?.headers).get('content-type') ?? ''
      size = init?.body instanceof Uint8Array ? init.body.byteLength : Buffer.from(init?.body as ArrayBuffer).byteLength
      return new Response(JSON.stringify({ text: 'Привет', model: 'gigaam-v3-e2e-rnnt' }), { status: 200 })
    }) as typeof fetch
    try {
      const result = await transcribeOfficeSpeech(
        { LLM_STT_URL: 'http://speech.test' },
        { audioBase64: Buffer.from('wav').toString('base64'), audioMime: 'audio/x-wav' },
      )
      expect(result).toEqual({ ok: true, text: 'Привет', model: 'gigaam-v3-e2e-rnnt' })
    } finally {
      globalThis.fetch = original
    }
    expect(contentType).toBe('audio/wav')
    expect(size).toBe(3)
  })

  test('says when speech is not configured', async () => {
    await expect(transcribeOfficeSpeech({}, { audioBase64: 'YQ==' })).rejects.toBeInstanceOf(MealsFailure)
  })
})
