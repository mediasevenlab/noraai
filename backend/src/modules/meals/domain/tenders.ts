export const TENDER_RULE =
  ' Кнопка закупок включена. Блок «Закупки ЕИС» ниже — извещения с сайта zakupki.gov.ru по 44-ФЗ, 223-ФЗ и ПП-615. Отвечай только по этим карточкам: объект, номер, закон, заказчик, цена, срок подачи и ссылка. Не выдумывай закупки и не подменяй способ работ: инъекция раствора и проморозка грунта — разные работы. Если предмет карточки про другую работу, так и скажи, не называй её подходящей. Коммерческих торгов вне ЕИС в списке нет. Если блок говорит, что подходящих извещений нет или ЕИС не отвечает, так и скажи.'

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
