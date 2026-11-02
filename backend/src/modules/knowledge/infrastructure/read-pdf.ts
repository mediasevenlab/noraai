export type PdfRun = { str: string; x: number; y: number; width?: number }

type Item = { text: string; x: number; y: number; width: number }
type Line = Item[]

const SAME_LINE = 3
const ROW_GAP = 40
const COLUMN_GAP = 32
const STITCH_GAP = 48
const ANCHOR_MATCH = 52

function linesOf(runs: readonly PdfRun[]): Line[] {
  const items = runs
    .map((run) => {
      const text = run.str.replace(/\s+/g, ' ').trim()
      return { text, x: run.x, y: run.y, width: run.width && run.width > 0 ? run.width : text.length * 5 }
    })
    .filter((item) => item.text.length > 0)
    .sort((left, right) => right.y - left.y || left.x - right.x)
  const lines: Line[] = []
  for (const item of items) {
    const line = lines.at(-1)
    if (line && Math.abs((line[0]?.y ?? item.y) - item.y) <= SAME_LINE) line.push(item)
    else lines.push([item])
  }
  for (const line of lines) line.sort((left, right) => left.x - right.x)
  return lines
}

function anchorsOf(xs: readonly number[]) {
  const sorted = [...xs].sort((left, right) => left - right)
  const groups: number[][] = []
  for (const x of sorted) {
    const group = groups.at(-1)
    if (group && x - (group.at(-1) ?? x) <= COLUMN_GAP) group.push(x)
    else groups.push([x])
  }
  return groups.map((group) => Math.min(...group))
}

function columnOf(x: number, anchors: readonly number[]) {
  let best = 0
  let distance = Number.POSITIVE_INFINITY
  anchors.forEach((anchor, index) => {
    const delta = Math.abs(anchor - x)
    if (delta < distance) {
      distance = delta
      best = index
    }
  })
  return best
}

function columnsMatch(tableAnchors: readonly number[], bandAnchors: readonly number[]) {
  return bandAnchors.every((x) => tableAnchors.some((anchor) => Math.abs(anchor - x) <= ANCHOR_MATCH))
}

function cellText(value: string) {
  return value.replace(/\|/g, '/').replace(/\s+/g, ' ').trim()
}

function markdownTable(rows: string[][]) {
  const width = Math.max(...rows.map((row) => row.length))
  const padded = rows.map((row) => Array.from({ length: width }, (_, index) => row[index] ?? ''))
  const used = padded[0]?.map((_, index) => padded.some((row) => (row[index] ?? '').trim())) ?? []
  const kept = padded.map((row) => row.filter((_, index) => used[index]))
  const header = kept[0] ?? []
  if (header.length < 2) return kept.map((row) => row.filter(Boolean).join(' ')).filter(Boolean).join('\n')
  const line = (cells: readonly string[]) => `| ${cells.map(cellText).join(' | ')} |`
  return [line(header), line(header.map(() => '---')), ...kept.slice(1).map(line)].join('\n')
}

function prose(lines: readonly Line[]) {
  return lines
    .map((line) => {
      let text = ''
      let cursor = 0
      for (const item of line) {
        if (text) text += item.x - cursor > 40 ? '    ' : ' '
        text += item.text
        cursor = item.x + item.width
      }
      return text
    })
    .filter(Boolean)
    .join('\n')
}

/** A long underscored line or a sentence is a form field, not a cell. */
function formCell(text: string) {
  const value = text.trim()
  if (!value) return false
  if (/_{3,}/.test(value)) return true
  return value.length > 36
}

/**
 * A grid is a table when it has a row of short labels, or short values under a text column.
 * Two columns of sentences or signature lines are prose.
 */
function isTable(rows: string[][]) {
  const filled = rows.map((row) => row.map((cell) => cell.trim()).filter(Boolean)).filter((row) => row.length > 0)
  if (filled.length === 0) return false
  const header = filled[0] ?? []
  const labels = header.length >= 2 && header.every((cell) => cell.length <= 36 && !/_{3,}/.test(cell))
  const body = labels ? filled.slice(1) : filled
  if (body.length === 0) return labels
  if (body.every((row) => row.every(formCell)) && !labels) return false
  if (labels) return true
  return body.some((row) => row.slice(1).some((cell) => cell.length > 0 && cell.length <= 24 && !/_{3,}/.test(cell)))
}

/** A run that crosses the next column of an open table is not a cell of that table. */
function fitsColumns(lines: readonly Line[], anchors: readonly number[]) {
  return lines.every((line) =>
    line.every((item) => {
      const next = anchors[columnOf(item.x, anchors) + 1]
      return next == null || item.x + item.width <= next + 12
    }),
  )
}

type Grid = { anchors: number[]; rows: string[][] }

function rowsOn(lines: readonly Line[], anchors: readonly number[]) {
  const rows: string[][] = []
  let current = anchors.map(() => '')
  let previousY = lines[0]?.[0]?.y ?? 0
  const commit = () => {
    if (current.some((cell) => cell.trim())) rows.push(current)
    current = anchors.map(() => '')
  }
  for (const line of lines) {
    const y = line[0]?.y ?? previousY
    const gap = previousY - y
    const placed = line.map((item) => ({ text: item.text, column: columnOf(item.x, anchors) }))
    const overlaps = placed.filter((entry) => current[entry.column]?.trim()).length
    if (current.some((cell) => cell.trim()) && gap >= 16 && overlaps >= 2) commit()
    for (const entry of placed) {
      current[entry.column] = current[entry.column] ? `${current[entry.column]} ${entry.text}` : entry.text
    }
    previousY = y
  }
  commit()
  return rows
}

function gridOf(lines: readonly Line[]): Grid | null {
  const anchors = anchorsOf(lines.flatMap((line) => line.map((item) => item.x)))
  if (anchors.length < 2) return null
  const rows = rowsOn(lines, anchors)
  return rows.length > 0 ? { anchors, rows } : null
}

type Carry = { anchors: number[]; header: string[] }

function layoutOne(runs: readonly PdfRun[], incoming: Carry | null) {
  const lines = linesOf(runs)
  const bands: { gap: number; lines: Line[] }[] = []
  for (const line of lines) {
    const previous = bands.at(-1)
    const gap = previous ? (previous.lines.at(-1)?.[0]?.y ?? 0) - (line[0]?.y ?? 0) : 0
    if (!previous || gap >= ROW_GAP) bands.push({ gap, lines: [line] })
    else previous.lines.push(line)
  }
  const blocks: string[] = []
  let table: Grid | null = null
  let carried: Carry | null = incoming
  const flush = () => {
    if (!table) return
    let chunk: string[][] = []
    const flushChunk = () => {
      if (chunk.length === 0) return
      blocks.push(markdownTable(chunk))
      chunk = []
    }
    for (const row of table.rows) {
      const filled = row.map((cell) => cell.trim()).filter(Boolean)
      if (filled.length > 0 && filled.every((cell) => /_{3,}/.test(cell))) {
        flushChunk()
        blocks.push(filled.join('    '))
      } else chunk.push(row)
    }
    flushChunk()
    table = null
  }
  for (const band of bands) {
    const grid = gridOf(band.lines)
    const proseBand = () => {
      flush()
      const text = prose(band.lines)
      if (text) blocks.push(text)
    }
    if (!grid || !isTable(grid.rows)) {
      proseBand()
      continue
    }
    if (table && band.gap <= STITCH_GAP && columnsMatch(table.anchors, grid.anchors) && fitsColumns(band.lines, table.anchors)) {
      table.rows.push(...rowsOn(band.lines, table.anchors))
      continue
    }
    if (!table && carried && columnsMatch(carried.anchors, grid.anchors) && fitsColumns(band.lines, carried.anchors)) {
      const rows = rowsOn(band.lines, carried.anchors)
      if (isTable(rows)) {
        table = { anchors: carried.anchors, rows: [carried.header, ...rows] }
        carried = null
        continue
      }
    }
    carried = null
    flush()
    table = grid
  }
  const carry = table ? { anchors: table.anchors, header: [...(table.rows[0] ?? [])] } : null
  flush()
  return { text: blocks.filter(Boolean).join('\n\n'), carry }
}

/** A text PDF keeps prose as lines and turns aligned columns into a Markdown table. */
export function layoutPdfPage(runs: readonly PdfRun[]) {
  return layoutOne(runs, null).text
}

/** Pages stay pages. A table that runs onto the next page keeps the columns it started with. */
export function layoutPdfPages(pages: readonly (readonly PdfRun[])[]) {
  let carry: Carry | null = null
  const texts: string[] = []
  for (const page of pages) {
    const laid = layoutOne(page, carry)
    texts.push(laid.text)
    carry = laid.carry
  }
  return texts.join('\f')
}
