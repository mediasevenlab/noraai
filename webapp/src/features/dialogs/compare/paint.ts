import type { DiffPiece } from './diff'

export type CompareMark =
  | { type: 'wrap'; start: number; end: number; kind: 'changed' | 'added' }
  | { type: 'insert'; at: number; text: string }

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/** Words of `needle`. Edge punctuation is dropped so a split colon still matches. */
function wordsOfNeedle(needle: string) {
  return needle
    .trim()
    .split(/\s+/)
    .map((token) => token.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, ''))
    .filter(Boolean)
}

/**
 * Finds `needle` at or after `from`.
 * Page text may put a bullet or a colon in its own run between the same words.
 */
function findFlexible(haystack: string, needle: string, from: number) {
  const tokens = wordsOfNeedle(needle)
  if (tokens.length === 0) {
    const match = /^\s+/.exec(haystack.slice(from))
    if (!match) return null
    return { start: from, end: from + match[0].length }
  }
  const match = new RegExp(tokens.map(escapeRegExp).join('[^\\p{L}\\p{N}]+'), 'u').exec(haystack.slice(from))
  if (!match) return null
  return { start: from + match.index, end: from + match.index + match[0].length }
}

function core(haystack: string, start: number, end: number) {
  let from = start
  let to = end
  while (from < to && /\s/.test(haystack[from] ?? '')) from += 1
  while (to > from && /\s/.test(haystack[to - 1] ?? '')) to -= 1
  if (from >= to) return null
  return { start: from, end: to }
}

/**
 * Colors words on the right-hand page.
 * Removed words are written at the gap, in the same type, with a strike.
 */
export function locateMarks(haystack: string, pieces: readonly DiffPiece[]): CompareMark[] {
  const marks: CompareMark[] = []
  let cursor = 0
  let removed = ''
  const flush = (at: number) => {
    const visible = removed
      .replace(/\r\n/g, '\n')
      .replace(/[^\S\n]+/g, ' ')
      .replace(/ *\n */g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim()
    if (visible.length >= 3) marks.push({ type: 'insert', at, text: visible.includes('\n') ? visible : `${visible} ` })
    removed = ''
  }
  for (const piece of pieces) {
    if (piece.kind === 'removed') {
      removed += piece.text
      continue
    }
    if (!piece.text.trim()) {
      if (removed && /\n/.test(piece.text)) removed += '\n'.repeat(Math.min(2, piece.text.match(/\n/g)?.length ?? 1))
      const blank = findFlexible(haystack, piece.text, cursor)
      if (blank) cursor = blank.end
      continue
    }
    const found = findFlexible(haystack, piece.text, cursor)
    if (!found) continue
    flush(found.start)
    if (piece.kind !== 'same') {
      const range = core(haystack, found.start, found.end)
      if (range && range.end - range.start >= 3) marks.push({ type: 'wrap', ...range, kind: piece.kind })
    }
    cursor = found.end
  }
  flush(cursor)
  return marks
}

function textNodes(root: HTMLElement) {
  const pages = [...root.querySelectorAll('.layout-page-content')].filter((node): node is HTMLElement => node instanceof HTMLElement)
  const scopes = pages.length > 0 ? pages : [root]
  const nodes: Text[] = []
  for (const scope of scopes) {
    const walker = document.createTreeWalker(scope, NodeFilter.SHOW_TEXT)
    let current = walker.nextNode()
    while (current) {
      const node = current as Text
      const parent = node.parentElement
      const skipped = parent?.closest('[data-diff="removed"], .layout-page-header, .paged-editor__hidden-pm')
      if (node.data.length > 0 && !skipped) nodes.push(node)
      current = walker.nextNode()
    }
  }
  return nodes
}

const TONE = {
  removed: ['#fde8e6', '#b42318'],
  changed: ['#e7f0fb', '#1d4f91'],
  added: ['#e5f6ea', '#0f7a3a'],
} as const

export type ShownMarks = { removed: boolean; changed: boolean; added: boolean }

/** Removed text leaves the page. Changed and added words stay, only their color goes away. */
export function pieceAppearance(kind: DiffPiece['kind'], shown: ShownMarks): 'plain' | 'mark' | 'omit' {
  if (kind === 'same') return 'plain'
  if (kind === 'removed') return shown.removed ? 'mark' : 'omit'
  if (kind === 'changed') return shown.changed ? 'mark' : 'plain'
  return shown.added ? 'mark' : 'plain'
}

function paintTone(span: HTMLElement, kind: keyof typeof TONE, colored: boolean) {
  if (!colored) {
    span.style.setProperty('background-color', 'transparent', 'important')
    span.style.setProperty('color', 'inherit', 'important')
    if (kind === 'removed') span.style.setProperty('text-decoration', 'none', 'important')
    return
  }
  span.style.setProperty('background-color', TONE[kind][0], 'important')
  span.style.setProperty('color', TONE[kind][1], 'important')
  if (kind === 'removed') span.style.setProperty('text-decoration', 'line-through', 'important')
}

/** Turns comparison colors on and off without painting the pages again. */
export function applyMarkVisibility(root: HTMLElement, shown: ShownMarks) {
  root.querySelectorAll('[data-diff="changed"], [data-diff="added"]').forEach((node) => {
    if (!(node instanceof HTMLElement)) return
    const kind = node.dataset.diff === 'added' ? 'added' : 'changed'
    paintTone(node, kind, kind === 'added' ? shown.added : shown.changed)
  })
  const blocks = [...root.querySelectorAll('[data-diff="removed"]')].filter((node): node is HTMLElement => {
    return node instanceof HTMLElement && node.style.position === 'absolute'
  })
  for (const block of blocks) {
    const parent = block.parentElement
    if (!parent) continue
    const hidden = block.dataset.noraHidden === '1'
    if (!shown.removed && !hidden) {
      const extra = block.offsetHeight
      block.dataset.noraSpan = String(extra)
      block.dataset.noraHidden = '1'
      block.style.setProperty('display', 'none', 'important')
      shiftBelow(parent, paragraphTop(block) - 1, -extra, block)
    } else if (shown.removed && hidden) {
      const extra = Number(block.dataset.noraSpan) || 0
      block.style.removeProperty('display')
      delete block.dataset.noraHidden
      shiftBelow(parent, paragraphTop(block) - 1, extra, block)
    }
  }
  root.querySelectorAll('[data-diff="removed"]').forEach((node) => {
    if (!(node instanceof HTMLElement) || node.style.position === 'absolute') return
    if (!shown.removed) {
      node.dataset.noraFold = '1'
      node.style.setProperty('display', 'none', 'important')
    } else if (node.dataset.noraFold === '1') {
      delete node.dataset.noraFold
      node.style.removeProperty('display')
    }
  })
}

function paintSpan(kind: 'changed' | 'added' | 'removed') {
  const span = document.createElement('span')
  span.dataset.diff = kind
  paintTone(span, kind, true)
  span.style.font = 'inherit'
  span.style.fontSize = 'inherit'
  span.style.lineHeight = 'inherit'
  span.style.fontFamily = 'inherit'
  span.style.fontWeight = 'inherit'
  span.style.borderRadius = '2px'
  span.style.whiteSpace = 'pre-wrap'
  span.style.setProperty('user-select', 'text', 'important')
  span.style.setProperty('-webkit-user-select', 'text', 'important')
  span.style.setProperty('pointer-events', 'auto', 'important')
  span.style.cursor = 'text'
  if (kind === 'removed') span.style.setProperty('text-decoration', 'line-through', 'important')
  return span
}

function copyType(target: HTMLElement, source: CSSStyleDeclaration) {
  target.style.fontSize = source.fontSize
  target.style.fontFamily = source.fontFamily
  target.style.fontWeight = source.fontWeight
  target.style.lineHeight = source.lineHeight
  target.style.letterSpacing = source.letterSpacing
}

function paragraphTop(node: HTMLElement) {
  return Number.parseFloat(node.style.top) || 0
}

function growPage(page: HTMLElement, content: HTMLElement) {
  const items = [...content.querySelectorAll(':scope > .layout-paragraph, :scope > [data-diff="removed"]')]
  let bottom = 0
  for (const item of items) {
    if (!(item instanceof HTMLElement)) continue
    bottom = Math.max(bottom, paragraphTop(item) + item.offsetHeight)
  }
  const chrome = page.offsetHeight - content.clientHeight
  const needed = bottom + 28
  if (needed <= content.clientHeight) return
  content.style.height = `${needed}px`
  content.style.minHeight = `${needed}px`
  const pageHeight = needed + Math.max(0, chrome)
  page.style.height = `${pageHeight}px`
  page.style.minHeight = `${pageHeight}px`
  page.style.overflow = 'visible'
}

function placeInline(target: Text, text: string, where: 'before' | 'after' = 'before') {
  const span = paintSpan('removed')
  span.textContent = /\s$/.test(text) ? text : `${text} `
  const parentDiff = target.parentElement?.closest('[data-diff]')
  const anchor: ChildNode = parentDiff ?? target
  if (where === 'after') anchor.after(span)
  else anchor.before(span)
  const line = target.parentElement?.closest('.layout-line')
  if (line instanceof HTMLElement) openLine(line)
}

function shiftBelow(parent: HTMLElement, origin: number, extra: number, exclude: HTMLElement) {
  for (const item of parent.children) {
    if (!(item instanceof HTMLElement) || item === exclude || !item.style.top) continue
    if (paragraphTop(item) > origin + 0.5) item.style.top = `${paragraphTop(item) + extra}px`
  }
}

/** A struck word stays in the sentence. Only the wrapped line grows, so the heading above it stays put. */
function openLine(line: HTMLElement) {
  line.style.setProperty('user-select', 'text', 'important')
  line.style.setProperty('overflow', 'visible', 'important')
  const before = line.getBoundingClientRect().height
  line.style.setProperty('white-space', 'pre-wrap', 'important')
  line.style.setProperty('height', 'auto', 'important')
  line.style.maxWidth = '100%'
  const extra = line.getBoundingClientRect().height - before
  const paragraph = line.closest('.layout-paragraph')
  if (!(paragraph instanceof HTMLElement) || !paragraph.parentElement || extra <= 1) return
  const height = Number.parseFloat(paragraph.style.height)
  paragraph.style.height = `${(Number.isFinite(height) ? height : paragraph.getBoundingClientRect().height) + extra}px`
  shiftBelow(paragraph.parentElement, paragraphTop(paragraph), extra, paragraph)
  const page = paragraph.closest('.layout-page')
  if (page instanceof HTMLElement) growPage(page, paragraph.parentElement)
}

/** A deleted list keeps one line per item, the body font, and a bullet. A deleted word stays in the sentence. */
function placeRemoved(target: Text, text: string) {
  const lines = text.split('\n').map((line) => line.trim()).filter(Boolean)
  if (lines.length <= 1) {
    placeInline(target, lines[0] ?? text.trim())
    return
  }
  const paragraph = target.parentElement?.closest('.layout-paragraph')
  if (!(paragraph instanceof HTMLElement) || !paragraph.parentElement) {
    const block = document.createElement('div')
    block.dataset.diff = 'removed'
    block.style.whiteSpace = 'pre-wrap'
    block.textContent = lines.join('\n')
    target.before(block)
    return
  }
  const source = target.parentElement instanceof HTMLElement ? target.parentElement : paragraph
  const font = getComputedStyle(source)
  const block = document.createElement('div')
  block.dataset.diff = 'removed'
  block.style.position = 'absolute'
  block.style.zIndex = '2'
  block.style.left = paragraph.style.left || '0px'
  block.style.width = paragraph.style.width || `${paragraph.clientWidth}px`
  block.style.top = paragraph.style.top || '0px'
  block.style.margin = '0'
  block.style.boxSizing = 'border-box'
  block.style.color = font.color
  block.style.setProperty('user-select', 'text', 'important')
  block.style.setProperty('-webkit-user-select', 'text', 'important')
  block.style.setProperty('pointer-events', 'auto', 'important')
  block.style.cursor = 'text'
  copyType(block, font)
  const intro = lines[0]?.endsWith(':') ? lines[0] : ''
  const items = intro ? lines.slice(1) : lines
  if (intro) {
    const lead = document.createElement('div')
    lead.style.margin = '0 0 0.45em'
    const span = paintSpan('removed')
    span.textContent = intro
    lead.appendChild(span)
    block.appendChild(lead)
  }
  const list = document.createElement('ul')
  list.style.margin = '0'
  list.style.paddingLeft = '1.25em'
  list.style.listStyleType = 'disc'
  for (const item of items) {
    const row = document.createElement('li')
    row.style.margin = '0.35em 0'
    row.style.paddingLeft = '0.2em'
    const span = paintSpan('removed')
    span.textContent = item
    row.appendChild(span)
    list.appendChild(row)
  }
  if (items.length > 0) block.appendChild(list)
  paragraph.parentElement.appendChild(block)
  const extra = block.offsetHeight
  const origin = paragraphTop(paragraph)
  shiftBelow(paragraph.parentElement, origin - 1, extra, block)
  const page = paragraph.closest('.layout-page')
  if (page instanceof HTMLElement) growPage(page, paragraph.parentElement)
}

function insertRemoved(root: HTMLElement, at: number, text: string) {
  const nodes = textNodes(root)
  let offset = 0
  for (const node of nodes) {
    const nodeStart = offset
    offset += node.data.length
    if (at >= offset) continue
    const local = Math.max(0, at - nodeStart)
    placeRemoved(local > 0 ? node.splitText(local) : node, text)
    return
  }
  const last = nodes.at(-1)
  if (!last) return
  if (text.includes('\n')) placeRemoved(last, text)
  else placeInline(last, text, 'after')
}

function wrap(root: HTMLElement, start: number, end: number, kind: 'changed' | 'added') {
  if (end <= start) return
  const nodes = textNodes(root)
  let offset = 0
  const hits: { node: Text; nodeStart: number }[] = []
  for (const node of nodes) {
    const nodeStart = offset
    offset += node.data.length
    if (offset <= start || nodeStart >= end) continue
    hits.push({ node, nodeStart })
  }
  for (const hit of hits.reverse()) {
    const localStart = Math.max(0, start - hit.nodeStart)
    const localEnd = Math.min(hit.node.data.length, end - hit.nodeStart)
    let target = hit.node
    if (localEnd < target.data.length) target.splitText(localEnd)
    if (localStart > 0) target = target.splitText(localStart)
    const span = paintSpan(kind)
    target.before(span)
    span.appendChild(target)
  }
}

function markAt(mark: CompareMark) {
  return mark.type === 'wrap' ? mark.start : mark.at
}

export function applyMarks(root: HTMLElement, marks: readonly CompareMark[]) {
  const ordered = [...marks].sort((left, right) => markAt(right) - markAt(left) || (left.type === 'wrap' ? -1 : 1))
  for (const mark of ordered) {
    if (mark.type === 'wrap') wrap(root, mark.start, mark.end, mark.kind)
    else insertRemoved(root, mark.at, mark.text)
  }
}

/** A line break between two text runs counts as whitespace, the way a paragraph does. */
export function withBreaks(parts: readonly string[]) {
  let raw = ''
  let text = ''
  const map: number[] = []
  parts.forEach((part, index) => {
    if (index > 0 && raw && !/\s$/.test(raw) && part && !/^\s/.test(part)) {
      text += '\n'
      map.push(-1)
    }
    for (const char of part) {
      text += char
      map.push(raw.length)
      raw += char
    }
  })
  return { text, map }
}

function rawAt(map: readonly number[], index: number) {
  let cursor = Math.min(Math.max(index, 0), map.length)
  while (cursor < map.length && map[cursor] === -1) cursor += 1
  if (cursor >= map.length) {
    let last = 0
    for (const value of map) if (value >= 0) last = value + 1
    return last
  }
  return map[cursor] ?? 0
}

export function paintPage(root: HTMLElement, pieces: readonly DiffPiece[]) {
  const nodes = textNodes(root)
  const stream = withBreaks(nodes.map((node) => node.data))
  const marks = locateMarks(stream.text, pieces).map((mark) =>
    mark.type === 'insert'
      ? { ...mark, at: rawAt(stream.map, mark.at) }
      : { ...mark, start: rawAt(stream.map, mark.start), end: rawAt(stream.map, mark.end) },
  )
  applyMarks(root, marks)
  closeHeadingGaps(root)
}

/** Empty paragraphs under a section heading are spacing from the file. Pull the next text up to the heading. */
export function closeHeadingGaps(root: HTMLElement) {
  root.querySelectorAll('.layout-page-content').forEach((content) => {
    if (!(content instanceof HTMLElement)) return
    const rows = [...content.children]
      .filter((node): node is HTMLElement => node instanceof HTMLElement && Boolean(node.style.top))
      .map((item) => ({ item, top: paragraphTop(item) }))
      .sort((left, right) => left.top - right.top)
    let shift = 0
    let heading = false
    for (let index = 0; index < rows.length; index += 1) {
      const row = rows[index]!
      row.item.style.top = `${row.top - shift}px`
      if (row.item.dataset.noraGap === '1') continue
      const blank = row.item.classList.contains('layout-paragraph') && !row.item.textContent?.trim() && !row.item.querySelector('img, svg')
      if (blank && heading) {
        const next = rows[index + 1]
        shift += Math.max(0, (next?.top ?? row.top + row.item.getBoundingClientRect().height) - row.top)
        row.item.dataset.noraGap = '1'
        row.item.style.display = 'none'
        continue
      }
      if (row.item.dataset.styleId === '2' && row.item.textContent?.trim()) heading = true
      else if (row.item.textContent?.trim()) heading = false
    }
  })
}
