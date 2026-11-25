export const TENDER_RULE =
  ' Кнопка закупок включена. Блок «Наши закупки» — извещения из скачанного архива. Если в блоке указаны компании, подбирай извещения под их описание и ключевые слова, а не под общие слова просьбы. Число в начале блока — сколько карточек нашлось. Если в последней реплике есть номер извещения, это новый запрос: ответь про эту карточку, даже если раньше искали другое. Если просят следующие, ещё, дальше или новые, продолжай прошлый поиск и не повторяй уже названные номера. Новый предмет вместо номера — тоже новый поиск, не продолжение. Сначала напиши, сколько карточек нашлось. Затем выведи не больше 20. Если в блоке уже есть ссылка Markdown, перенеси её в ответ как есть. Не выдумывай извещения вне блока. Если блок говорит, что карточки нет, так и скажи.'

export type ArchiveTenderNotice = {
  number: string
  law: string
  object: string
  customer: string
  price: string
  parsed: boolean
  snippet: string
}

const CHAT_CARDS = 12

function folded(text: string) {
  return text.toLocaleLowerCase('ru-RU').replace(/ё/g, 'е')
}

function wordStem(word: string) {
  if (word.length <= 4) return word
  return word.slice(0, Math.max(4, word.length - 2))
}

/** Which company phrases are visible in the title, customer, or snippet. */
export function tenderMatchReason(notice: ArchiveTenderNotice, phrases: readonly string[]) {
  const hay = folded(`${notice.object}\n${notice.customer}\n${notice.snippet}`)
  const hits = phrases.filter((phrase) => {
    const foldedPhrase = folded(phrase)
    if (foldedPhrase.length >= 3 && hay.includes(foldedPhrase)) return true
    const words = foldedPhrase.split(/\s+/).filter((word) => word.length >= 4)
    return words.length > 0 && words.every((word) => hay.includes(wordStem(word)))
  })
  if (hits.length > 0) {
    return `Почему подходит: в названии или фрагменте есть «${hits.slice(0, 2).join('», «')}».`
  }
  if (phrases.length > 0) {
    return 'Почему подходит: совпадение есть в полном тексте извещения, в коротком названии его не видно.'
  }
  return ''
}

export function archiveTenderBlock(input: {
  total: number
  notices: readonly ArchiveTenderNotice[]
  phrases?: readonly string[]
}) {
  const notices = input.notices.slice(0, CHAT_CARDS)
  if (notices.length === 0) {
    return input.total === 0
      ? 'По словам из запроса в скачанном архиве карточек нет.'
      : `По словам нашлось ${input.total}, но эта порция уже показана. Следующих в этой выборке нет.`
  }
  const phrases = input.phrases ?? []
  const cards = notices.map((notice, index) => {
    const reason = tenderMatchReason(notice, phrases)
    return [
      `**${index + 1}. ${notice.object}**`,
      `${notice.law} № ${notice.number}`,
      notice.customer ? `Заказчик: ${notice.customer}` : '',
      notice.price ? `Цена: ${notice.price}` : '',
      reason,
      notice.parsed
        ? `[Открыть карточку](/app/procurements/${notice.number})`
        : 'Текст ещё разбирается, полная карточка недоступна.',
    ].filter(Boolean).join('\n\n')
  })
  return `По словам нашлось ${input.total}. Ниже ${notices.length} ближайших.\n\n${cards.join('\n\n---\n\n')}`
}

export function asksForMore(text: string) {
  return /следующ|ещё|еще|другие|дальше|новые/i.test(text)
}

export type CompanySearchProfile = {
  name: string
  prompt: string
}

function profileText(companies: readonly CompanySearchProfile[]) {
  return companies
    .map((company) => [company.name.trim(), company.prompt.trim()].filter(Boolean).join('\n'))
    .filter(Boolean)
    .join('\n')
    .slice(0, 4000)
}

/** Comma and line breaks in a company description are separate search phrases, not one bag of words. */
export function companySearchPhrases(companies: readonly CompanySearchProfile[]) {
  const phrases: string[] = []
  for (const company of companies) {
    const own: string[] = []
    for (const part of company.prompt.split(/[\n,;]+/)) {
      const phrase = tenderSearchQuery(part)
      if (phrase.length >= 3) own.push(phrase)
    }
    if (own.length === 0) {
      const name = tenderSearchQuery(company.name)
      if (name.length >= 3) own.push(name)
    }
    phrases.push(...own)
  }
  return [...new Set(phrases)].slice(0, 8)
}

export function shownNoticeNumbers(messages: readonly { role: string; text: string }[]) {
  const numbers = new Set<string>()
  for (const message of messages) {
    if (message.role !== 'assistant') continue
    for (const match of message.text.matchAll(/(?:№\s*|\/app\/procurements\/)(\d{10,})/g)) {
      const number = match[1]
      if (number) numbers.add(number)
    }
  }
  return [...numbers].slice(0, 80)
}

export function noticeNumbers(text: string) {
  return [...new Set([...text.matchAll(/\d{8,30}/g)].map((match) => match[0]))].slice(0, 8)
}

/** A number starts a new lookup. «Следующие» keeps the earlier request and skips cards already shown. */
export function tenderTurn(
  messages: readonly { role: string; text: string }[],
  companies: readonly CompanySearchProfile[] = [],
) {
  const users = messages.filter((message) => message.role === 'user' && message.text.trim())
  const last = users.at(-1)?.text ?? ''
  const numbers = noticeNumbers(last)
  if (numbers.length > 0) return { terms: numbers, skip: [] as string[], source: last, exact: true }
  const profile = profileText(companies)
  if (asksForMore(last)) {
    const earlier = [...users].reverse().find((message) => message.text !== last && !asksForMore(message.text))
    const earlierText = earlier?.text ?? ''
    const source = [profile, earlierText].filter(Boolean).join('\n') || last
    const terms = profile ? companySearchPhrases(companies) : wordsOf(source)
    return { terms, skip: shownNoticeNumbers(messages), source, exact: false }
  }
  if (profile) {
    return {
      terms: companySearchPhrases(companies),
      skip: [] as string[],
      source: `${profile}\n${last}`.slice(0, 4000),
      exact: false,
    }
  }
  return { terms: wordsOf(last), skip: [] as string[], source: last, exact: false }
}

function wordsOf(text: string) {
  return tenderSearchQuery(text).split(/\s+/).filter((word) => word.length >= 3).slice(0, 8)
}

export function fallbackTenderTerms(messages: readonly { role: string; text: string }[]) {
  const users = messages.filter((message) => message.role === 'user' && message.text.trim())
  const last = users.at(-1)?.text ?? ''
  const earlier = [...users].reverse().find((message) => !asksForMore(message.text))
  const source = asksForMore(last) ? earlier?.text || last : last
  return tenderSearchQuery(source).split(/\s+/).filter((word) => word.length >= 3).slice(0, 8)
}

const STOP_STEMS = [
  'найд',
  'показ',
  'тендер',
  'закупк',
  'повтор',
  'поиск',
  'иска',
  'ищи',
  'хоч',
  'нужн',
  'актуальн',
  'пожалуйст',
  'скаж',
  'откро',
  'подбер',
  'отбер',
  'подходящ',
  'список',
  'как',
  'есть',
  'сейчас',
  'ещ',
  'снова',
]

const STOP_WORDS = new Set([
  'мне',
  'на',
  'по',
  'для',
  'про',
  'о',
  'об',
  'от',
  'из',
  'с',
  'со',
  'к',
  'ко',
  'и',
  'или',
  'а',
  'же',
  'ли',
  'то',
  'это',
  'там',
  'тут',
  'в',
  'во',
  'у',
  'за',
  'до',
  'при',
  'над',
  'под',
  'без',
  'не',
  'ни',
  'да',
  'дай',
  'нет',
  'сайт',
  'сайта',
  'еис',
])

export type TenderNotice = {
  law: string
  status: string
  number: string
  object: string
  customer: string
  price: string
  deadline: string
  url: string
}

/** Words the public EIS search can use. Command chatter stays out of the query. */
export function tenderSearchQuery(text: string) {
  const words = text
    .replace(/[«»"“”]/g, ' ')
    .split(/[^\p{L}\p{N}-]+/u)
    .map((word) => word.trim())
    .filter((word) => {
      if (!word) return false
      const lower = word.toLocaleLowerCase('ru')
      if (STOP_WORDS.has(lower)) return false
      return !STOP_STEMS.some((stem) => lower.startsWith(stem) && lower.length <= stem.length + 6)
    })
  return words.join(' ').slice(0, 180)
}

function decodeHtml(value: string) {
  return value
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;|&#160;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#(\d+);/g, (_, code: string) => {
      const value = Number(code)
      return Number.isFinite(value) ? String.fromCodePoint(value) : ''
    })
    .replace(/\s+/g, ' ')
    .trim()
}

function field(html: string, className: string) {
  const match = html.match(new RegExp(`<div class="[^"]*\\b${className}\\b[^"]*"[^>]*>([\\s\\S]*?)</div>`, 'i'))
  return match ? decodeHtml(match[1] ?? '') : ''
}

function afterTitle(html: string, title: string) {
  const match = html.match(new RegExp(`${title}[\\s\\S]{0,240}?data-block__value">([^<]+)`, 'i'))
  return match ? decodeHtml(match[1] ?? '') : ''
}

export function parseTenderSearch(html: string): TenderNotice[] {
  return html
    .split('search-registry-entry-block')
    .slice(1)
    .map((part): TenderNotice | null => {
      const href = part.match(/href="([^"]*common-info\.html\?regNumber=\d+)"/i)?.[1] ?? ''
      const number = href.match(/regNumber=(\d+)/)?.[1] ?? ''
      const object = field(part, 'registry-entry__body-value')
      if (!number || !object) return null
      const path = href.startsWith('http') ? href : `https://zakupki.gov.ru${href}`
      return {
        law: field(part, 'registry-entry__header-top__title'),
        status: field(part, 'registry-entry__header-mid__title'),
        number,
        object: object.slice(0, 300),
        customer: field(part, 'registry-entry__body-href'),
        price: field(part, 'price-block__value'),
        deadline: afterTitle(part, 'Окончание подачи заявок'),
        url: path,
      }
    })
    .filter((notice): notice is TenderNotice => notice !== null)
    .slice(0, 8)
}

export function formatTenderNotices(notices: readonly TenderNotice[], query: string) {
  const head = 'Только извещения ЕИС: 44-ФЗ, 223-ФЗ и ПП-615. Коммерческих площадок здесь нет.'
  if (notices.length === 0) {
    return `${head}\nПо запросу «${query}» на zakupki.gov.ru сейчас нет открытых извещений.`
  }
  const cards = notices.map((notice, index) => {
    const lines = [
      `${index + 1}. ${notice.object}`,
      [notice.law, notice.status].filter(Boolean).join(' · '),
      `№ ${notice.number}`,
      notice.customer ? `Заказчик: ${notice.customer}` : '',
      notice.price ? `Начальная цена: ${notice.price}` : '',
      notice.deadline ? `Окончание подачи: ${notice.deadline}` : '',
      notice.url,
    ]
    return lines.filter(Boolean).join('\n')
  })
  return `${head}\nПо запросу «${query}»:\n\n${cards.join('\n\n')}`
}
