import { readFileSync } from 'node:fs'

import { describe, expect, test } from 'bun:test'

import { AUTH_DEMO_CAPTIONS } from '@/features/diary'

import {
  AUTH_DEMO_DIARY_FEATURE_IDS,
  AUTH_DEMO_FEATURE_MOCK_IMAGE,
  AUTH_DEMO_MARQUEE,
  AUTH_DEMO_MARQUEE_CAPTION,
  AUTH_DEMO_MARQUEE_CAPTIONS,
  authDemoDiaryFeatureCards,
  authDemoMarqueeDoneAtMs,
  authDemoMarqueeFocusAtMs,
  authDemoMarqueeIsFeatureGrid,
  authDemoMarqueeLeaveAtMs,
  authDemoMarqueePressAtMs,
  authDemoMarqueePressEndAtMs,
  authDemoMarqueeRowDirection,
  authDemoMarqueeRows,
} from './auth-demo-feature-marquee'

describe('auth demo feature marquee', () => {
  test('login diary intro is a product mock plus five glass feature rows', () => {
    expect(authDemoMarqueeIsFeatureGrid('diary')).toBe(true)
    expect(authDemoMarqueeIsFeatureGrid('share')).toBe(false)
    expect(authDemoMarqueeIsFeatureGrid('ration')).toBe(false)
    expect(AUTH_DEMO_FEATURE_MOCK_IMAGE).toBe('/diary/auth-demo/auth-demo-01.card.webp')
    const cards = authDemoDiaryFeatureCards()
    expect(cards.map((item) => item.id)).toEqual([...AUTH_DEMO_DIARY_FEATURE_IDS])
    expect(cards).toHaveLength(6)
    expect(cards.filter((item) => item.featured)).toEqual([
      expect.objectContaining({
        id: 'diary',
        title: AUTH_DEMO_CAPTIONS.diary.title,
      }),
    ])
    expect(cards.filter((item) => !item.featured).map((item) => item.id)).toEqual([
      'photos',
      'analyze',
      'ready',
      'share',
      'ration',
    ])
  })

  test('keeps three drifting rows for the other marquees', () => {
    const rows = authDemoMarqueeRows('share')
    expect(rows).toHaveLength(3)
    expect(authDemoMarqueeRowDirection(0)).toBe('left')
    expect(authDemoMarqueeRowDirection(1)).toBe('right')
    expect(authDemoMarqueeRowDirection(2)).toBe('left')
    expect(AUTH_DEMO_MARQUEE.rowDurationsSec[0]).not.toBe(AUTH_DEMO_MARQUEE.rowDurationsSec[1])
    for (const row of rows) {
      expect(row.length).toBeGreaterThanOrEqual(6)
    }
  })

  test('puts the feed plate last in the middle row for the share bridge', () => {
    const [, middle] = authDemoMarqueeRows('share')
    const featured = middle.find((item) => item.featured)
    expect(featured?.id).toBe('share')
    expect(featured?.title).toBe('Лента')
    expect(middle.map((item) => item.id).at(-1)).toBe('share')
    expect(middle.map((item) => item.id)).toContain('diary')
    expect(AUTH_DEMO_MARQUEE_CAPTIONS.share.title).toMatch(/лент/i)
    expect(AUTH_DEMO_MARQUEE_CAPTIONS.diary).toEqual(AUTH_DEMO_MARQUEE_CAPTION)
  })

  test('features ration, plan, and mentor plates for signup marquees', () => {
    for (const feature of ['ration', 'planMeal', 'mentorCreate'] as const) {
      const [, middle] = authDemoMarqueeRows(feature)
      const featured = middle.find((item) => item.featured)
      expect(featured?.id).toBe(feature)
      expect(middle.map((item) => item.id).at(-1)).toBe(feature)
      expect(authDemoMarqueeRows(feature).flat().filter((item) => item.featured)).toHaveLength(1)
      expect(AUTH_DEMO_MARQUEE_CAPTIONS[feature].title.length).toBeGreaterThan(4)
      expect(AUTH_DEMO_MARQUEE_CAPTIONS[feature].body.length).toBeGreaterThan(40)
    }
    expect(AUTH_DEMO_MARQUEE_CAPTIONS.ration.title).toMatch(/рацион/i)
    expect(AUTH_DEMO_MARQUEE_CAPTIONS.planMeal.title).toMatch(/план/i)
    expect(AUTH_DEMO_MARQUEE_CAPTIONS.mentorCreate.title).toMatch(/наставник/i)
  })

  test('watches the rows, then presses the diary plate, then hands off', () => {
    expect(authDemoMarqueeFocusAtMs()).toBe(4800)
    expect(authDemoMarqueePressAtMs()).toBe(4800 + 280)
    expect(authDemoMarqueePressEndAtMs()).toBe(4800 + 280 + AUTH_DEMO_MARQUEE.pressMs)
    expect(authDemoMarqueeLeaveAtMs()).toBe(
      4800 + 280 + AUTH_DEMO_MARQUEE.pressMs + AUTH_DEMO_MARQUEE.afterPressMs,
    )
    expect(authDemoMarqueeDoneAtMs()).toBe(
      authDemoMarqueeLeaveAtMs() + AUTH_DEMO_MARQUEE.fadeMs,
    )
    expect(AUTH_DEMO_MARQUEE.afterPressMs).toBeGreaterThan(150)
    expect(AUTH_DEMO_MARQUEE.afterDiaryHoldMs).toBeGreaterThan(600)
    expect(AUTH_DEMO_MARQUEE.enterMs).toBeGreaterThan(AUTH_DEMO_MARQUEE.fadeMs - 1)
    expect(AUTH_DEMO_MARQUEE.captionEnterDelayMs).toBeGreaterThan(200)
    expect(AUTH_DEMO_MARQUEE.captionEnterDelayMs).toBeLessThan(AUTH_DEMO_MARQUEE.enterMs)
  })

  test('plays the rows on the login clock, then presses the diary plate', () => {
    const source = readFileSync(
      new URL('./components/AuthDemoFeatureMarquee.tsx', import.meta.url),
      'utf8',
    )
    expect(AUTH_DEMO_MARQUEE_CAPTION.title).toMatch(/функциональн/i)
    expect(AUTH_DEMO_MARQUEE_CAPTION.body.length).toBeGreaterThan(40)
    expect(source).toContain('data-auth-demo-marquee')
    expect(source).toContain('data-auth-demo-marquee-caption')
    expect(source).toContain('data-auth-demo-feature-grid')
    expect(source).toContain('data-auth-demo-feature-tone')
    expect(source).toContain('data-auth-demo-feature-mock')
    expect(source).toContain('authDemoMarqueeIsFeatureGrid')
    expect(source).toContain('authDemoDiaryFeatureCards')
    expect(source).toContain('AUTH_DEMO_FEATURE_MOCK_IMAGE')
    expect(source).toContain('backdrop-blur-xl')
    expect(source).not.toContain('col-span-2 row-span-2')
    expect(source).not.toContain('#161617')
    expect(source).not.toContain('#f7f8fc')
    expect(source).not.toContain('#2563eb')
    expect(source).toContain('isFeatureGrid ?')
    expect(source).toContain('data-auth-demo-marquee-feature')
    expect(source).toContain('data-auth-demo-marquee-kind')
    expect(source).toContain('AUTH_DEMO_MARQUEE_CAPTIONS')
    expect(source).toContain("clock === 'wall'")
    expect(source).toContain('authDemoTimeout')
    expect(source).toContain('auth-demo-marquee-left')
    expect(source).toContain('auth-demo-marquee-right')
    expect(source).toContain("animationPlayState: paused ? 'paused' : 'running'")
    expect(source).toContain('scale-[0.96]')
    expect(source).not.toContain('nora-press-grow')
    expect(source).toContain('setPressed(false)')
    expect(source).toContain('setLeaving(true)')
    expect(source).toContain('handoffRef.current()')
    expect(source).toContain('bg-[var(--nora-panel)]')
    expect(source).toContain('card.featured')
    expect(source).toContain('color-mix(in_srgb,var(--nora-panel)_42%,var(--nora-canvas))')
    expect(source).not.toContain('LayoutGridIcon')
    expect(source).not.toContain('radial-gradient')
    expect(source).not.toContain('linear-gradient(')
    const shell = readFileSync(
      new URL('./components/AuthPageShell.tsx', import.meta.url),
      'utf8',
    )
    expect(shell).toContain('AuthMealCarousel')
    expect(shell).toContain('AuthDemoStage')
    expect(shell).not.toContain('AuthDemoFeatureMarquee')
    expect(shell).not.toContain('bridgeFeature')
    expect(shell).not.toContain('introFeature')
    expect(shell).not.toContain("phase === 'bridge'")
    expect(shell).not.toContain('onDiarySegmentComplete')
    expect(shell).not.toContain('onRationSegmentComplete')
    expect(source).toContain('blur-[3px]')
    expect(source).toContain('overflow-hidden py-5')
    expect(source).toContain('gap-20')
    expect(source).toContain('max-w-[54rem]')
    expect(source).toContain('rowOffsetsSec')
    expect(source).toContain('setCaptionShown(true)')
    expect(source).not.toContain('AUTH_DEMO_MARQUEE_CAPTION_INSET')
    expect(source).not.toContain('marginLeft:')
    expect(source).toContain('duration-[340ms]')
    expect(source).toContain('min-h-[4.5rem]')
    expect(source).toContain("compact ? 'w-[16.5rem]' : 'w-[18rem]'")
    expect(source).toContain('CARD_ACCENTS')
    expect(source).toContain('--auth-demo-marquee-accent')
    expect(source).toContain('will-change-transform')
    expect(source).toContain('var(--nora-border)')
    expect(source).not.toContain('scheme-marketing')
    expect(source).not.toContain('w-[18rem] shrink-0 items-center gap-3 rounded-full')
    expect(source).not.toContain('bg-[#141414]')
    const css = readFileSync(new URL('../../index.css', import.meta.url), 'utf8')
    expect(css).toContain('.auth-demo-marquee-mask')
    expect(css).toContain('.auth-demo-feature-mock')
    expect(css).toContain('.auth-demo-diary-enter')
    expect(css).toContain('.auth-demo-bridge-enter')
    expect(css).toContain('#000 20%')
    expect(css).toContain('#000 80%')
    expect(css).not.toContain('#000 4%')
  })
})
