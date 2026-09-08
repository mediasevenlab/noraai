import { isApiMealId } from './diary-feed'

export function rememberViewedMealIds(
  current: ReadonlySet<string>,
  incoming: readonly string[],
): Set<string> {
  const next = new Set(current)
  let changed = false
  for (const id of incoming) {
    if (!isApiMealId(id) || next.has(id)) continue
    next.add(id)
    changed = true
  }
  if (!changed) return current instanceof Set ? current : next
  return next
}

export function intersectingMealIds(
  entries: ReadonlyArray<{
    isIntersecting: boolean
    target: { getAttribute(name: string): string | null }
  }>,
): string[] {
  const ids: string[] = []
  const seen = new Set<string>()
  for (const entry of entries) {
    if (!entry.isIntersecting) continue
    const id = entry.target.getAttribute('data-meal-id')
    if (!id || !isApiMealId(id) || seen.has(id)) continue
    seen.add(id)
    ids.push(id)
  }
  return ids
}

export function closestOverflowRoot(start: Element | null): Element | null {
  let node = start?.parentElement ?? null
  while (node && node !== document.documentElement) {
    const style = getComputedStyle(node)
    if (/(auto|scroll)/.test(`${style.overflow} ${style.overflowY}`)) return node
    node = node.parentElement
  }
  return null
}
