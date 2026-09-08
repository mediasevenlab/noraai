const COMPOSER_CHROME_CONTROL =
  'button, [role="button"], a[href], select, summary, [data-slot="select-trigger"]'

function closestFn(target: EventTarget | null) {
  if (!target || typeof target !== 'object') return null
  const node = target as {
    closest?: (value: string) => unknown
    parentElement?: { closest?: (value: string) => unknown }
  }
  if (typeof node.closest === 'function') return node.closest.bind(node)
  if (typeof node.parentElement?.closest === 'function') {
    return node.parentElement.closest.bind(node.parentElement)
  }
  return null
}

export function shouldPressComposerSurface(target: EventTarget | null) {
  const closest = closestFn(target)
  if (!closest) return false
  return !closest(COMPOSER_CHROME_CONTROL)
}

export function composerPressPoint(
  rect: { left: number; top: number; width: number; height: number },
  clientX: number,
  clientY: number,
) {
  const x = Math.min(Math.max(0, clientX - rect.left), rect.width)
  const y = Math.min(Math.max(0, clientY - rect.top), rect.height)
  return { x: `${x}px`, y: `${y}px` }
}
