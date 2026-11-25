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

export type TenderJudge = {
  id: 'nora' | 'chatgpt' | 'gemini'
  name: string
  ready: boolean
  ask: (system: string, user: string, signal?: AbortSignal) => Promise<string>
}

function profileText(companies: readonly CompanySearchProfile[]) {
  return companies
    .map((company) => [company.name.trim(), company.prompt.trim()].filter(Boolean).join('\n'))
    .filter(Boolean)
    .join('\n')
    .slice(0, 4000)
}

const RECALL_LIMIT = 16

/** Words that mean the company's own product, not the ordinary nouns in its catalog. */
const ANCHOR_HINTS = [
  'искробезопас',
  'взрывобезопас',
  'неискрящ',
  'безискров',
  'безыскров',
  'омеднен',
  'спредер',
  'спецгаз',
]

const STRONG_ANCHORS = [
  'искробезопас',
  'взрывобезопас',
  'неискрящ',
  'безискров',
  'безыскров',
  'омеднен',
]

/** Product stems the archive should recall. The model, not this list, decides which notices fit. */
const RECALL_HINTS = [
  ...ANCHOR_HINTS,
  'разгон',
  'фланц',
  'бронз',
  'плоскогуб',
  'длинногуб',
  'кусачк',
  'болторез',
  'зубил',
  'напильник',
  'наковальн',
  'кувалд',
  'серповид',
  'вентильн',
  'разводн',
  'крацов',
  'ножниц',
  'отверт',
  'клещ',
  'головк',
  'лопат',
  'молот',
  'топор',
  'щетк',
  'ключ',
  'ворот',
  'шила',
  'ножи',
  'ломы',
  'лом',
]

const RECALL_SKIP = new Set([
  'компан',
  'собствен',
  'линейк',
  'инструмен',
  'ручног',
  'заказч',
  'покупа',
  'заказыва',
  'изготовлен',
  'поставк',
  'описан',
  'номенклатур',
  'исполнен',
  'отдельн',
  'приспособлен',
  'механическ',
  'написа',
  'назван',
  'маркиров',
  'сертификац',
  'материа',
  'площадк',
  'количеств',
  'обязательн',
  'словам',
  'позиц',
  'котор',
])

function hintPresent(text: string, hint: string) {
  if (hint.length >= 6) return text.includes(hint)
  return new RegExp(`(?:^|[^\\p{L}\\p{N}])${hint}`, 'u').test(text)
}

function recallSource(companies: readonly CompanySearchProfile[]) {
  return companies
    .map((company) => {
      const prompt = company.prompt.trim()
      const cut = folded(prompt).search(/не подходит/)
      const kept = cut === -1 ? prompt : prompt.slice(0, cut)
      return kept.trim() || company.name.trim()
    })
    .filter(Boolean)
    .join('\n')
}

/** Short stems for the archive. A prose card is not searched as its first sentences. */
export function companyRecallTerms(companies: readonly CompanySearchProfile[]) {
  const source = recallSource(companies)
  const text = folded(source)
  if (!text) return []
  const hints = RECALL_HINTS.filter((hint) => hintPresent(text, hint))
  const words = text
    .split(/[^\p{L}\p{N}]+/u)
    .map((word) => wordStem(word))
    .filter((stem) => stem.length >= 4 && !RECALL_SKIP.has(stem) && !STOP_WORDS.has(stem))
  const terms = [...new Set([...hints, ...words])].slice(0, RECALL_LIMIT)
  if (terms.length > 0) return terms
  const name = tenderSearchQuery(companies.map((company) => company.name).join(' '))
  return name ? [name.slice(0, 40)] : []
}

/** Anchors a company card insists on. Ordinary catalog nouns do not open the pool by themselves. */
export function companyRequiredPhrases(companies: readonly CompanySearchProfile[]) {
  const text = folded(recallSource(companies))
  if (!text) return []
  const required = ANCHOR_HINTS.filter((hint) => hintPresent(text, hint))
  if (hintPresent(text, 'разгон') && hintPresent(text, 'фланц')) required.push('разгон фланц')
  return required
}

const TOOL_NOUNS = RECALL_HINTS.filter((hint) => !ANCHOR_HINTS.includes(hint) && hint !== 'разгон' && hint !== 'фланц' && hint !== 'бронз')

/** Put notices whose own text names the product ahead of a passing mention. */
export function rankCompanyNotices<T extends { object: string; snippet: string }>(
  notices: readonly T[],
  companies: readonly CompanySearchProfile[],
) {
  const source = folded(recallSource(companies))
  if (!ANCHOR_HINTS.some((hint) => hintPresent(source, hint))) return [...notices]
  const nouns = TOOL_NOUNS.filter((hint) => hintPresent(source, hint))
  return [...notices].sort((left, right) => companyNoticeScore(right, nouns) - companyNoticeScore(left, nouns))
}

function companyNoticeScore(notice: { object: string; snippet: string }, nouns: readonly string[]) {
  const text = folded(`${notice.object}\n${notice.snippet}`)
  const strong = STRONG_ANCHORS.some((hint) => text.includes(hint))
  const noun = text.includes('инструмент') || nouns.some((hint) => text.includes(hint))
  const brand = text.includes('спецгаз') && !text.includes('спецгазов') && !text.includes('газового оборудован')
  let score = 0
  if (strong && noun) score += 10
  else if (strong) score += 2
  if (brand && noun) score += 6
  else if (brand) score += 1
  if (text.includes('разгон') && text.includes('фланц')) score += 8
  return score
}

export const COMPANY_JUDGE_SYSTEM = [
  'Ты отбираешь извещения госзакупок по заданию компании.',
  'Верни только JSON {"picks":[{"number":"номер извещения","reason":"одна короткая фраза"}]}',
  'Бери извещение, если предмет поставки подходит заданию по смыслу, даже другими словами.',
  'Не бери то, что задание прямо исключает, и то, где нужный товар лишь упомянут среди чужого.',
  'Не выдумывай номера. Если ничего не подходит, верни {"picks":[]}. Не больше 12.',
].join(' ')

export function companyJudgeUser(
  companies: readonly CompanySearchProfile[],
  notices: readonly ArchiveTenderNotice[],
) {
  const brief = companies
    .map((company) => [company.name.trim(), company.prompt.trim()].filter(Boolean).join('\n'))
    .filter(Boolean)
    .join('\n\n')
    .slice(0, 4000)
  const lines = notices.slice(0, 16).map((notice, index) => {
    const snippet = notice.snippet.replace(/\s+/g, ' ').trim().slice(0, 240)
    return `${index + 1}. ${notice.number} | ${notice.object.slice(0, 180)} | ${notice.customer.slice(0, 80)} | ${snippet}`
  })
  return `Задание компании:\n${brief}\n\nИзвещения:\n${lines.join('\n')}`
}

export type TenderPick = { number: string; reason: string }

export function parseTenderPicks(text: string, allowed: ReadonlySet<string>) {
  const fromJson = readJsonPicks(text, allowed)
  if (fromJson) return fromJson
  const picks: TenderPick[] = []
  for (const match of text.matchAll(/(\d{8,30})\s*[—–\-:]\s*([^\n]{3,200})/g)) {
    const number = match[1] ?? ''
    if (!allowed.has(number) || picks.some((item) => item.number === number)) continue
    picks.push({ number, reason: cleanReason(match[2] ?? '') || 'подходит по заданию компании' })
    if (picks.length === 12) break
  }
  if (picks.length > 0) return { ok: true as const, picks }
  return { ok: false as const, picks }
}

function readJsonPicks(text: string, allowed: ReadonlySet<string>) {
  const start = text.indexOf('{')
  const end = text.lastIndexOf('}')
  if (start < 0 || end <= start) return null
  try {
    const parsed = JSON.parse(text.slice(start, end + 1)) as { picks?: unknown }
    if (!parsed || !Array.isArray(parsed.picks)) return null
    const picks: TenderPick[] = []
    for (const item of parsed.picks) {
      if (!item || typeof item !== 'object') continue
      const record = item as { number?: unknown; n?: unknown; reason?: unknown; why?: unknown }
      const number = String(record.number ?? record.n ?? '').replace(/\D/g, '')
      if (!allowed.has(number) || picks.some((pick) => pick.number === number)) continue
      picks.push({
        number,
        reason: cleanReason(String(record.reason ?? record.why ?? '')) || 'подходит по заданию компании',
      })
      if (picks.length === 12) break
    }
    return { ok: true as const, picks }
  } catch {
    return null
  }
}

function cleanReason(value: string) {
  return value.replace(/[«»"“”]/g, '').replace(/\s+/g, ' ').trim().slice(0, 180)
}

export function seenNoticeTrailer(numbers: readonly string[]) {
  const unique = [...new Set(numbers.filter((number) => /^\d{8,30}$/.test(number)))].slice(0, 80)
  if (unique.length === 0) return ''
  return `\n\n<!-- seen:${unique.join(',')} -->`
}

export function missingAgentReply(agent: { id: string; name: string }) {
  if (agent.id === 'nora') return 'Локальная модель Нора сейчас не настроена, поэтому отобрать закупки по карточке не получится.'
  return `${agent.name} ещё не подключён: нет ключа API. Отбор закупок по карточке заработает после ключа. Пока можно включить Нору в разделе «ИИ агенты».`
}

export function companyTenderReply(input: {
  names: string
  reviewed: readonly ArchiveTenderNotice[]
  picks: readonly TenderPick[]
  unreadable?: boolean
}) {
  const head = input.names ? `Компании: ${input.names}.\n` : ''
  const seen = seenNoticeTrailer(input.reviewed.map((notice) => notice.number))
  const byNumber = new Map(input.reviewed.map((notice) => [notice.number, notice]))
  const chosen = input.picks.flatMap((pick) => {
    const notice = byNumber.get(pick.number)
    return notice ? [{ notice, reason: pick.reason }] : []
  }).slice(0, CHAT_CARDS)
  if (input.unreadable) {
    return `${head}Агент не смог разобрать выборку. Эти извещения пропущены, можно попросить следующие.${seen}`
  }
  if (chosen.length === 0) {
    const empty = input.reviewed.length === 0
      ? 'По заданию компании в скачанном архиве подходящих извещений не нашлось.'
      : `Просмотрено ${input.reviewed.length} извещений по заданию компании. В этой порции подходящих нет. Можно попросить следующие.`
    return `${head}${empty}${seen}`
  }
  const cards = chosen.map(({ notice, reason }, index) => [
    `**${index + 1}. ${notice.object}**`,
    `${notice.law} № ${notice.number}`,
    notice.customer ? `Заказчик: ${notice.customer}` : '',
    notice.price ? `Цена: ${notice.price}` : '',
    `Почему подходит: ${reason}`,
    notice.parsed
      ? `[Открыть карточку](/app/procurements/${notice.number})`
      : 'Текст ещё разбирается, полная карточка недоступна.',
  ].filter(Boolean).join('\n\n'))
  return `${head}По заданию компании подходят ${chosen.length} из ${input.reviewed.length} просмотренных.\n\n${cards.join('\n\n---\n\n')}${seen}`
}

export function shownNoticeNumbers(messages: readonly { role: string; text: string }[]) {
  const numbers = new Set<string>()
  for (const message of messages) {
    if (message.role !== 'assistant') continue
    for (const match of message.text.matchAll(/(?:№\s*|\/app\/procurements\/)(\d{10,})/g)) {
      const number = match[1]
      if (number) numbers.add(number)
    }
    for (const match of message.text.matchAll(/<!--\s*seen:([0-9,]+)\s*-->/g)) {
      for (const number of (match[1] ?? '').split(',')) {
        if (/^\d{8,30}$/.test(number)) numbers.add(number)
      }
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
    const terms = profile ? companyRecallTerms(companies) : wordsOf(source)
    return { terms, skip: shownNoticeNumbers(messages), source, exact: false }
  }
  if (profile) {
    return {
      terms: companyRecallTerms(companies),
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
