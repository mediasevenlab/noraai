const NOISE = /<(?:[\w.-]+:)?(?:signature|cryptoSigns|printForm)\b[^>]*>[\s\S]*?<\/(?:[\w.-]+:)?(?:signature|cryptoSigns|printForm)>/gi

/** Plain words from a notice XML. Signatures and print forms are not searchable text. */
export function noticeBody(xml: string) {
  const plain = xml
    .replace(NOISE, ' ')
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, ' $1 ')
    .replace(/\s[\w:.-]+="([^"]*)"/g, ' $1 ')
    .replace(/<[^>]+>/g, ' ')
  const text = decode(plain)
    .replace(/\S{81,}/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 400_000)
  return fold(text)
}

/** A short window around the search words. The start of a notice is usually a header. */
export function excerptAround(text: string, needles: readonly string[], radius = 260) {
  const foldedText = fold(text)
  const keys = [...new Set(needles.flatMap((needle) => fold(needle).split(/[^\p{L}\p{N}]+/u).filter((part) => part.length >= 4)))]
  if (keys.length === 0) return cleanWindow(text.slice(0, radius))
  let best = ''
  let bestScore = -1
  for (const key of keys) {
    let from = 0
    for (let hop = 0; hop < 8; hop += 1) {
      const at = foldedText.indexOf(key, from)
      if (at < 0) break
      const window = cleanWindow(text.slice(Math.max(0, at - 70), at + radius))
      const foldedWindow = fold(window)
      const score = keys.reduce((sum, item) => sum + (foldedWindow.includes(item) ? item.length : 0), 0)
      if (score > bestScore) {
        bestScore = score
        best = window
      }
      from = at + key.length
    }
  }
  return best || cleanWindow(text.slice(0, radius))
}

function cleanWindow(text: string) {
  return text.replace(/\s+/g, ' ').trim()
}

/** FTS5 prefix query. One-letter fragments stay on the card search. */
export function noticeMatch(text: string) {
  const tokens = fold(text)
    .split(/[^\p{L}\p{N}]+/u)
    .filter((token) => token.length >= 2)
    .slice(0, 8)
  return tokens.map((token) => `"${token}"*`).join(' ')
}

function fold(text: string) {
  return text.toLocaleLowerCase('ru-RU').replace(/ё/g, 'е')
}

function decode(value: string) {
  return value
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCodePoint(Number(code)))
    .replace(/&amp;/g, '&')
}
