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
