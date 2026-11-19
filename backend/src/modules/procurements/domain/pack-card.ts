const TAG = (name: string) => new RegExp(`<(?:[\\w]+:)?${name}>([^<]+)<`)

export type PackCard = {
  number: string
  object: string
  customer: string
  price: string
  published: string
  deadline: string
  url: string
}

export function readPackCard(xml: string): PackCard {
  const number = tag(xml, ['purchaseNumber', 'registrationNumber'])
  const href = tag(xml, ['href'])
  return {
    number,
    object: tag(xml, ['purchaseObjectInfo', 'subject', 'name']).slice(0, 400),
    customer: tag(xml, ['fullName']).slice(0, 300),
    price: formatPrice(tag(xml, ['maxPrice', 'initialSum', 'maxContractPrice'])),
    published: isoDay(tag(xml, ['publishDTInEIS', 'publicationDateTime'])),
    deadline: tag(xml, ['endDT', 'submissionCloseDateTime', 'applSubmisionEndDate']),
    url: /^https:\/\/zakupki\.gov\.ru\//.test(href)
      ? href
      : `https://zakupki.gov.ru/epz/order/extendedsearch/results.html?searchString=${number}&fz44=on&fz223=on&ppRf615=on`,
  }
}

export function presentDate(value: string) {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}))?/)
  if (!match) return value
  const date = `${match[3]}.${match[2]}.${match[1]}`
  return match[4] ? `${date} ${match[4]}:${match[5]}` : date
}

function tag(xml: string, names: string[]) {
  for (const name of names) {
    const value = decode(xml.match(TAG(name))?.[1]?.trim() ?? '')
    if (value) return value
  }
  return ''
}

function isoDay(value: string) {
  return value.match(/^(\d{4}-\d{2}-\d{2})/)?.[1] ?? ''
}

function formatPrice(value: string) {
  if (!value) return ''
  const [rubles, kopecks = '00'] = value.split('.')
  const grouped = rubles.replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
  return `${grouped},${kopecks.padEnd(2, '0').slice(0, 2)} ₽`
}

function decode(value: string) {
  return value
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCodePoint(Number(code)))
    .replace(/&amp;/g, '&')
}
