import { expect, test } from 'bun:test'

import { parseProcurementSearch } from './read-search'

const CARD = (number: string) => `
<div class="search-registry-entry-block">
  <div class="registry-entry__header-top__title" data-tooltip='<span class="custom-tooltiptext">Электронный аукцион</span>'>44-ФЗ Электронный аукцион</div>
  <a href="/epz/order/notice/printForm/view.html?regNumber=${number}">печать</a>
  <div class="registry-entry__header-mid__number">
    <a href="/epz/order/notice/ea20/view/common-info.html?regNumber=${number}">№ ${number}</a>
  </div>
  <div class="registry-entry__header-mid__title">Подача заявок</div>
  <div class="registry-entry__body-value">Поставка реагентов</div>
  <div class="registry-entry__body-href"><a href="/org">КАМЧАТСКОЕ УПРАВЛЕНИЕ</a></div>
  <div class="price-block__value">1&nbsp;240&nbsp;638,00 &#8381;</div>
  <div class="data-block__title">Размещено</div>
  <div class="data-block__value">13.11.2026</div>
  <div class="data-block__title">Обновлено</div>
  <div class="data-block__value">19.11.2026</div>
  <div class="data-block__title">Окончание подачи заявок</div>
  <div class="data-block__value">25.11.2026</div>
</div>`

test('a public search page becomes ten open notices and skips the print form', () => {
  const html = Array.from({ length: 12 }, (_, index) => CARD(String(100 + index))).join('\n')
  const notices = parseProcurementSearch(html)
  expect(notices).toHaveLength(10)
  expect(notices[0]).toEqual({
    law: '44-ФЗ Электронный аукцион',
    status: 'Подача заявок',
    number: '100',
    object: 'Поставка реагентов',
    customer: 'КАМЧАТСКОЕ УПРАВЛЕНИЕ',
    price: '1 240 638,00 ₽',
    published: '13.11.2026',
    updated: '19.11.2026',
    deadline: '25.11.2026',
    url: 'https://zakupki.gov.ru/epz/order/notice/ea20/view/common-info.html?regNumber=100',
  })
  expect(notices.every((notice) => !notice.url.includes('printForm'))).toBe(true)
})
