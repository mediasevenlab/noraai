export type TextHit = { index: number; start: number }

export function findHits(texts: readonly string[], query: string): TextHit[] {
  const needle = query.trim().toLowerCase()
  if (!needle) return []
  const hits: TextHit[] = []
  texts.forEach((text, index) => {
    const hay = text.toLowerCase()
    let from = 0
    while (from < hay.length) {
      const at = hay.indexOf(needle, from)
      if (at < 0) break
      hits.push({ index, start: at })
      from = at + needle.length
    }
  })
  return hits
}

export function findLabel(cursor: number, count: number) {
  if (count <= 0) return '0'
  const safe = ((cursor % count) + count) % count
  return `${safe + 1}/${count}`
}
