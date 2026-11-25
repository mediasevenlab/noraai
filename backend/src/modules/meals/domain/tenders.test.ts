import { expect, test } from 'bun:test'

import { buildNoraChatRequest } from './nora-chat'
import { archiveTenderBlock, asksForMore, companyRecallTerms, companyTenderReply, fallbackTenderTerms, formatTenderNotices, parseTenderPicks, parseTenderSearch, shownNoticeNumbers, tenderSearchQuery, tenderTurn } from './tenders'

const CARD = `
<div class="search-registry-entry-block box-shadow-search-input">
  <div class="registry-entry__header-top__title">44-ФЗ Электронный аукцион</div>
  <div class="registry-entry__header-mid__title">Подача заявок</div>
  <div class="registry-entry__header-mid__number">
    <a href="/epz/order/notice/printForm/view.html?regNumber=0156100010726000075">печать</a>
    <a target="_blank" href="/epz/order/notice/ea20/view/common-info.html?regNumber=0156100010726000075">№ 0156100010726000075</a>
  </div>
  <div class="registry-entry__body-title">Объект закупки</div>
  <div class="registry-entry__body-value">Услуги по техническому обслуживанию зданий</div>
  <div class="registry-entry__body-href">
    <a href="/epz/organization/view/info.html?organizationCode=01561000107">СЛЕДСТВЕННОЕ УПРАВЛЕНИЕ</a>
  </div>
  <div class="price-block__value">991&nbsp;587,00 &#8381;</div>
  <div class="data-block__title">Окончание подачи заявок</div>
  <div class="data-block__value">17.11.2026</div>
</div>
<div class="search-registry-entry-block">
  <div class="registry-entry__body-value"></div>
</div>
`

test('a tender question keeps the subject and drops the command', () => {
  expect(tenderSearchQuery('Найди тендеры на инъекции по укреплению оснований в Норильске')).toBe(
    'инъекции укреплению оснований Норильске',
  )
  expect(tenderSearchQuery('Повтори поиск тендеров на укрепление основания')).toBe('укрепление основания')
})

test('a public EIS card keeps the notice link, not the print form', () => {
  const [notice] = parseTenderSearch(CARD)
  expect(notice).toMatchObject({
    law: '44-ФЗ Электронный аукцион',
    status: 'Подача заявок',
    number: '0156100010726000075',
    object: 'Услуги по техническому обслуживанию зданий',
    customer: 'СЛЕДСТВЕННОЕ УПРАВЛЕНИЕ',
    deadline: '17.11.2026',
    url: 'https://zakupki.gov.ru/epz/order/notice/ea20/view/common-info.html?regNumber=0156100010726000075',
  })
  expect(notice?.price).toContain('991')
  expect(notice?.price).toContain('₽')
  const text = formatTenderNotices(parseTenderSearch(CARD), 'укрепление основания')
  expect(text).toContain('Коммерческих площадок здесь нет')
  expect(text).toContain('https://zakupki.gov.ru/epz/order/notice/ea20/view/common-info.html?regNumber=0156100010726000075')
  expect(text).not.toContain('printForm')
})

test('the tender button tells the model to stay with the EIS cards', () => {
  const request = buildNoraChatRequest(
    [{ role: 'user', text: 'инъекции в Норильске' }],
    { text: 'nora', vision: 'nora-vision', tenders: true },
  )
  expect(String(request.messages[0]?.content)).toContain('Кнопка закупок включена')
})

test('a follow-up keeps the first request and skips notices already named', () => {
  const messages = [
    { role: 'user', text: 'Найди тендеры на инъекции по укреплению оснований' },
    { role: 'assistant', text: 'Нашлось 3. № 0156100010726000075 [карточка](/app/procurements/0156100010726000075)' },
    { role: 'user', text: 'Покажи следующие' },
  ]
  expect(asksForMore('Покажи следующие')).toBe(true)
  expect(fallbackTenderTerms(messages)).toEqual(['инъекции', 'укреплению', 'оснований'])
  expect(shownNoticeNumbers(messages)).toEqual(['0156100010726000075'])
  const block = archiveTenderBlock({
    total: 3,
    notices: [{
      number: '0156100010726000099',
      law: '44-ФЗ',
      object: 'Укрепление основания',
      customer: 'Завод',
      price: '100 ₽',
      parsed: true,
      snippet: 'инъекция раствора',
    }],
  })
  expect(block).toContain('По словам нашлось 3')
  expect(block).toContain('/app/procurements/0156100010726000099')
})

test('selected companies set the search, and a later ask skips cards already shown', () => {
  const companies = [{ name: 'Промальянс', prompt: 'вывоз медицинских отходов\nобезвреживание' }]
  const first = tenderTurn([{ role: 'user', text: 'Найди актуальные тендеры' }], companies)
  expect(first.exact).toBe(false)
  expect(first.terms).toContain('выво')
  expect(first.terms).toContain('обезвреживан')
  expect(first.terms.every((term) => !term.includes(' '))).toBe(true)
  expect(first.skip).toEqual([])
  const next = tenderTurn([
    { role: 'user', text: 'Найди актуальные тендеры' },
    { role: 'assistant', text: '№ 32515573734' },
    { role: 'user', text: 'покажи новые' },
  ], companies)
  expect(next.skip).toEqual(['32515573734'])
  expect(next.terms).toContain('выво')
  const numbered = tenderTurn([{ role: 'user', text: 'тендер 32515573734' }], companies)
  expect(numbered.exact).toBe(true)
  expect(numbered.terms).toEqual(['32515573734'])
})

test('a company card is recalled by stems, and the model keeps only the notices it accepts', () => {
  const prompt = [
    'Компания СПЕЦГАЗ. Искробезопасный и неискрящий инструмент, ключи и клещи.',
    'Отдельно: разгонщики фланцев механические.',
    'Не подходит поставка газов и обычный абразивный инструмент.',
  ].join('\n')
  const companies = [{ name: 'СПЕЦГАЗ', prompt }]
  const turn = tenderTurn([{ role: 'user', text: 'Дай подходящие тендеры' }], companies)
  expect(companyRecallTerms(companies)).toEqual(turn.terms)
  expect(turn.terms.some((term) => term.startsWith('искробезопас'))).toBe(true)
  expect(turn.terms).toContain('разгон')
  expect(turn.terms).toContain('фланц')
  expect(turn.terms.join(' ')).not.toContain('абразив')
  expect(turn.terms.every((term) => !term.includes(' '))).toBe(true)
  expect(turn.terms.join(' ')).not.toContain('подходящ')
  const notices = [
    {
      number: '32515573734',
      law: '223-ФЗ',
      object: 'Поставка клещей взрывобезопасных',
      customer: 'Завод',
      price: '10 ₽',
      parsed: true,
      snippet: '',
    },
    {
      number: '32515573735',
      law: '44-ФЗ',
      object: 'Поставка технического газа',
      customer: 'Центр',
      price: '20 ₽',
      parsed: true,
      snippet: 'пропан',
    },
  ]
  const parsed = parseTenderPicks(
    '{"picks":[{"number":"32515573734","reason":"клещи для взрывоопасной зоны"},{"number":"999","reason":"чужой"}]}',
    new Set(notices.map((notice) => notice.number)),
  )
  expect(parsed.ok).toBe(true)
  expect(parsed.picks).toEqual([{ number: '32515573734', reason: 'клещи для взрывоопасной зоны' }])
  const block = companyTenderReply({ names: 'СПЕЦГАЗ', reviewed: notices, picks: parsed.picks })
  expect(block).toContain('Почему подходит: клещи для взрывоопасной зоны')
  expect(block).not.toContain('Поставка технического газа')
  expect(block).toContain('<!-- seen:32515573734,32515573735 -->')
  expect(block).toContain('[Открыть карточку](/app/procurements/32515573734)')
  const followed = shownNoticeNumbers([{ role: 'assistant', text: block }])
  expect(followed).toEqual(['32515573734', '32515573735'])
})

test('a notice number starts a new lookup and does not keep the previous topic', () => {
  const turn = tenderTurn([
    { role: 'user', text: 'нужны тендеры по ключ рожковый' },
    { role: 'assistant', text: 'Нашлось 2. № 32515551237' },
    { role: 'user', text: 'нужен тендер 32515573734' },
  ])
  expect(turn.exact).toBe(true)
  expect(turn.terms).toEqual(['32515573734'])
  expect(turn.skip).toEqual([])
})

test('an empty EIS page says there are no open notices', () => {
  expect(formatTenderNotices([], 'инъекции')).toContain('нет открытых извещений')
})
