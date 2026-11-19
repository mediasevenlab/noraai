export type OpenNotice = {
  law: string
  status: string
  number: string
  object: string
  customer: string
  price: string
  published: string
  updated: string
  deadline: string
  url: string
}

function decodeHtml(value: string) {
  return value
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;|&#160;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#(\d+);/g, (_, code: string) => {
      const point = Number(code)
      return Number.isFinite(point) ? String.fromCodePoint(point) : ''
    })
    .replace(/\s+/g, ' ')
    .trim()
}

function field(html: string, className: string) {
  const match = html.match(new RegExp(`<div class="[^"]*\\b${className}\\b[^"]*"[^>]*>([\\s\\S]*?)</div>`, 'i'))
  return match ? decodeHtml(match[1] ?? '') : ''
}

function dated(html: string, title: string) {
  const match = html.match(new RegExp(`${title}[\\s\\S]{0,240}?data-block__value">([^<]+)`, 'i'))
  return match ? decodeHtml(match[1] ?? '') : ''
}

function noticeUrl(html: string) {
  const href = html.match(/href="([^"]*common-info\.html\?[^"]*regNumber=\d+)"/i)?.[1] ?? ''
  if (!href) return { number: '', url: '' }
  const number = href.match(/regNumber=(\d+)/)?.[1] ?? ''
  const url = href.startsWith('http') ? href : `https://zakupki.gov.ru${href}`
  return { number, url }
}

function withoutTooltips(html: string) {
  return html.replace(/data-tooltip=(?:"[^"]*"|'[^']*')/gi, '')
}

/** One public search page, ten cards. Print forms are not the card link. */
export function parseProcurementSearch(html: string, limit = 10): OpenNotice[] {
  return withoutTooltips(html)
    .split('search-registry-entry-block')
    .slice(1)
    .map((part): OpenNotice | null => {
      const { number, url } = noticeUrl(part)
      const object = field(part, 'registry-entry__body-value')
      if (!number || !object) return null
      return {
        law: field(part, 'registry-entry__header-top__title'),
        status: field(part, 'registry-entry__header-mid__title'),
        number,
        object: object.slice(0, 400),
        customer: field(part, 'registry-entry__body-href'),
        price: field(part, 'price-block__value'),
        published: dated(part, 'Размещено'),
        updated: dated(part, 'Обновлено'),
        deadline: dated(part, 'Окончание подачи заявок'),
        url,
      }
    })
    .filter((notice): notice is OpenNotice => notice !== null)
    .slice(0, limit)
}
