export type DiffKind = 'same' | 'added' | 'removed' | 'changed'

export type DiffPiece = { kind: DiffKind; text: string }

type Edit = { kind: 'equal' | 'delete' | 'insert'; text: string }

function linesOf(text: string) {
  const normalized = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
  if (!normalized) return []
  return normalized.split(/(\n)/).filter((part) => part.length > 0)
}

function wordsOf(text: string) {
  return text.match(/\s+|[^\s]+/g) ?? []
}

const TABLE_CELL_LIMIT = 250_000

function diffTable(left: readonly string[], right: readonly string[], a0: number, a1: number, b0: number, b1: number): Edit[] {
  const rows = a1 - a0
  const columns = b1 - b0
  const scores = Array.from({ length: rows + 1 }, () => new Uint32Array(columns + 1))
  for (let row = rows - 1; row >= 0; row -= 1) {
    for (let column = columns - 1; column >= 0; column -= 1) {
      scores[row]![column] = left[a0 + row] === right[b0 + column]
        ? (scores[row + 1]?.[column + 1] ?? 0) + 1
        : Math.max(scores[row + 1]?.[column] ?? 0, scores[row]?.[column + 1] ?? 0)
    }
  }
  const edits: Edit[] = []
  let row = 0
  let column = 0
  while (row < rows && column < columns) {
    if (left[a0 + row] === right[b0 + column]) {
      edits.push({ kind: 'equal', text: left[a0 + row]! })
      row += 1
      column += 1
    } else if ((scores[row + 1]?.[column] ?? 0) >= (scores[row]?.[column + 1] ?? 0)) {
      edits.push({ kind: 'delete', text: left[a0 + row]! })
      row += 1
    } else {
      edits.push({ kind: 'insert', text: right[b0 + column]! })
      column += 1
    }
  }
  while (row < rows) edits.push({ kind: 'delete', text: left[a0 + row++]! })
  while (column < columns) edits.push({ kind: 'insert', text: right[b0 + column++]! })
  return edits
}

/** A line that occurs once on each side. Long documents split here instead of one giant table. */
function uniqueAnchor(
  left: readonly string[],
  a0: number,
  a1: number,
  right: readonly string[],
  b0: number,
  b1: number,
) {
  const rightCount = new Map<string, number>()
  for (let index = b0; index < b1; index += 1) {
    const line = right[index]!
    rightCount.set(line, (rightCount.get(line) ?? 0) + 1)
  }
  const leftCount = new Map<string, number>()
  for (let index = a0; index < a1; index += 1) {
    const line = left[index]!
    leftCount.set(line, (leftCount.get(line) ?? 0) + 1)
  }
  const rightAt = new Map<string, number>()
  for (let index = b0; index < b1; index += 1) {
    const line = right[index]!
    if (rightCount.get(line) === 1) rightAt.set(line, index)
  }
  const middle = (a0 + a1) >> 1
  let best: { leftAt: number; rightAt: number; distance: number } | null = null
  for (let index = a0; index < a1; index += 1) {
    const line = left[index]!
    if (!line.trim() || leftCount.get(line) !== 1) continue
    const match = rightAt.get(line)
    if (match == null) continue
    const distance = Math.abs(index - middle)
    if (!best || distance < best.distance) best = { leftAt: index, rightAt: match, distance }
  }
  return best
}

function diffParts(left: readonly string[], a0: number, a1: number, right: readonly string[], b0: number, b1: number): Edit[] {
  let start = 0
  while (a0 + start < a1 && b0 + start < b1 && left[a0 + start] === right[b0 + start]) start += 1
  let end = 0
  while (
    end < a1 - a0 - start &&
    end < b1 - b0 - start &&
    left[a1 - 1 - end] === right[b1 - 1 - end]
  ) {
    end += 1
  }
  const edits: Edit[] = []
  for (let index = 0; index < start; index += 1) edits.push({ kind: 'equal', text: left[a0 + index]! })
  const leftFrom = a0 + start
  const leftTo = a1 - end
  const rightFrom = b0 + start
  const rightTo = b1 - end
  if (leftFrom < leftTo || rightFrom < rightTo) edits.push(...diffMiddle(left, leftFrom, leftTo, right, rightFrom, rightTo))
  for (let index = 0; index < end; index += 1) edits.push({ kind: 'equal', text: left[leftTo + index]! })
  return edits
}

function diffMiddle(
  left: readonly string[],
  a0: number,
  a1: number,
  right: readonly string[],
  b0: number,
  b1: number,
): Edit[] {
  if (a0 === a1) return right.slice(b0, b1).map((text) => ({ kind: 'insert' as const, text }))
  if (b0 === b1) return left.slice(a0, a1).map((text) => ({ kind: 'delete' as const, text }))
  if ((a1 - a0) * (b1 - b0) <= TABLE_CELL_LIMIT) return diffTable(left, right, a0, a1, b0, b1)
  const anchor = uniqueAnchor(left, a0, a1, right, b0, b1)
  if (!anchor) {
    return [
      ...left.slice(a0, a1).map((text) => ({ kind: 'delete' as const, text })),
      ...right.slice(b0, b1).map((text) => ({ kind: 'insert' as const, text })),
    ]
  }
  return [
    ...diffParts(left, a0, anchor.leftAt, right, b0, anchor.rightAt),
    { kind: 'equal', text: left[anchor.leftAt]! },
    ...diffParts(left, anchor.leftAt + 1, a1, right, anchor.rightAt + 1, b1),
  ]
}

function diffSequences(left: readonly string[], right: readonly string[]): Edit[] {
  return diffParts(left, 0, left.length, right, 0, right.length)
}

function paint(edits: readonly Edit[]): DiffPiece[] {
  const pieces: DiffPiece[] = []
  for (let index = 0; index < edits.length; index += 1) {
    const edit = edits[index]!
    if (edit.kind === 'equal') {
      pieces.push({ kind: 'same', text: edit.text })
      continue
    }
    if (edit.kind === 'delete' && edits[index + 1]?.kind === 'insert') {
      pieces.push({ kind: 'removed', text: edit.text })
      pieces.push({ kind: 'changed', text: edits[index + 1]!.text })
      index += 1
      continue
    }
    pieces.push({ kind: edit.kind === 'delete' ? 'removed' : 'added', text: edit.text })
  }
  return mergePieces(pieces)
}

function mergePieces(pieces: readonly DiffPiece[]) {
  const merged: DiffPiece[] = []
  for (const piece of pieces) {
    if (!piece.text) continue
    const previous = merged.at(-1)
    if (previous && previous.kind === piece.kind) previous.text += piece.text
    else merged.push({ ...piece })
  }
  return merged
}

function pipeSlots(line: string) {
  if (!line.includes('|')) return 0
  return line.split('|').length
}

function paintTableRow(removed: string, added: string): DiffPiece[] {
  const left = removed.split('|')
  const right = added.split('|')
  const width = Math.max(left.length, right.length)
  const pieces: DiffPiece[] = []
  for (let index = 0; index < width; index += 1) {
    if (index > 0) pieces.push({ kind: 'same', text: '|' })
    const before = left[index] ?? ''
    const after = right[index] ?? ''
    if (before === after) pieces.push({ kind: 'same', text: before })
    else pieces.push(...paintHunk(before, after))
  }
  return pieces
}

/** Rows of a markdown table stay rows. A word diff across many rows would glue their columns together. */
function paintTableHunk(removed: string, added: string): DiffPiece[] {
  const edits = diffSequences(linesOf(removed), linesOf(added))
  const pieces: DiffPiece[] = []
  for (let index = 0; index < edits.length; index += 1) {
    const edit = edits[index]!
    const next = edits[index + 1]
    if (
      edit.kind === 'delete'
      && next?.kind === 'insert'
      && !edit.text.includes('\n')
      && !next.text.includes('\n')
      && pipeSlots(edit.text) > 2
      && pipeSlots(edit.text) === pipeSlots(next.text)
    ) {
      pieces.push(...paintTableRow(edit.text, next.text))
      index += 1
      continue
    }
    if (edit.kind === 'equal') pieces.push({ kind: 'same', text: edit.text })
    else {
      const text = edit.text
      const previous = pieces.at(-1)
      if (
        previous
        && !previous.text.endsWith('\n')
        && !text.startsWith('\n')
        && previous.text.includes('|') !== text.includes('|')
      ) {
        pieces.push({ kind: 'same', text: '\n' })
      }
      pieces.push({ kind: edit.kind === 'delete' ? 'removed' : 'added', text })
    }
  }
  return mergePieces(pieces)
}

function paintHunk(removed: string, added: string): DiffPiece[] {
  if (!removed) return paint(wordsOf(added).map((text) => ({ kind: 'insert', text })))
  if (!added) return paint(wordsOf(removed).map((text) => ({ kind: 'delete', text })))
  if (removed.includes('\n') && removed.includes('|') && added.includes('|')) return paintTableHunk(removed, added)
  if (!removed.includes('\n') && !added.includes('\n') && pipeSlots(removed) > 2 && pipeSlots(removed) === pipeSlots(added)) {
    return paintTableRow(removed, added)
  }
  // A table row and a line of text are different blocks. A word diff would pour one into the other.
  if (removed.includes('|') !== added.includes('|')) return paintTableHunk(removed, added)
  return paint(diffSequences(wordsOf(removed), wordsOf(added)))
}

/** The right document, with deletions from the left kept inline. */
export function compareDocumentTexts(left: string, right: string): DiffPiece[] {
  const edits = diffSequences(linesOf(left), linesOf(right))
  const pieces: DiffPiece[] = []
  for (let index = 0; index < edits.length; index += 1) {
    const edit = edits[index]!
    if (edit.kind === 'equal') {
      pieces.push({ kind: 'same', text: edit.text })
      continue
    }
    let removed = ''
    let added = ''
    while (index < edits.length && edits[index]?.kind !== 'equal') {
      const next = edits[index]!
      if (next.kind === 'delete') removed += next.text
      else added += next.text
      index += 1
    }
    index -= 1
    pieces.push(...paintHunk(removed, added))
  }
  return mergePieces(pieces)
}
