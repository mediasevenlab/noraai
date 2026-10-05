import { describe, expect, test } from 'bun:test'

import { formatGenerationPricingCaption } from './generation-pricing-caption'

const prices = {
  model: 'gemini-2.5-flash',
  usdPerMillion: { text: 0.3, image: 0.3, link: 0.3, audio: 1, output: 2.5 },
}

describe('generation pricing caption', () => {
  test('shows the dollar rate and the list price per million tokens', () => {
    expect(formatGenerationPricingCaption({ ...prices, usdRub: 81.2345 })).toBe(
      'Gemini 2.5 Flash · 1 USD = 81,2345 RUB\nТекст 0,30 · фото 0,30 · ссылка 0,30 USD за 1 млн\nАудио 1,00 · ответ 2,50 USD за 1 млн',
    )
    expect(formatGenerationPricingCaption({ ...prices, usdRub: null })).toBe(
      'Gemini 2.5 Flash\nТекст 0,30 · фото 0,30 · ссылка 0,30 USD за 1 млн\nАудио 1,00 · ответ 2,50 USD за 1 млн',
    )
  })
})
