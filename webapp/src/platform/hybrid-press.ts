export const HYBRID_PRESSED_ATTR = 'data-hybrid-pressed'

const PRESS_SLOTS = new Set([
  'select-trigger',
  'checkbox',
  'switch',
  'toggle',
  'dropdown-menu-item',
  'select-item',
  'tabs-trigger',
])

type PressNode = {
  tagName?: string
  className?: unknown
  parentElement?: PressNode | null
  getAttribute?: (name: string) => string | null
  setAttribute?: (name: string, value: string) => void
  removeAttribute?: (name: string) => void
}

function attr(node: PressNode, name: string) {
  return node.getAttribute?.(name) ?? null
}

function tagName(node: PressNode) {
  return (node.tagName ?? '').toLowerCase()
}

function hasClass(node: PressNode, className: string) {
  const fromAttr = attr(node, 'class') ?? ''
  if (fromAttr.split(/\s+/).includes(className)) return true
  const value = node.className
  if (typeof value === 'string') return value.split(/\s+/).includes(className)
  return false
}

function asPressNode(target: EventTarget | PressNode | null): PressNode | null {
  if (!target || typeof target !== 'object') return null
  const node = target as PressNode
  if (typeof node.getAttribute === 'function' || typeof node.tagName === 'string') return node
  if (node.parentElement) return node.parentElement
  return null
}

function isChromeButton(node: PressNode) {
  const tag = tagName(node)
  const role = attr(node, 'role')
  if (tag === 'button' || role === 'button') return true
  if (tag === 'summary') return true
  if (tag === 'a' && attr(node, 'href')) return true
  const slot = attr(node, 'data-slot')
  return Boolean(slot && PRESS_SLOTS.has(slot))
}

export function hybridPressTarget(
  target: EventTarget | PressNode | null,
): PressNode | null {
  let node = asPressNode(target)
  while (node) {
    if (hasClass(node, 'nora-press-grow')) return node
    if (isChromeButton(node)) {
      let parent = node.parentElement ?? null
      while (parent) {
        if (hasClass(parent, 'composer-press-surface') || hasClass(parent, 'diary-toolbar-press')) {
          return node
        }
        parent = parent.parentElement ?? null
      }
    }
    node = node.parentElement ?? null
  }
  return null
}

function pointerButton(event: { button?: number }) {
  return typeof event.button === 'number' ? event.button : 0
}

export function attachHybridPress(
  root: {
    addEventListener: (
      type: string,
      listener: (event: { target?: EventTarget | PressNode | null; button?: number }) => void,
      options?: boolean,
    ) => void
    removeEventListener: (
      type: string,
      listener: (event: { target?: EventTarget | PressNode | null; button?: number }) => void,
      options?: boolean,
    ) => void
  } = globalThis.document,
) {
  let pressed: PressNode | null = null
  const clear = () => {
    pressed?.removeAttribute?.(HYBRID_PRESSED_ATTR)
    pressed = null
  }
  const onPointerDown = (event: { target?: EventTarget | PressNode | null; button?: number }) => {
    if (pointerButton(event) !== 0) return
    clear()
    const next = hybridPressTarget(event.target ?? null)
    if (!next?.setAttribute) return
    next.setAttribute(HYBRID_PRESSED_ATTR, '')
    pressed = next
  }
  const onPointerEnd = () => clear()
  root.addEventListener('pointerdown', onPointerDown, true)
  root.addEventListener('pointerup', onPointerEnd, true)
  root.addEventListener('pointercancel', onPointerEnd, true)
  return () => {
    clear()
    root.removeEventListener('pointerdown', onPointerDown, true)
    root.removeEventListener('pointerup', onPointerEnd, true)
    root.removeEventListener('pointercancel', onPointerEnd, true)
  }
}
