import { describe, expect, test } from 'bun:test'

import {
  MEAL_ASSUMPTION_RULES,
  MEAL_COMPOSITION_LINE_RULES,
  MEAL_MULTI_PHOTO_RULES,
  MEAL_REFINE_PHOTO_RULES,
  isTransientGeminiNetworkError,
  parseGeminiCandidateText,
} from './gemini-client'
import { MealsFailure } from '../domain/errors'

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
