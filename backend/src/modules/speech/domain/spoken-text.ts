const spokenLimit = 8000
const leadLimit = 220
const chunkLimit = 1200

export function spokenText(value: string) {
  const cleaned = value
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`([^`]*)`/g, '$1')
    .replace(/!\[[^\]]*]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]+)]\([^)]*\)/g, '$1')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/^\s*>\s?/gm, '')
    .replace(/^\s*[-*+]\s+/gm, '')
    .replace(/^\s*\d+\.\s+/gm, '')
    .replace(/[*_~]+/g, '')
    .replace(/\|/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  return cleaned.slice(0, spokenLimit)
}

export function speechChunks(text: string) {
  const chunks: string[] = []
  let rest = text.trim()
  let limit = leadLimit
  while (rest.length > limit) {
    const window = rest.slice(0, limit)
    const sentence = Math.max(window.lastIndexOf('. '), window.lastIndexOf('! '), window.lastIndexOf('? '))
    const minBreak = limit === leadLimit ? 40 : 200
    const cut = sentence >= minBreak ? sentence + 1 : limit
    const piece = rest.slice(0, cut).trim()
    if (piece) chunks.push(piece)
    rest = rest.slice(cut).trim()
    limit = chunkLimit
  }
  if (rest) chunks.push(rest)
  return chunks
}
