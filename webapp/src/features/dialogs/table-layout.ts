/** A short prefix row spans the sheet. A full data row keeps every column. */
export function bannerSpans(texts: readonly string[], columns: number): number[] | null {
  if (columns < 2) return null
  const last = texts.reduce((index, value, at) => (value.trim() ? at : index), -1)
  if (last < 0 || last >= columns - 1 || last > 2) return null
  if (texts.slice(0, last + 1).some((value) => !value.trim())) return null
  return Array.from({ length: last + 1 }, (_, index) => (index === last ? columns - last : 1))
}

const COLUMN_MIN = 88
const COLUMN_MAX = 280
const COLUMN_EMPTY = 56

/** A column stays wide enough for its longest word and scrolls when the sheet is wider than the window. */
export function sheetColumnWidths(rows: readonly (readonly string[])[]): number[] {
  const count = Math.max(1, ...rows.map((row) => row.length))
  return Array.from({ length: count }, (_, column) => {
    let longest = 0
    for (const row of rows) {
      const text = (row[column] ?? '').replace(/\s+/g, ' ').trim()
      if (!text) continue
      const word = Math.max(...text.split(' ').map((part) => part.length))
      longest = Math.max(longest, word, Math.min(text.length, 36))
    }
    if (longest === 0) return COLUMN_EMPTY
    return Math.min(COLUMN_MAX, Math.max(COLUMN_MIN, Math.round(longest * 7.4 + 28)))
  })
}

/** Share `width` by the longest text in each column, and stay inside that width. */
export function fitColumnWidths(samples: readonly string[], width: number): number[] {
  const count = Math.max(1, samples.length)
  const safe = Math.max(count, width)
  const weights = Array.from({ length: count }, (_, index) => {
    const length = samples[index]?.trim().length ?? 0
    return Math.min(32, Math.max(3, length || 3))
  })
  const sum = weights.reduce((total, weight) => total + weight, 0)
  const widths = weights.map((weight) => (weight / sum) * safe)
  const drift = safe - widths.reduce((total, value) => total + value, 0)
  widths[widths.length - 1] = (widths[widths.length - 1] ?? 0) + drift
  return widths
}

/** The sheet's own name, from the title rows above the numbers. */
export function tableHeading(rows: readonly (readonly string[])[]): string {
  const lines: string[] = []
  for (const row of rows.slice(0, 4)) {
    const cells = [...new Set(row.map((cell) => cell.replace(/\s+/g, ' ').trim()).filter(Boolean))]
    if (cells.length === 0 || cells.length > 2) break
    if (cells.some((cell) => /\d{3,}/.test(cell.replace(/\s/g, '')) || /^\d+(?:[.,]\d+)?$/.test(cell))) break
    const line = cells.join('. ')
    if (line.length > 90) break
    lines.push(line)
    if (lines.length === 2) break
  }
  const title = lines.join('. ').replace(/\s+\./g, '.').trim()
  return title || 'Таблица'
}

/** A wide sheet fills the screen. A small one stays as wide as it already is in the chat. */
export function modalTableWidth(input: {
  columns: number
  chatWidth: number
  viewport: number
}) {
  const screen = Math.max(320, input.viewport - 32)
  const chat = Math.max(280, input.chatWidth)
  if (input.columns >= 7) return screen
  return Math.min(screen, chat)
}
