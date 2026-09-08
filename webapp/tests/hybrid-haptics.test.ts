import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'

import {
  attachHybridHaptics,
  hybridHapticKindForTarget,
  playHybridHaptic,
} from '../src/platform/hybrid-haptics'

type TestNode = {
  tagName: string
  disabled?: boolean
  type?: string
  parentElement: TestNode | null
  attrs: Record<string, string>
  getAttribute(name: string): string | null
}

function node(
  tagName: string,
  attrs: Record<string, string> = {},
  extra: Partial<Pick<TestNode, 'disabled' | 'type'>> = {},
): TestNode {
  const created: TestNode = {
    tagName,
    parentElement: null,
    attrs,
    ...extra,
    getAttribute(name) {
      return name in this.attrs ? this.attrs[name] : null
    },
  }
  return created
}

function child(parent: TestNode, item: TestNode) {
  item.parentElement = parent
  return item
}

describe('hybrid haptics', () => {
  test('attaches once from the webapp boot', () => {
    expect(readFileSync(new URL('../src/main.tsx', import.meta.url), 'utf8')).toContain(
      'attachHybridHaptics(document)',
    )
  })

  test('browser runtime stays silent', async () => {
    expect(await playHybridHaptic('light', {})).toEqual({ kind: 'skipped' })
    expect(
      await playHybridHaptic('light', { Capacitor: { isNativePlatform: () => false } }),
    ).toEqual({ kind: 'skipped' })
  })

  test('classifies buttons as light and cards as medium', () => {
    const button = node('button')
    const link = node('a', { href: '/app/diary' })
    const card = node('article', { 'data-slot': 'meal-card' })
    const title = child(card, node('h2'))
    const saveOnCard = node('article', { 'data-slot': 'meal-card' })
    const save = child(saveOnCard, node('button', { 'aria-label': 'В избранное' }))
    const openOnCard = node('article', { 'data-slot': 'meal-card' })
    const openCover = child(
      openOnCard,
      node('div', { role: 'button', 'data-haptic': 'card', 'aria-label': 'Открыть приём' }),
    )
    const disabled = node('button', {}, { disabled: true })
    const field = node('textarea', { 'data-meal-composer': '' })
    const body = node('div')

    expect(hybridHapticKindForTarget(button)).toBe('light')
    expect(hybridHapticKindForTarget(link)).toBe('light')
    expect(hybridHapticKindForTarget(card)).toBe('medium')
    expect(hybridHapticKindForTarget(title)).toBe('medium')
    expect(hybridHapticKindForTarget(save)).toBe('light')
    expect(hybridHapticKindForTarget(openCover)).toBe('medium')
    expect(hybridHapticKindForTarget(disabled)).toBe(null)
    expect(hybridHapticKindForTarget(field)).toBe('light')
    expect(hybridHapticKindForTarget(body)).toBe(null)
  })

  test('plays Capacitor impact and falls back to vibrate', async () => {
    const impacts: string[] = []
    const runtime = {
      Capacitor: {
        isNativePlatform: () => true,
        Plugins: {
          Haptics: {
            impact: async (options: { style: string }) => {
              impacts.push(options.style)
            },
          },
        },
      },
    }

    expect(await playHybridHaptic('light', runtime)).toEqual({
      kind: 'impact',
      style: 'LIGHT',
    })
    expect(await playHybridHaptic('medium', runtime)).toEqual({
      kind: 'impact',
      style: 'MEDIUM',
    })
    expect(impacts).toEqual(['LIGHT', 'MEDIUM'])

    const cheap: string[] = []
    const both = {
      Capacitor: {
        isNativePlatform: () => true,
        Plugins: {
          Haptics: {
            impact: async (options: { style: string }) => {
              cheap.push(options.style)
            },
          },
        },
      },
      navigator: {
        vibrate: (pattern: number) => {
          cheap.push(`v${pattern}`)
          return true
        },
      },
    }
    expect(await playHybridHaptic('light', both)).toEqual({ kind: 'vibrate', duration: 10 })
    expect(await playHybridHaptic('medium', both)).toEqual({ kind: 'impact', style: 'MEDIUM' })
    expect(cheap).toEqual(['v10', 'MEDIUM'])

    const vibrateMs: number[] = []
    const fallback = {
      Capacitor: { isNativePlatform: () => true },
      navigator: {
        vibrate: (pattern: number) => {
          vibrateMs.push(pattern)
          return true
        },
      },
    }

    expect(await playHybridHaptic('light', fallback)).toEqual({
      kind: 'vibrate',
      duration: 10,
    })
    expect(await playHybridHaptic('medium', fallback)).toEqual({
      kind: 'vibrate',
      duration: 16,
    })
    expect(vibrateMs).toEqual([10, 16])
  })

  test('document listener fires once per press on native', async () => {
    const impacts: string[] = []
    const runtime = {
      Capacitor: {
        isNativePlatform: () => true,
        Plugins: {
          Haptics: {
            impact: async (options: { style: string }) => {
              impacts.push(options.style)
            },
          },
        },
      },
    }
    const listeners = new Map<string, (event: { target: TestNode; button?: number }) => void>()
    const root = {
      addEventListener(
        type: string,
        listener: (event: { target: TestNode; button?: number }) => void,
      ) {
        listeners.set(type, listener)
      },
      removeEventListener(type: string) {
        listeners.delete(type)
      },
    }
    const button = node('button')
    const card = node('article', { 'data-slot': 'meal-card' })
    const stop = attachHybridHaptics(root, runtime)
    listeners.get('pointerdown')?.({ target: button })
    listeners.get('pointerdown')?.({ target: button })
    await Promise.resolve()
    expect(impacts).toEqual(['LIGHT'])
    await Bun.sleep(50)
    listeners.get('pointerdown')?.({ target: card })
    listeners.get('click')?.({ target: card })
    await Promise.resolve()
    expect(impacts).toEqual(['LIGHT', 'MEDIUM'])
    stop()
  })
})
