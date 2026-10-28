import { compareDocumentTexts, type DiffKind, type DiffPiece } from './diff'

export type SheetPage = { title: string; text: string }

function pageFrom(text: string): SheetPage {
  const title = /^Лист «([^»]+)»/m.exec(text)?.[1] ?? ''
  return { title, text }
}

/** Excel extract is one block per worksheet, starting with `Лист «…»`. */
export function workbookPages(text: string): SheetPage[] {
  const normalized = text.replace(/\r\n/g, '\n')
  if (!/(^|\n)Лист «/.test(normalized)) return [{ title: '', text: normalized }]
  const pages: SheetPage[] = []
  let last = 0
  for (const match of normalized.matchAll(/\n(?=Лист «)/g)) {
    const at = match.index ?? 0
    pages.push(pageFrom(normalized.slice(last, at + 1)))
    last = at + 1
  }
  pages.push(pageFrom(normalized.slice(last)))
  return pages.filter((page) => page.text.length > 0)
}

export type LaidCell = { text: string; span: number; align: 'left' | 'center' | 'right' }

/** A row with one value is a line across the sheet, not a cell in the first column. */
export function sheetRowCells(cells: readonly string[], gridStarted: boolean): LaidCell[] {
  const filled = cells.map((text, index) => ({ text: text.trim(), index })).filter((cell) => cell.text.length > 0)
  if (filled.length !== 1) return cells.map((text) => ({ text, span: 1, align: 'left' as const }))
  const only = filled[0]!
  const span = Math.max(cells.length, 1)
  const align = only.index > span / 2 ? 'right' : !gridStarted && only.text.length <= 220 ? 'center' : 'left'
  return [{ text: only.text, span, align }]
}

export type ChangeKind = 'removed' | 'changed' | 'added'

export type SheetTab = {
  title: string
  kinds: ChangeKind[]
  leftIndex: number | null
  rightIndex: number | null
}

const KIND_ORDER: ChangeKind[] = ['removed', 'changed', 'added']

function changeKinds(pieces: readonly DiffPiece[]): ChangeKind[] {
  const found = new Set<ChangeKind>()
  for (const piece of pieces) {
    if (piece.kind !== 'same') found.add(piece.kind)
  }
  return KIND_ORDER.filter((kind) => found.has(kind))
}

type TitleEdit =
  | { kind: 'equal'; leftIndex: number; rightIndex: number }
  | { kind: 'delete'; leftIndex: number }
  | { kind: 'insert'; rightIndex: number }

function alignTitles(left: readonly string[], right: readonly string[]): TitleEdit[] {
  const rows = left.length
  const columns = right.length
  const scores = Array.from({ length: rows + 1 }, () => new Uint16Array(columns + 1))
  for (let row = rows - 1; row >= 0; row -= 1) {
    for (let column = columns - 1; column >= 0; column -= 1) {
      scores[row]![column] =
        left[row] === right[column]
          ? (scores[row + 1]?.[column + 1] ?? 0) + 1
          : Math.max(scores[row + 1]?.[column] ?? 0, scores[row]?.[column + 1] ?? 0)
    }
  }
  const edits: TitleEdit[] = []
  let row = 0
  let column = 0
  while (row < rows && column < columns) {
    if (left[row] === right[column]) {
      edits.push({ kind: 'equal', leftIndex: row, rightIndex: column })
      row += 1
      column += 1
    } else if ((scores[row + 1]?.[column] ?? 0) >= (scores[row]?.[column + 1] ?? 0)) {
      edits.push({ kind: 'delete', leftIndex: row })
      row += 1
    } else {
      edits.push({ kind: 'insert', rightIndex: column })
      column += 1
    }
  }
  while (row < rows) edits.push({ kind: 'delete', leftIndex: row++ })
  while (column < columns) edits.push({ kind: 'insert', rightIndex: column++ })
  return edits
}

/** Tabs for the second file: shared sheets keep their place, a missing sheet stays as removed, a new one as added. */
export function sheetTabs(leftPages: readonly SheetPage[], rightPages: readonly SheetPage[]): SheetTab[] {
  const named = leftPages.some((page) => page.title) || rightPages.some((page) => page.title)
  if (!named) {
    const count = Math.max(leftPages.length, rightPages.length)
    return Array.from({ length: count }, (_, index) => {
      const left = leftPages[index]
      const right = rightPages[index]
      const title = `Страница ${index + 1}`
      if (left && right) {
        return {
          title,
          kinds: visibleChangeKinds(compareDocumentTexts(left.text, right.text)),
          leftIndex: index,
          rightIndex: index,
        }
      }
      if (left) return { title, kinds: ['removed'], leftIndex: index, rightIndex: null }
      return { title, kinds: ['added'], leftIndex: null, rightIndex: index }
    })
  }
  return alignTitles(
    leftPages.map((page) => page.title),
    rightPages.map((page) => page.title),
  ).map((edit) => {
    if (edit.kind === 'delete') {
      return { title: leftPages[edit.leftIndex]?.title ?? '', kinds: ['removed'], leftIndex: edit.leftIndex, rightIndex: null }
    }
    if (edit.kind === 'insert') {
      return { title: rightPages[edit.rightIndex]?.title ?? '', kinds: ['added'], leftIndex: null, rightIndex: edit.rightIndex }
    }
    const left = leftPages[edit.leftIndex]
    const right = rightPages[edit.rightIndex]
    return {
      title: right?.title ?? '',
      kinds: visibleChangeKinds(compareDocumentTexts(left?.text ?? '', right?.text ?? '')),
      leftIndex: edit.leftIndex,
      rightIndex: edit.rightIndex,
    }
  })
}

/** Same sheet name, or the same page number when the file has no sheet titles. */
export function pageDiff(leftPages: readonly SheetPage[], rightPages: readonly SheetPage[], index: number): DiffPiece[] {
  const right = rightPages[index]
  if (!right) return []
  const left = right.title ? leftPages.find((page) => page.title === right.title) : leftPages[index]
  return compareDocumentTexts(left?.text ?? '', right.text)
}

/** Text PDFs keep a form feed between pages. A PDF without one is a single page. */
export function pdfPages(text: string): SheetPage[] {
  if (!text.includes('\f')) return [{ title: '', text }]
  const parts = text.split('\f')
  return parts.map((part, index) => ({
    title: '',
    text: index < parts.length - 1 ? `${part}\f` : part,
  }))
}

export function takePieces(pieces: readonly DiffPiece[], length: number) {
  let left = length
  const page: DiffPiece[] = []
  const rest: DiffPiece[] = []
  let spilling = false
  for (const piece of pieces) {
    if (spilling) {
      rest.push(piece)
      continue
    }
    if (piece.text.length <= left) {
      if (piece.text) page.push(piece)
      left -= piece.text.length
      if (left === 0) spilling = true
      continue
    }
    if (left > 0) page.push({ kind: piece.kind, text: piece.text.slice(0, left) })
    const tail = piece.text.slice(left)
    if (tail) rest.push({ kind: piece.kind, text: tail })
    spilling = true
    left = 0
  }
  return { page, rest }
}

export type LinePart = { kind: DiffKind; text: string }

/** A line keeps every edit, so a red deletion and a green addition stay themselves. */
export function lineParts(pieces: readonly DiffPiece[]): LinePart[][] {
  const lines: LinePart[][] = []
  let current: LinePart[] = []
  const push = (kind: DiffKind, text: string) => {
    if (!text) return
    const last = current.at(-1)
    if (last && last.kind === kind) last.text += text
    else current.push({ kind, text })
  }
  for (const piece of pieces) {
    const bits = piece.text.split('\n')
    bits.forEach((bit, index) => {
      push(piece.kind, bit.replace(/\f/g, ''))
      if (index < bits.length - 1) {
        lines.push(current)
        current = []
      }
    })
  }
  lines.push(current)
  return lines
}

function trimCell(parts: LinePart[]): LinePart[] {
  const next = parts.map((part) => ({ ...part }))
  if (next[0]) next[0].text = next[0].text.replace(/^\s+/, '')
  const last = next.at(-1)
  if (last) last.text = last.text.replace(/\s+$/, '')
  return next.filter((part) => part.text.length > 0)
}

/** Markdown cells of one sheet row, with the edits that belong to each cell. */
export function tableCells(parts: readonly LinePart[]): LinePart[][] {
  const cells: LinePart[][] = [[]]
  for (const part of parts) {
    const bits = part.text.split('|')
    bits.forEach((bit, index) => {
      if (bit) cells.at(-1)?.push({ kind: part.kind, text: bit })
      if (index < bits.length - 1) cells.push([])
    })
  }
  if (cells[0]?.every((part) => !part.text.trim())) cells.shift()
  if (cells.at(-1)?.every((part) => !part.text.trim())) cells.pop()
  return cells.map(trimCell)
}

function isRuleText(text: string) {
  const cells = text.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map((cell) => cell.trim()).filter(Boolean)
  return cells.length > 0 && cells.every((cell) => /^:?-{3,}:?$/.test(cell))
}

/** Marks that remain after the sheet label and the markdown rule row are hidden. */
export function visibleChangeKinds(pieces: readonly DiffPiece[]): ChangeKind[] {
  const kept: LinePart[] = []
  for (const parts of lineParts(pieces)) {
    const text = parts.map((part) => part.text).join('').trim()
    if (!text || /^Лист «/.test(text) || (text.startsWith('|') && isRuleText(text))) continue
    kept.push(...parts)
  }
  return changeKinds(kept)
}

export type MarkedLine = { kind: DiffKind; text: string }

/** One visual line, so a sheet row can be painted as a whole. */
export function markedLines(pieces: readonly DiffPiece[]): MarkedLine[] {
  const lines: MarkedLine[] = []
  let current = ''
  let kind: DiffKind = 'same'
  let mixed = false
  const flush = () => {
    lines.push({ kind: mixed ? 'changed' : kind, text: current })
    current = ''
    kind = 'same'
    mixed = false
  }
  for (const piece of pieces) {
    const parts = piece.text.split('\n')
    parts.forEach((part, index) => {
      if (part) {
        if (current && piece.kind !== kind) mixed = true
        if (!current) kind = piece.kind
        current += part
      }
      if (index < parts.length - 1) flush()
    })
  }
  if (current) flush()
  return lines
}
