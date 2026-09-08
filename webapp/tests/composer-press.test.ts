import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { composerPressPoint, shouldPressComposerSurface } from '../src/features/diary/composer-press'

const css = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), '../src/styles/composer-press.css'),
  'utf8',
)

describe('composer press', () => {
  test('maps a tap to coordinates inside the field', () => {
    const point = composerPressPoint({ left: 10, top: 20, width: 200, height: 80 }, 50, 60)
    expect(point).toEqual({ x: '40px', y: '40px' })
  })

  test('clamps taps that land outside the field', () => {
    const point = composerPressPoint({ left: 0, top: 0, width: 100, height: 40 }, -8, 90)
    expect(point).toEqual({ x: '0px', y: '40px' })
  })

  test('defines a tap glow that follows --press-x and --press-y', () => {
    expect(css).toContain('.composer-press-surface[data-pressed]')
    expect(css).toContain('scale(1.02)')
    expect(css).toContain('circle at var(--press-x) var(--press-y)')
    expect(css).not.toContain('--nora-tint')
    expect(css).toContain(':is(button, [role="button"]):active')
    expect(css).toContain('.nora-press-grow:active')
    expect(css).toContain('.diary-toolbar-press :is(button, [role="button"])')
    expect(css).toContain('html:is([data-hybrid], [data-android]) .nora-press-grow[data-hybrid-pressed]')
    expect(css).toContain('html:is([data-hybrid], [data-android]) .composer-press-glow')
    expect(css).toContain('display: none')
    expect(css).toContain('opacity: 0.72')
    expect(css).toContain('.composer-press-surface.meal-composer-field[data-focused]')
    expect(css).toContain('[data-demo-pressed]')
    expect(css).not.toContain('nora-attach-pop')
    const chips = readFileSync(
      join(dirname(fileURLToPath(import.meta.url)), '../src/features/diary/composer-ui.tsx'),
      'utf8',
    )
    // Add = reverse of leave: max-width + scale/opacity, no bounce keyframe.
    expect(chips).toContain("chip.leaving || chip.entering ? 'overflow-hidden mr-0 max-w-0'")
    expect(chips).toContain("? 'scale-50 opacity-0'")
    expect(chips).toContain(": 'scale-100 opacity-100'")
    expect(chips).not.toContain('composer-attach-chip-pop')
  })

  test('presses the field, not the chrome buttons', () => {
    expect(shouldPressComposerSurface({ closest: () => null } as EventTarget)).toBe(true)
    expect(shouldPressComposerSurface({ closest: () => ({}) } as EventTarget)).toBe(false)
    expect(
      shouldPressComposerSurface({
        parentElement: { closest: () => ({}) },
      } as EventTarget),
    ).toBe(false)
  })
})
