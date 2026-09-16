import { expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'

import {
  TOASTER_MOBILE_BOTTOM,
  TOASTER_MOBILE_WIDTH,
  toasterPositionForViewport,
} from '../src/components/ui/toaster-position'

const sonner = readFileSync(
  new URL('../src/components/ui/sonner.tsx', import.meta.url),
  'utf8',
)
const css = readFileSync(new URL('../src/index.css', import.meta.url), 'utf8')

test('mobile viewports pin toasts to the bottom-left so they miss the nav FAB', () => {
  expect(toasterPositionForViewport(375)).toBe('bottom-left')
  expect(toasterPositionForViewport(767)).toBe('bottom-left')
})

test('desktop viewports keep toasts at the bottom-right', () => {
  expect(toasterPositionForViewport(768)).toBe('bottom-right')
  expect(toasterPositionForViewport(1280)).toBe('bottom-right')
})

test('mobile toasts are two-thirds wide and sit on the left', () => {
  expect(sonner).toContain('position === "bottom-left"')
  expect(sonner).toContain('TOASTER_MOBILE_BOTTOM')
  expect(css).toContain(TOASTER_MOBILE_WIDTH)
  expect(css).toContain('left: 0.75rem !important')
})

test('toasts portal to body so a receding modal cannot bury them under the overlay', () => {
  expect(sonner).toContain('createPortal')
  expect(sonner).toContain('document.body')
})

test('mobile toasts sit above the dock instead of covering it', () => {
  const fab = readFileSync(
    new URL('../src/components/dashboard/MobileNavFab.tsx', import.meta.url),
    'utf8',
  )
  expect(fab).toContain('inline-flex size-12')
  expect(fab).toContain(
    'right-4 bottom-[max(1rem,var(--app-safe-bottom,env(safe-area-inset-bottom)))]',
  )
  expect(css).toContain('min-height: 48px')
  expect(css).toContain('height: 48px')
  expect(css).toContain(TOASTER_MOBILE_BOTTOM)
  expect(sonner).toContain('TOASTER_MOBILE_BOTTOM')
})
