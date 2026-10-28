const HIGHLIGHT_STYLE = 'nora-highlight-style'

function ensureHighlightStyle() {
  if (document.getElementById(HIGHLIGHT_STYLE)) return
  const style = document.createElement('style')
  style.id = HIGHLIGHT_STYLE
  style.textContent =
    '::highlight(nora-find){background-color:#fde68a;color:inherit}::highlight(nora-find-current){background-color:#f5c14a;color:inherit}::highlight(nora-return){background-color:#f5c14a;color:inherit}'
  document.head.appendChild(style)
}

function highlights() {
  return 'highlights' in CSS ? CSS.highlights : null
}

/** A match inside one block, counted in that block's text as the browser stores it. */
export function rangeInElement(block: HTMLElement, start: number, length: number) {
  const walker = document.createTreeWalker(block, NodeFilter.SHOW_TEXT)
  let seen = 0
  let startNode: Text | null = null
  let startOffset = 0
  let endNode: Text | null = null
  let endOffset = 0
  const end = start + length
  let node: Node | null
  while ((node = walker.nextNode())) {
    const text = node as Text
    const next = seen + text.data.length
    if (!startNode && start < next) {
      startNode = text
      startOffset = Math.max(0, start - seen)
    }
    if (startNode && end <= next) {
      endNode = text
      endOffset = Math.max(0, end - seen)
      break
    }
    if (startNode) {
      endNode = text
      endOffset = text.data.length
    }
    seen = next
  }
  if (!startNode || !endNode) return null
  const range = document.createRange()
  range.setStart(startNode, Math.min(startOffset, startNode.data.length))
  range.setEnd(endNode, Math.min(endOffset, endNode.data.length))
  return range
}

export function paintFindRanges(ranges: Range[], current: Range | null) {
  const list = highlights()
  if (!list) return
  ensureHighlightStyle()
  const rest = current ? ranges.filter((range) => range !== current) : ranges
  list.set('nora-find', new Highlight(...rest))
  list.set('nora-find-current', current ? new Highlight(current) : new Highlight())
}

export function clearFindRanges() {
  const list = highlights()
  list?.delete('nora-find')
  list?.delete('nora-find-current')
}

export function scrollToRange(range: Range) {
  const node = range.startContainer
  const element = node instanceof Element ? node : node.parentElement
  const rect = range.getBoundingClientRect()
  const scroller = element?.closest('[data-folio-scroll]')
  if (scroller instanceof HTMLElement && (rect.width > 0 || rect.height > 0)) {
    const top = rect.top - scroller.getBoundingClientRect().top + scroller.scrollTop - 80
    scroller.scrollTo({ top: Math.max(0, top), behavior: 'auto' })
    return
  }
  element?.scrollIntoView({ block: 'center', inline: 'nearest' })
}

let returnTimer = 0

export function clearFragmentMark() {
  window.clearTimeout(returnTimer)
  highlights()?.delete('nora-return')
}

function flashRange(range: Range) {
  const list = highlights()
  if (!list) return
  ensureHighlightStyle()
  list.set('nora-return', new Highlight(range))
  window.clearTimeout(returnTimer)
  returnTimer = window.setTimeout(() => list.delete('nora-return'), 1600)
}

function phraseRange(root: HTMLElement, needle: string) {
  const target = needle.replace(/\s+/g, ' ').trim().toLowerCase()
  if (!target) return null
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
  const marks: { node: Text; offset: number }[] = []
  let flat = ''
  let node: Node | null
  while ((node = walker.nextNode())) {
    const text = node as Text
    for (let index = 0; index < text.data.length; index += 1) {
      const char = text.data[index] ?? ''
      if (/\s/.test(char)) {
        if (!flat.endsWith(' ')) {
          flat += ' '
          marks.push({ node: text, offset: index })
        }
        continue
      }
      flat += char
      marks.push({ node: text, offset: index })
    }
  }
  const at = flat.toLowerCase().indexOf(target)
  if (at < 0 || !marks[at] || !marks[at + target.length - 1]) return null
  const start = marks[at]
  const finish = marks[at + target.length - 1]
  if (!start || !finish) return null
  const range = document.createRange()
  range.setStart(start.node, start.offset)
  range.setEnd(finish.node, Math.min(finish.offset + 1, finish.node.data.length))
  return range
}

/** Scrolls the phrase into view and marks those words. A side limits the search to that document. */
export function placeFragment(root: HTMLElement, text: string, side?: 'left' | 'right' | null) {
  const needle = text.replace(/\s+/g, ' ').trim().slice(0, 180)
  if (!needle) return false
  let host: HTMLElement = root
  if (side) {
    const pane = root.querySelector(`[data-compare-side="${side}"]`)
    if (!(pane instanceof HTMLElement)) return false
    host = pane
  }
  const range = phraseRange(host, needle)
  if (!range) return false
  const rect = range.getBoundingClientRect()
  if (rect.width === 0 && rect.height === 0) return false
  scrollToRange(range)
  flashRange(range)
  return true
}
