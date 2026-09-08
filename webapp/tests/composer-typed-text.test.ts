import { expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'

import {
  composerTypedTextPaintsBlur,
  composerTypewriterBlurPx,
  composerTypewriterStartMs,
  composerTypewriterStepMs,
  shouldPlayComposerTypingHaptic,
  splitComposerTypedTail,
} from '../src/features/diary/composer-typed-text'

test('types long assistant copy in about a second', () => {
  expect(composerTypewriterStepMs(0)).toBe(0)
  expect(composerTypewriterStepMs(10)).toBe(22)
  expect(composerTypewriterStepMs(50)).toBe(22)
  expect(composerTypewriterStepMs(200)).toBe(8)
})

test('prints composition faster than chat copy', () => {
  expect(composerTypewriterStepMs(40, 'fast')).toBeLessThan(composerTypewriterStepMs(40))
  expect(composerTypewriterStartMs('fast')).toBeLessThan(composerTypewriterStartMs('chat'))
})

test('blurs the newest letters more than the ones behind them', () => {
  expect(composerTypewriterBlurPx(0)).toBeGreaterThan(composerTypewriterBlurPx(2))
  expect(composerTypewriterBlurPx(2)).toBeGreaterThan(composerTypewriterBlurPx(4))
  expect(composerTypewriterBlurPx(5)).toBe(0)
})

test('keeps a live typing tail for the last few characters', () => {
  expect(splitComposerTypedTail('Привет', true)).toEqual({
    sharp: 'П',
    tail: ['р', 'и', 'в', 'е', 'т'],
  })
  expect(splitComposerTypedTail('Привет', false)).toEqual({
    sharp: 'Привет',
    tail: [],
  })
})

test('hybrid shell skips typewriter blur and haptics at the first printed letter', () => {
  expect(composerTypedTextPaintsBlur({ hasAttribute: () => true })).toBe(false)
  expect(composerTypedTextPaintsBlur({ hasAttribute: () => false })).toBe(true)
  expect(shouldPlayComposerTypingHaptic({ live: true, reducedMotion: false, length: 12 })).toBe(true)
  expect(shouldPlayComposerTypingHaptic({ live: false, reducedMotion: false, length: 12 })).toBe(false)
  expect(shouldPlayComposerTypingHaptic({ live: true, reducedMotion: true, length: 12 })).toBe(false)
  expect(readFileSync(new URL('../src/features/diary/composer-typed-text.tsx', import.meta.url), 'utf8')).toContain(
    "playHybridHaptic('medium')",
  )
  expect(readFileSync(new URL('../src/features/diary/composer-typed-text.tsx', import.meta.url), 'utf8')).toContain(
    'useAuthDemoSeeking',
  )
})
