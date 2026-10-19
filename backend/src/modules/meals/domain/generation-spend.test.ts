import { describe, expect, test } from 'bun:test'

import {
  addGenerationUsage,
  applyGenerationCharge,
  ensureModelPrices,
  ensureUsdRub,
  generationAccountToJson,
  generationLedgerTokens,
  generationModelPrices,
  generationSpend,
  generationSpendFromAccount,
  generationUsageToRecord,
  parseCbrUsdRub,
  parseGeminiStandardPrices,
  resetGenerationRateCacheForTests,
  sumSettledGenerationSpend,
  usageLedgerFromGemini,
} from './generation-spend'

describe('generation spend', () => {
  test('sums every call for the meal and keeps the user ledger after the meal is gone', () => {
    const first = usageLedgerFromGemini('gemini-2.5-flash', {
      promptTokenCount: 1000,
      candidatesTokenCount: 200,
      thoughtsTokenCount: 50,
    })
    const second = usageLedgerFromGemini('models/gemini-2.5-flash', {
      promptTokenCount: 400,
      candidatesTokenCount: 80,
    })
    const recorded = generationUsageToRecord({
      call: second,
      pendingAlreadyLedgered: first,
    })
    const meal = recorded.meal
    const ledger = addGenerationUsage(first, recorded.ledger)
    expect(meal['gemini-2.5-flash']).toEqual({
      inputTokens: 1400,
      audioInputTokens: 0,
      outputTokens: 330,
    })
    expect(generationLedgerTokens(ledger)).toBe(generationLedgerTokens(meal))
    const afterDelete = ledger
    expect(generationLedgerTokens(afterDelete)).toBe(1730)
  })

  test('prices flash input, audio, and thinking at the current dollar rate', () => {
    const ledger = usageLedgerFromGemini(
      'gemini-2.5-flash',
      {
        promptTokenCount: 1_000_000,
        candidatesTokenCount: 0,
        thoughtsTokenCount: 1_000_000,
        promptTokensDetails: [
          { modality: 'TEXT', tokenCount: 200_000 },
          { modality: 'AUDIO', tokenCount: 800_000 },
        ],
      },
    )
    const spend = generationSpend(ledger, 100)
    // 0.2M * $0.30 + 0.8M * $1 + 1M * $2.50 = 0.06 + 0.8 + 2.5 = 3.36 USD → 336 RUB
    expect(spend).toEqual({ tokens: 2_000_000, dollars: 3.36, rubles: 336 })
    expect(generationSpend(ledger, null)).toEqual({
      tokens: 2_000_000,
      dollars: 3.36,
      rubles: null,
    })
  })

  test('prices only the visible answer when Gemini reports no thinking tokens', () => {
    const withZero = usageLedgerFromGemini('gemini-2.5-flash', {
      promptTokenCount: 1_000_000,
      candidatesTokenCount: 1_000_000,
      thoughtsTokenCount: 0,
    })
    const withoutField = usageLedgerFromGemini('gemini-2.5-flash', {
      promptTokenCount: 1_000_000,
      candidatesTokenCount: 1_000_000,
    })
    // 1M input * $0.30 + 1M answer * $2.50 = $2.80. Thinking is not added.
    expect(withZero['gemini-2.5-flash']?.outputTokens).toBe(1_000_000)
    expect(withoutField['gemini-2.5-flash']?.outputTokens).toBe(1_000_000)
    expect(generationSpend(withZero, 100)).toEqual({ tokens: 2_000_000, dollars: 2.8, rubles: 280 })
    expect(generationSpend(withoutField, 100)).toEqual({ tokens: 2_000_000, dollars: 2.8, rubles: 280 })
  })

  test('prices flash-lite voice below a flash card', () => {
    const audio = usageLedgerFromGemini(
      'gemini-2.5-flash-lite',
      { promptTokenCount: 1_000_000, candidatesTokenCount: 0, thoughtsTokenCount: 0 },
      { audio: true },
    )
    const answer = usageLedgerFromGemini('gemini-2.5-flash-lite', {
      promptTokenCount: 0,
      candidatesTokenCount: 1_000_000,
      thoughtsTokenCount: 0,
    })
    expect(generationSpend(audio, 100)).toEqual({ tokens: 1_000_000, dollars: 0.3, rubles: 30 })
    expect(generationSpend(answer, 100)).toEqual({ tokens: 1_000_000, dollars: 0.4, rubles: 40 })
    expect(generationModelPrices('gemini-2.5-flash-lite').usdPerMillion).toEqual({
      text: 0.1,
      image: 0.1,
      link: 0.1,
      audio: 0.3,
      output: 0.4,
    })
  })

  test('prices current flash-lite voice at the 3.5 standard tier', () => {
    const audio = usageLedgerFromGemini(
      'gemini-3.5-flash-lite',
      { promptTokenCount: 1_000_000, candidatesTokenCount: 0, thoughtsTokenCount: 0 },
      { audio: true },
    )
    const answer = usageLedgerFromGemini('gemini-3.5-flash-lite', {
      promptTokenCount: 0,
      candidatesTokenCount: 1_000_000,
      thoughtsTokenCount: 0,
    })
    expect(generationSpend(audio, 100)).toEqual({ tokens: 1_000_000, dollars: 0.3, rubles: 30 })
    expect(generationSpend(answer, 100)).toEqual({ tokens: 1_000_000, dollars: 2.5, rubles: 250 })
  })

  test('prices the speech model by the audio minute, not as a chat reply', () => {
    const audio = usageLedgerFromGemini(
      'gemini-3.5-transcribe',
      { promptTokenCount: 1_000_000, candidatesTokenCount: 0, thoughtsTokenCount: 0 },
      { audio: true },
    )
    expect(generationSpend(audio, 100).dollars).toBe(2)
  })

  test('publishes the same flash prices the spend math uses', () => {
    expect(generationModelPrices()).toEqual({
      model: 'gemini-2.5-flash',
      usdPerMillion: { text: 0.3, image: 0.3, link: 0.3, audio: 1, output: 2.5 },
    })
    const millionInput = usageLedgerFromGemini('gemini-2.5-flash', {
      promptTokenCount: 1_000_000,
      candidatesTokenCount: 0,
    })
    expect(generationSpend(millionInput, null).dollars).toBe(0.3)
  })

  test('does not invent a price for an unknown model', () => {
    const ledger = usageLedgerFromGemini('gemini-unknown', {
      promptTokenCount: 10,
      candidatesTokenCount: 5,
    })
    expect(generationSpend(ledger, 90)).toEqual({ tokens: 15, dollars: null, rubles: null })
    expect(generationSpend(ledger, null).dollars).toBeNull()
  })

  test('reads the CBR dollar rate and reuses it', async () => {
    resetGenerationRateCacheForTests()
    const body = '<Valute><CharCode>USD</CharCode><Value>92,5</Value></Valute>'
    let calls = 0
    const fetchImpl = (async () => {
      calls += 1
      return new Response(body, { status: 200 })
    }) as unknown as typeof fetch
    expect(parseCbrUsdRub('<CharCode>USD</CharCode><Value>81,2</Value>')).toBe(81.2)
    expect(parseCbrUsdRub('no rate')).toBeNull()
    expect(await ensureUsdRub({ fetchImpl, now: 1_000 })).toBe(92.5)
    expect(await ensureUsdRub({ fetchImpl, now: 2_000 })).toBe(92.5)
    expect(calls).toBe(1)
    resetGenerationRateCacheForTests()
  })

  test('reads the standard flash price and ignores batch and the next model', () => {
    const markdown = [
      '## Gemini 2.5 Flash',
      '*[`gemini-2.5-flash`](https://example.test)*',
      '### Standard',
      '| Input price | Free of charge | $0.30 (text / image / video) $1.00 (audio) |',
      '| Output price (including thinking tokens) | Free of charge | $2.50 |',
      '### Batch',
      '| Input price | Not available | $0.15 (text / image / video) $0.50 (audio) |',
      '| Output price (including thinking tokens) | Not available | $1.25 |',
      '## Gemini 2.5 Flash-Lite',
      '*[`gemini-2.5-flash-lite`](https://example.test)*',
      '### Standard',
      '| Input price | Free of charge | $0.10 (text / image / video) $0.30 (audio) |',
      '| Output price (including thinking tokens) | Free of charge | $0.40 |',
    ].join('\n')
    expect(parseGeminiStandardPrices(markdown, 'gemini-2.5-flash')).toEqual({
      text: 0.3,
      image: 0.3,
      link: 0.3,
      audio: 1,
      output: 2.5,
    })
    expect(parseGeminiStandardPrices(markdown, 'gemini-2.5-flash-lite')?.text).toBe(0.1)
    expect(parseGeminiStandardPrices(markdown, 'missing')).toBeNull()
  })

  test('keeps an already settled amount and adds only the new call', () => {
    const settled = generationAccountToJson({
      ledger: {
        'gemini-2.5-flash': { inputTokens: 1665, audioInputTokens: 0, outputTokens: 3160 },
      },
      settled: { dollars: 0.0084, rubles: 0.7 },
    })
    const extra = usageLedgerFromGemini('gemini-2.5-flash', {
      promptTokenCount: 1_000_000,
      candidatesTokenCount: 0,
    })
    const next = applyGenerationCharge(settled, extra, 100)
    expect(next.settled).toEqual({ dollars: 0.3084, rubles: 30.7 })
    expect(generationSpendFromAccount(next)).toEqual({
      tokens: 1_000_000 + 1665 + 3160,
      dollars: 0.31,
      rubles: 30.7,
    })
    const repriced = generationSpend(next.ledger, 100)
    expect(repriced.rubles).not.toBe(30.7)
  })

  test('freezes a legacy ledger once, then later calls use the rate of that call', () => {
    const legacy = {
      'gemini-2.5-flash': { inputTokens: 1_000_000, audioInputTokens: 0, outputTokens: 0 },
    }
    const frozen = applyGenerationCharge(legacy, {}, 80)
    expect(frozen.settled).toEqual({ dollars: 0.3, rubles: 24 })
    const extra = usageLedgerFromGemini('gemini-2.5-flash', {
      promptTokenCount: 1_000_000,
      candidatesTokenCount: 0,
    })
    const next = applyGenerationCharge(generationAccountToJson(frozen), extra, 100)
    expect(next.settled).toEqual({ dollars: 0.6, rubles: 54 })
    expect(sumSettledGenerationSpend([generationAccountToJson(next)])).toEqual({
      tokens: 2_000_000,
      dollars: 0.6,
      rubles: 54,
    })
  })

  test('loads the published price once and reuses it', async () => {
    resetGenerationRateCacheForTests()
    const markdown = [
      '## Gemini 2.5 Flash',
      '*[`gemini-2.5-flash`](https://example.test)*',
      '### Standard',
      '| Input price | Free of charge | $0.40 (text / image / video) $1.20 (audio) |',
      '| Output price (including thinking tokens) | Free of charge | $3.00 |',
    ].join('\n')
    let calls = 0
    const fetchImpl = (async () => {
      calls += 1
      return new Response(markdown, { status: 200 })
    }) as unknown as typeof fetch
    expect(await ensureModelPrices('gemini-2.5-flash', { fetchImpl, now: 1_000 })).toEqual({
      text: 0.4,
      image: 0.4,
      link: 0.4,
      audio: 1.2,
      output: 3,
    })
    expect(await ensureModelPrices('gemini-2.5-flash', { fetchImpl, now: 2_000 })).toMatchObject({
      text: 0.4,
    })
    expect(calls).toBe(1)
    expect(generationModelPrices('gemini-2.5-flash').usdPerMillion.text).toBe(0.4)
    const million = usageLedgerFromGemini('gemini-2.5-flash', {
      promptTokenCount: 1_000_000,
      candidatesTokenCount: 0,
    })
    expect(generationSpend(million, null).dollars).toBe(0.4)
    resetGenerationRateCacheForTests()
    expect(generationModelPrices().usdPerMillion.text).toBe(0.3)
  })
})
