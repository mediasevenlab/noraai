import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'

import { attachHybridPress, hybridPressTarget, HYBRID_PRESSED_ATTR } from '../src/platform/hybrid-press'

type TestNode = {
  tagName: string
  parentElement: TestNode | null
  attrs: Record<string, string>
  getAttribute(name: string): string | null
  setAttribute(name: string, value: string): void
  removeAttribute(name: string): void
}

function node(tagName: string, attrs: Record<string, string> = {}): TestNode {
  const created: TestNode = {
    tagName,
    parentElement: null,
    attrs: { ...attrs },
    getAttribute(name) {
      return name in this.attrs ? this.attrs[name] : null
    },
    setAttribute(name, value) {
      this.attrs[name] = value
    },
    removeAttribute(name) {
      delete this.attrs[name]
    },
  }
  return created
}

function child(parent: TestNode, item: TestNode) {
  item.parentElement = parent
  return item
}

describe('hybrid press', () => {
  test('boots from the webapp entry', () => {
    expect(readFileSync(new URL('../src/main.tsx', import.meta.url), 'utf8')).toContain(
      'attachHybridPress(document)',
    )
  })

  test('marks icon chips immediately, not delayed :active', () => {
    const chip = node('button', { class: 'nora-press-grow' })
    const title = node('button')
    const composer = node('div', { class: 'composer-press-surface' })
    const send = child(composer, node('button'))
    expect(hybridPressTarget(chip)).toBe(chip)
    expect(hybridPressTarget(title)).toBe(null)
    expect(hybridPressTarget(send)).toBe(send)
  })

  test('sets data-hybrid-pressed on pointerdown immediately', () => {
    const listeners = new Map<string, (event: { target?: TestNode; button?: number }) => void>()
    const root = {
      addEventListener(
        type: string,
        listener: (event: { target?: TestNode; button?: number }) => void,
      ) {
        listeners.set(type, listener)
      },
      removeEventListener(type: string) {
        listeners.delete(type)
      },
    }
    const chip = node('button', { class: 'nora-press-grow' })
    const stop = attachHybridPress(root)
    listeners.get('pointerdown')?.({ target: chip, button: 0 })
    expect(chip.getAttribute(HYBRID_PRESSED_ATTR)).toBe('')
    listeners.get('pointerup')?.({})
    expect(chip.getAttribute(HYBRID_PRESSED_ATTR)).toBe(null)
    stop()
  })
})
