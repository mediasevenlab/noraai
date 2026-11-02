export type ChangeKind = 'removed' | 'changed' | 'added'

/** One stop per run of the same correction, so a sentence is not a dozen clicks. */
export function listChangeMarks(root: HTMLElement, kind: ChangeKind) {
  const side = root.querySelector('[data-compare-side="right"]') ?? root
  const nodes = [...side.querySelectorAll(`[data-diff="${kind}"]`)].filter((node): node is HTMLElement => {
    return node instanceof HTMLElement && !node.parentElement?.closest(`[data-diff="${kind}"]`) && node.getClientRects().length > 0
  })
  const groups: HTMLElement[] = []
  let previousPage: Element | null = null
  let previousRect: DOMRect | null = null
  for (const node of nodes) {
    const rect = node.getBoundingClientRect()
    const page = node.closest('.layout-page') ?? node.parentElement
    const sameRun = previousRect !== null && page === previousPage && rect.top <= previousRect.bottom + 6
    if (!sameRun) groups.push(node)
    previousPage = page
    previousRect = rect
  }
  return groups
}

function scrollParent(node: HTMLElement) {
  let current = node.parentElement
  while (current) {
    const style = getComputedStyle(current)
    if (/(auto|scroll)/.test(style.overflowY) && current.scrollHeight > current.clientHeight + 8) return current
    current = current.parentElement
  }
  return null
}

export function scrollChangeIntoView(node: HTMLElement) {
  const scroller = scrollParent(node)
  const rect = node.getBoundingClientRect()
  if (!scroller || rect.height === 0) {
    node.scrollIntoView({ block: 'center', inline: 'nearest' })
    return
  }
  const bounds = scroller.getBoundingClientRect()
  scroller.scrollTo({
    top: Math.max(0, rect.top - bounds.top + scroller.scrollTop - bounds.height / 3),
    behavior: 'auto',
  })
}

export function rightScroller(root: HTMLElement) {
  const side = root.querySelector('[data-compare-side="right"]')
  if (!(side instanceof HTMLElement)) return null
  const page = side.querySelector('.layout-page')
  if (page instanceof HTMLElement) {
    const scroller = scrollParent(page)
    if (scroller) return scroller
  }
  const plain = side.querySelector('.overflow-auto')
  return plain instanceof HTMLElement ? plain : scrollParent(side)
}
