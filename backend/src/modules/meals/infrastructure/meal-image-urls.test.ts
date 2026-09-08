import { describe, expect, test } from 'bun:test'

import { createMealImageUrlBuilder, verifyMealImageSignature, verifyMealExtraImageSignature } from './meal-image-urls'

describe('meal image signed urls', () => {
  test('reuses the same url within a ttl bucket so refetches do not bust the browser cache', () => {
    const ttlSeconds = 3600
    let now = Date.parse('2026-08-18T10:15:00.000Z')
    const builder = createMealImageUrlBuilder('secret', ttlSeconds, () => now)
    const first = builder.build('meal-1')

    now += 12_000
    const second = builder.build('meal-1')

    expect(second).toBe(first)
    expect(first).toContain('/api/meals/meal-1/image?exp=')
  })

  test('issues a new url after the ttl bucket rolls over', () => {
    const ttlSeconds = 3600
    let now = Date.parse('2026-08-18T10:59:50.000Z')
    const builder = createMealImageUrlBuilder('secret', ttlSeconds, () => now)
    const first = builder.build('meal-1')

    now += 20_000
    const second = builder.build('meal-1')

    expect(second).not.toBe(first)
  })

  test('signs urls that the image route can verify', () => {
    const builder = createMealImageUrlBuilder('secret')
    const url = new URL(builder.build('meal-1'), 'https://app.example')
    expect(
      verifyMealImageSignature(
        'meal-1',
        url.searchParams.get('exp') ?? undefined,
        url.searchParams.get('sig') ?? undefined,
        'secret',
      ),
    ).toBe(true)
    expect(
      verifyMealImageSignature(
        'meal-1',
        url.searchParams.get('exp') ?? undefined,
        url.searchParams.get('sig') ?? undefined,
        'other-secret',
      ),
    ).toBe(false)
  })

  test('signs extra image urls separately from the cover', () => {
    const builder = createMealImageUrlBuilder('secret')
    const url = new URL(builder.buildExtra('meal-1', 0), 'https://app.example')
    expect(url.pathname).toBe('/api/meals/meal-1/extras/0')
    expect(
      verifyMealExtraImageSignature(
        'meal-1',
        0,
        url.searchParams.get('exp') ?? undefined,
        url.searchParams.get('sig') ?? undefined,
        'secret',
      ),
    ).toBe(true)
    expect(
      verifyMealExtraImageSignature(
        'meal-1',
        1,
        url.searchParams.get('exp') ?? undefined,
        url.searchParams.get('sig') ?? undefined,
        'secret',
      ),
    ).toBe(false)
  })
})
