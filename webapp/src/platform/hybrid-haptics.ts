import { getHybridPlugin, isHybridNativeRuntime, type HybridRuntime } from './hybrid-notifications'

export type HybridHapticKind = 'light' | 'medium'

export type HybridHapticsPlugin = {
  impact: (options: { style: 'LIGHT' | 'MEDIUM' | 'HEAVY' }) => Promise<void>
}

export type HybridHapticsRuntime = HybridRuntime & {
  Capacitor?: HybridRuntime['Capacitor'] & {
    Plugins?: NonNullable<HybridRuntime['Capacitor']>['Plugins'] & {
      Haptics?: HybridHapticsPlugin
    }
  }
  navigator?: {
    vibrate?: (pattern: number | number[]) => boolean
  }
}

export type HybridHapticResult =
  | { kind: 'skipped' }
  | { kind: 'unavailable' }
  | { kind: 'impact'; style: 'LIGHT' | 'MEDIUM' }
  | { kind: 'vibrate'; duration: number }

const CONTROL_ROLES = new Set([
  'button',
  'menuitem',
  'tab',
  'switch',
  'checkbox',
  'radio',
  'option',
])
const CONTROL_SLOTS = new Set([
  'select-trigger',
  'checkbox',
  'switch',
  'toggle',
  'dropdown-menu-item',
  'select-item',
  'tabs-trigger',
])
const CONTROL_INPUT_TYPES = new Set([
  'button',
  'submit',
  'reset',
  'checkbox',
  'radio',
  'image',
])
const SKIP_FIELD_INPUT_TYPES = new Set(['hidden', 'file', 'range', 'color', 'button', 'submit', 'reset', 'image'])
const FIELD_ROLES = new Set(['textbox', 'searchbox', 'combobox'])
const FIELD_SLOTS = new Set(['input', 'textarea'])
const HAPTIC_THROTTLE_MS = 40

type HapticNode = {
  tagName?: string
  disabled?: boolean
  type?: string
  parentElement?: HapticNode | null
  getAttribute?: (name: string) => string | null
}

function attr(node: HapticNode, name: string) {
  return node.getAttribute?.(name) ?? null
}

function tagName(node: HapticNode) {
  return (node.tagName ?? '').toLowerCase()
}

function isBlocked(node: HapticNode) {
  if (node.disabled === true) return true
  if (attr(node, 'aria-disabled') === 'true') return true
  if (attr(node, 'data-disabled') !== null && attr(node, 'data-disabled') !== 'false') {
    return true
  }
  return false
}

function isHapticControl(node: HapticNode) {
  const tag = tagName(node)
  if (tag === 'button' || tag === 'select' || tag === 'summary') return true
  if (tag === 'a' && attr(node, 'href')) return true
  if (tag === 'label' && attr(node, 'for')) return true
  if (tag === 'input') {
    const type = (attr(node, 'type') ?? node.type ?? 'text').toLowerCase()
    return CONTROL_INPUT_TYPES.has(type)
  }
  const role = attr(node, 'role')
  if (role && CONTROL_ROLES.has(role)) return true
  const slot = attr(node, 'data-slot')
  return Boolean(slot && CONTROL_SLOTS.has(slot))
}

function isExplicitCardHaptic(node: HapticNode) {
  return attr(node, 'data-haptic') === 'card'
}

function isHapticCard(node: HapticNode) {
  return attr(node, 'data-slot') === 'meal-card'
}

function isHapticField(node: HapticNode) {
  const tag = tagName(node)
  if (tag === 'textarea') return true
  if (tag === 'input') {
    const type = (attr(node, 'type') ?? node.type ?? 'text').toLowerCase()
    return !SKIP_FIELD_INPUT_TYPES.has(type)
  }
  const editable = attr(node, 'contenteditable')
  if (editable === 'true' || editable === 'plaintext-only') return true
  const role = attr(node, 'role')
  if (role && FIELD_ROLES.has(role)) return true
  const slot = attr(node, 'data-slot')
  return Boolean(slot && FIELD_SLOTS.has(slot))
}

function asHapticNode(target: EventTarget | HapticNode | null): HapticNode | null {
  if (!target || typeof target !== 'object') return null
  const node = target as HapticNode & {
    closest?: (selector: string) => unknown
    parentElement?: HapticNode | null
  }
  if (typeof node.getAttribute === 'function' || typeof node.tagName === 'string') {
    return node
  }
  if (node.parentElement) return node.parentElement
  return null
}

export function hybridHapticKindForTarget(
  target: EventTarget | HapticNode | null,
): HybridHapticKind | null {
  let node = asHapticNode(target)
  while (node) {
    if (isExplicitCardHaptic(node)) return isBlocked(node) ? null : 'medium'
    if (isHapticControl(node)) return isBlocked(node) ? null : 'light'
    if (isHapticField(node)) return isBlocked(node) ? null : 'light'
    if (isHapticCard(node)) return isBlocked(node) ? null : 'medium'
    node = node.parentElement ?? null
  }
  return null
}

function vibrateDuration(kind: HybridHapticKind) {
  return kind === 'medium' ? 16 : 10
}

function impactStyle(kind: HybridHapticKind): 'LIGHT' | 'MEDIUM' {
  return kind === 'medium' ? 'MEDIUM' : 'LIGHT'
}

function vibrateFn(runtime: HybridHapticsRuntime) {
  const vibrate = runtime.navigator?.vibrate ?? globalThis.navigator?.vibrate
  if (typeof vibrate !== 'function') return null
  const owner = runtime.navigator ?? globalThis.navigator
  return (duration: number) => vibrate.call(owner, duration)
}

export async function playHybridHaptic(
  kind: HybridHapticKind,
  runtime: HybridHapticsRuntime = globalThis,
): Promise<HybridHapticResult> {
  if (!isHybridNativeRuntime(runtime)) return { kind: 'skipped' }
  const vibrate = vibrateFn(runtime)
  // Light taps are frequent; navigator.vibrate skips the Capacitor bridge hitch.
  if (kind === 'light' && vibrate) {
    const duration = vibrateDuration(kind)
    vibrate(duration)
    return { kind: 'vibrate', duration }
  }
  const style = impactStyle(kind)
  const plugin = getHybridPlugin<HybridHapticsPlugin>('Haptics', runtime)
  if (plugin) {
    try {
      await plugin.impact({ style })
      return { kind: 'impact', style }
    } catch {
      // Keep a short vibration if the native plugin is missing from an older APK.
    }
  }
  if (!vibrate) return { kind: 'unavailable' }
  const duration = vibrateDuration(kind)
  vibrate(duration)
  return { kind: 'vibrate', duration }
}

function pointerButton(event: { button?: number }) {
  return typeof event.button === 'number' ? event.button : 0
}

export function attachHybridHaptics(
  root: {
    addEventListener: (
      type: string,
      listener: (event: { target: EventTarget | HapticNode | null; button?: number }) => void,
      options?: boolean,
    ) => void
    removeEventListener: (
      type: string,
      listener: (event: { target: EventTarget | HapticNode | null; button?: number }) => void,
      options?: boolean,
    ) => void
  } = globalThis.document,
  runtime: HybridHapticsRuntime = globalThis,
) {
  let lastAt = 0
  const maybePlay = (kind: HybridHapticKind | null) => {
    if (!kind) return
    const now = Date.now()
    if (now - lastAt < HAPTIC_THROTTLE_MS) return
    lastAt = now
    void playHybridHaptic(kind, runtime)
  }
  const onPointerDown = (event: { target: EventTarget | HapticNode | null; button?: number }) => {
    if (pointerButton(event) !== 0) return
    const kind = hybridHapticKindForTarget(event.target)
    if (kind !== 'light') return
    maybePlay(kind)
  }
  const onClick = (event: { target: EventTarget | HapticNode | null; button?: number }) => {
    if (pointerButton(event) !== 0) return
    const kind = hybridHapticKindForTarget(event.target)
    if (kind !== 'medium') return
    maybePlay(kind)
  }
  root.addEventListener('pointerdown', onPointerDown, true)
  root.addEventListener('click', onClick)
  return () => {
    root.removeEventListener('pointerdown', onPointerDown, true)
    root.removeEventListener('click', onClick)
  }
}
