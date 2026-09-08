import { describe, expect, test } from 'bun:test'

import {
  mealComposerSendClass,
  mealComposerSendTone,
} from '../src/features/diary/meal-sheet'

describe('meal composer send button', () => {
  test('stays idle until there is text or a photo, then ready, then sending', () => {
    expect(mealComposerSendTone({ sending: false, hasDraft: false })).toBe('idle')
    expect(mealComposerSendTone({ sending: false, hasDraft: true })).toBe('ready')
    expect(mealComposerSendTone({ sending: true, hasDraft: true })).toBe('sending')
    expect(mealComposerSendTone({ sending: true, hasDraft: false })).toBe('sending')
  })

  test('idle is muted, ready is dark, sending keeps the spinner chrome', () => {
    expect(mealComposerSendClass('idle')).toContain('bg-[var(--nora-text)]/58')
    expect(mealComposerSendClass('idle')).toContain('disabled:opacity-100')
    expect(mealComposerSendClass('ready')).toContain('bg-[var(--nora-text)] text-[var(--nora-panel)]')
    expect(mealComposerSendClass('ready')).not.toContain('/58')
    expect(mealComposerSendClass('sending')).toContain('cursor-wait')
  })
})
