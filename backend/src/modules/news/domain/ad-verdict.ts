/** Reads the model JSON. Anything that is not an explicit ad stays unmarked. */
export function readAdVerdict(raw: string): boolean {
  const trimmed = raw.trim().replace(/^```(?:json)?/i, '').replace(/```$/i, '').trim()
  const start = trimmed.indexOf('{')
  const end = trimmed.lastIndexOf('}')
  if (start < 0 || end <= start) return false
  try {
    const parsed = JSON.parse(trimmed.slice(start, end + 1)) as { ad?: unknown }
    return parsed.ad === true
  } catch {
    return false
  }
}
