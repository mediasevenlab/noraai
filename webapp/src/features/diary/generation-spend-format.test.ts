import { describe, expect, test } from 'bun:test'

import {
  formatGenerationMoney,
  formatGenerationSpend,
  generationSpendVisible,
} from './generation-spend-format'

describe('generation spend badge', () => {
  test('shows tokens and rubles only while the switch is on and spend exists', () => {
    const spend = { tokens: 1240, dollars: 0.05, rubles: 4.2 }
    expect(generationSpendVisible(false, spend)).toBe(false)
    expect(generationSpendVisible(true, { tokens: 0, dollars: 0, rubles: 0 })).toBe(false)
    expect(generationSpendVisible(true, spend)).toBe(true)
    expect(formatGenerationSpend(spend)).toBe('1\u00a0240 · 4,20 RUB')
    expect(formatGenerationSpend(spend, 'usd')).toBe('1\u00a0240 · 0,05 USD')
    expect(formatGenerationSpend({ tokens: 80, dollars: null, rubles: null }, 'usd')).toBe('80 ток.')
    expect(formatGenerationMoney(spend)).toBe('4,20 RUB')
    expect(formatGenerationMoney(spend, 'usd')).toBe('0,05 USD')
    expect(formatGenerationMoney({ tokens: 80, dollars: null, rubles: null })).toBeNull()
  })
})
