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

function diffSequences(left: readonly string[], right: readonly string[]): Edit[] {
  const rows = left.length
  const columns = right.length
  if (rows * columns > 1_000_000) {
    return [
      ...left.map((text) => ({ kind: 'delete' as const, text })),
      ...right.map((text) => ({ kind: 'insert' as const, text })),
    ]
  }
  const scores = Array.from({ length: rows + 1 }, () => new Uint32Array(columns + 1))
  for (let row = rows - 1; row >= 0; row -= 1) {
    for (let column = columns - 1; column >= 0; column -= 1) {
      scores[row]![column] = left[row] === right[column]
        ? (scores[row + 1]?.[column + 1] ?? 0) + 1
        : Math.max(scores[row + 1]?.[column] ?? 0, scores[row]?.[column + 1] ?? 0)
    }
  }
  const edits: Edit[] = []
  let row = 0
  let column = 0
  while (row < rows && column < columns) {
    if (left[row] === right[column]) {
      edits.push({ kind: 'equal', text: left[row]! })
      row += 1
      column += 1
    } else if ((scores[row + 1]?.[column] ?? 0) >= (scores[row]?.[column + 1] ?? 0)) {
      edits.push({ kind: 'delete', text: left[row]! })
      row += 1
    } else {
      edits.push({ kind: 'insert', text: right[column]! })
      column += 1
    }
  }
  while (row < rows) edits.push({ kind: 'delete', text: left[row++]! })
  while (column < columns) edits.push({ kind: 'insert', text: right[column++]! })
  return edits
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

function paintHunk(removed: string, added: string): DiffPiece[] {
  if (!removed) return paint(wordsOf(added).map((text) => ({ kind: 'insert', text })))
  if (!added) return paint(wordsOf(removed).map((text) => ({ kind: 'delete', text })))
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
