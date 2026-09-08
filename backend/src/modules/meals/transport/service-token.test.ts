import { describe, expect, test } from 'bun:test'

import { tokensEqual } from './service-token'

describe('service token comparison', () => {
  test('accepts equal tokens and rejects different tokens of any length', () => {
    expect(tokensEqual('secret-token', 'secret-token')).toBe(true)
    expect(tokensEqual('secret-token', 'secret-tokem')).toBe(false)
    expect(tokensEqual('short', 'much-longer-token')).toBe(false)
  })
})
