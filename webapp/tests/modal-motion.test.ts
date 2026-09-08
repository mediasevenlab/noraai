import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import {
  DEFAULT_MODAL_MOTION,
  MODAL_MOTIONS,
  parseModalMotionId,
} from '../src/components/modal-motion'

const css = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), '../src/styles/modal-motion.css'),
  'utf8',
)

describe('modal motion', () => {
  test('exposes ten named open/close variants', () => {
    expect(MODAL_MOTIONS).toHaveLength(10)
    expect(new Set(MODAL_MOTIONS.map((motion) => motion.id)).size).toBe(10)
  })

  test('keeps a known motion id and falls back otherwise', () => {
    expect(parseModalMotionId('near')).toBe('near')
    expect(parseModalMotionId('modal-motion-near')).toBe(DEFAULT_MODAL_MOTION)
    expect(parseModalMotionId(null)).toBe(DEFAULT_MODAL_MOTION)
    expect(parseModalMotionId('')).toBe(DEFAULT_MODAL_MOTION)
  })

  test('defines a stylesheet for every picker option', () => {
    expect(css).toContain('@keyframes modal-recess-in')
    expect(css).toContain('@keyframes modal-recess-out')
    for (const motion of MODAL_MOTIONS) {
      expect(css).toContain(`html[data-modal-motion='${motion.id}']`)
      expect(css).toContain(`--modal-recess-scale: ${motion.scale}`)
    }
  })

  test('defaults to the iOS recess preset', () => {
    expect(DEFAULT_MODAL_MOTION).toBe('ios')
  })

  test('phone dialogs slide up as iOS sheets while the presenting view recedes', () => {
    expect(css).toContain('[data-slot=\'dialog-content\'][data-modal-frame]')
    expect(css).toContain('[data-slot=\'sheet-content\'][data-side=\'bottom\']')
    expect(css).toContain('@keyframes modal-sheet-in')
    expect(css).toContain('@keyframes modal-sheet-out')
    expect(css).toContain('translateY(110%)')
    expect(css).toContain('cubic-bezier(0.32, 0.72, 0, 1)')
    expect(css).toContain('transform: scale(var(--modal-recess-scale)) translateY(8px)')
    expect(css).toContain('@media (max-width: 767px)')
    expect(css).toContain('--modal-sheet-radius: 28px')
    expect(css).toContain('background: var(--modal-overlay-bg)')
    expect(css).toContain('backdrop-filter: blur(var(--modal-overlay-blur)) saturate(var(--modal-overlay-saturate))')
    expect(css).toContain('background: var(--nora-canvas, var(--background))')
    expect(css).not.toContain('background: #000')
    expect(css).toContain('html[data-android] [data-slot=\'dialog-overlay\']')
    expect(css).toContain('backdrop-filter: none')
    expect(css).not.toContain("[data-slot='dialog-content']::before")
  })
})
