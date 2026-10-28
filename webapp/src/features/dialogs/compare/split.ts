/** A drag past this share of the row folds that side into the rail. */
export const SPLIT_EDGE = 0.1

export type SplitMove = { collapse: 'left' | 'right' } | { split: number }

/** `clientX` is compared with the row that holds both documents. */
export function splitAt(clientX: number, bounds: { left: number; width: number }, edge = SPLIT_EDGE): SplitMove {
  if (bounds.width <= 0) return { split: 0.5 }
  const ratio = (clientX - bounds.left) / bounds.width
  if (ratio <= edge) return { collapse: 'left' }
  if (ratio >= 1 - edge) return { collapse: 'right' }
  return { split: ratio }
}

export function nudgeSplit(split: number, delta: number, edge = SPLIT_EDGE): SplitMove {
  return splitAt(split + delta, { left: 0, width: 1 }, edge)
}
