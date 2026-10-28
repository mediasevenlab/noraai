const MARK = '\u2063'

export type CompareMessageHead = {
  id: string
  leftName: string
  rightName: string
  summary: string
}

export function compareMessageText(
  input: { id: string; leftName: string; rightName: string },
  summary: string,
) {
  return `${MARK}${JSON.stringify({
    id: input.id,
    leftName: input.leftName,
    rightName: input.rightName,
  })}${MARK}\n${summary}`
}

export function readCompareMessage(text: string): CompareMessageHead | null {
  if (!text.startsWith(MARK)) return null
  const end = text.indexOf(MARK, MARK.length)
  if (end < 0) return null
  try {
    const parsed = JSON.parse(text.slice(MARK.length, end)) as {
      id?: unknown
      leftName?: unknown
      rightName?: unknown
    }
    if (typeof parsed.id !== 'string' || typeof parsed.leftName !== 'string' || typeof parsed.rightName !== 'string') {
      return null
    }
    return {
      id: parsed.id,
      leftName: parsed.leftName,
      rightName: parsed.rightName,
      summary: text.slice(end + MARK.length).replace(/^\n/, ''),
    }
  } catch {
    return null
  }
}
