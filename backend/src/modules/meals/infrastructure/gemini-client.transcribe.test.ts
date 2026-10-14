import { describe, expect, test } from 'bun:test'

import {
  GEMINI_VOICE_MODEL,
  geminiGenerationConfig,
  MEAL_ASSUMPTION_RULES,
  MEAL_COMPOSITION_LINE_RULES,
  MEAL_MULTI_PHOTO_RULES,
  MEAL_REFINE_PHOTO_RULES,
  MEAL_REPLACE_PHOTO_RULES,
  isTransientGeminiNetworkError,
  parseGeminiCandidateText,
  refineSystemPrompt,
  transcribeAudioWithGemini,
} from './gemini-client'
import { MealsFailure } from '../domain/errors'

describe('gemini thinking budget', () => {
  test('leaves Flash thinking on unless the user turned it off', () => {
    expect(geminiGenerationConfig({ temperature: 0.2, json: true })).toEqual({
      temperature: 0.2,
      responseMimeType: 'application/json',
    })
    expect(geminiGenerationConfig({ temperature: 0.2, json: true, thinking: true })).not.toHaveProperty(
      'thinkingConfig',
    )
  })

  test('sets a zero thinking budget when reasoning is off', () => {
    expect(geminiGenerationConfig({ temperature: 0, thinking: false })).toEqual({
      temperature: 0,
      thinkingConfig: { thinkingBudget: 0 },
    })
  })
})

describe('voice transcription model', () => {
  test('hears speech on Flash-Lite and does not draft, even if reasoning is on', async () => {
    const original = globalThis.fetch
    let url = ''
    let body = ''
    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      url = String(input)
      body = String(init?.body ?? '')
      return new Response(
        JSON.stringify({
          candidates: [{ content: { parts: [{ text: 'гречка 150 грамм' }] } }],
          usageMetadata: {
            promptTokenCount: 400,
            candidatesTokenCount: 12,
            thoughtsTokenCount: 0,
            promptTokensDetails: [{ modality: 'AUDIO', tokenCount: 320 }],
          },
        }),
        { status: 200 },
      )
    }) as typeof fetch
    try {
      const result = await transcribeAudioWithGemini(
        {
          GEMINI_API_KEY: 'test-key',
          GEMINI_MODEL: 'gemini-2.5-flash',
          GEMINI_MEAL_MODEL: 'gemini-2.5-flash',
          GEMINI_API_HOST: 'generativelanguage.googleapis.com',
          GEMINI_API_PORT: 443,
        },
        {
          audioBase64: Buffer.from('hello').toString('base64'),
          audioMime: 'audio/webm',
          thinking: true,
        },
      )
      expect(url).toContain(`/models/${GEMINI_VOICE_MODEL}:generateContent`)
      expect(JSON.parse(body).generationConfig.thinkingConfig).toEqual({ thinkingBudget: 0 })
      expect(result.model).toBe(GEMINI_VOICE_MODEL)
      expect(result.text).toBe('гречка 150 грамм')
      expect(result.usage?.[GEMINI_VOICE_MODEL]?.audioInputTokens).toBe(320)
      expect(result.usage?.[GEMINI_VOICE_MODEL]?.outputTokens).toBe(12)
    } finally {
      globalThis.fetch = original
    }
  })
})

describe('parseGeminiCandidateText', () => {
  test('joins candidate parts and strips wrapping quotes', () => {
    expect(
      parseGeminiCandidateText(
        JSON.stringify({
          candidates: [
            { content: { parts: [{ text: '«Добавь брокколи»' }] } },
          ],
        }),
      ),
    ).toBe('Добавь брокколи')
  })

  test('rejects a non-JSON envelope', () => {
    expect(() => parseGeminiCandidateText('not-json')).toThrow(MealsFailure)
  })
})

describe('meal multi-photo prompt', () => {
  test('tells the model to read every dish photo, not only a product-plus-label album', () => {
    const rules = MEAL_MULTI_PHOTO_RULES.join('\n')
    expect(rules).toContain('разные блюда')
    expect(rules).toContain('ВСЕ кадры')
    expect(rules).toContain('не «лишние этикетки»')
  })
})

describe('meal composition prompt', () => {
  test('asks the model to list each visible food on its own line', () => {
    const rules = MEAL_COMPOSITION_LINE_RULES.join('\n')
    expect(rules).toContain('каждый отдельный продукт своей строкой')
    expect(rules).toContain('Не склеивай разные продукты')
    expect(rules).toContain('Запеченная белая рыба с морковью')
  })
})

describe('meal refine photo prompt', () => {
  test('tells the model to add the extra photo to the current plate instead of rewriting it', () => {
    const rules = MEAL_REFINE_PHOTO_RULES.join('\n')
    expect(rules).toContain('ДОПОЛНЯЕТ текущую карточку')
    expect(rules).toContain('не заменяет')
    expect(rules).toContain('Существующие позиции сохрани')
    expect(rules).toContain('Не переписывай состав только по новому кадру')
    expect(refineSystemPrompt('augment')).toContain('ДОПОЛНЯЕТ текущую карточку')
  })

  test('tells the model to replace the card when the new photos are the meal', () => {
    const rules = MEAL_REPLACE_PHOTO_RULES.join('\n')
    expect(rules).toContain('ЗАМЕНЯЮТ текущую карточку')
    expect(rules).toContain('Старый состав не сохраняй')
    const prompt = refineSystemPrompt('replace')
    expect(prompt).toContain('ЗАМЕНЯЮТ текущую карточку')
    expect(prompt).not.toContain('ДОПОЛНЯЕТ текущую карточку')
    expect(prompt).toContain('по новому составу')
  })
})

describe('meal assumption prompt', () => {
  test('asks the model to keep assumptions short and not restate added foods', () => {
    const rules = MEAL_ASSUMPTION_RULES.join('\n')
    expect(rules).toContain('коротких')
    expect(rules).toContain('Не пиши, что продукт «добавлен к приёму»')
    expect(rules).toContain('Не повторяй названия и веса из composition')
  })
})

describe('transient Gemini network errors', () => {
  test('retries when the proxy drops the socket', () => {
    expect(isTransientGeminiNetworkError({ code: 'ECONNRESET', message: 'closed' })).toBe(true)
    expect(
      isTransientGeminiNetworkError(new Error('The socket connection was closed unexpectedly.')),
    ).toBe(true)
    expect(isTransientGeminiNetworkError(new Error('Gemini 400: bad request'))).toBe(false)
  })
})
