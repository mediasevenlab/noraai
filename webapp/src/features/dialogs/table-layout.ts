/** A short prefix row spans the sheet. A full data row keeps every column. */
export function bannerSpans(texts: readonly string[], columns: number): number[] | null {
  if (columns < 2) return null
  const last = texts.reduce((index, value, at) => (value.trim() ? at : index), -1)
  if (last < 0 || last >= columns - 1 || last > 2) return null
  if (texts.slice(0, last + 1).some((value) => !value.trim())) return null
  return Array.from({ length: last + 1 }, (_, index) => (index === last ? columns - last : 1))
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
