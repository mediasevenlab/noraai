import { expect, test } from 'bun:test'

import { readB2bStatus, readFirmTenders } from './read-tenders'

test('a firm tender becomes a card and a fault stays a message', () => {
  const notices = readFirmTenders(`
    <firm_tender>
      <tender_id>18501</tender_id>
      <common_name>Поставка кабеля</common_name>
      <date_begin>19.11.2026</date_begin>
      <date_unsealing>01.12.2026 10:00</date_unsealing>
      <opened>1</opened>
      <organizer_firm><org_name>Завод</org_name></organizer_firm>
    </firm_tender>
  `)
  expect(notices).toEqual([
    {
      law: 'B2B-Center',
      status: 'Приём предложений',
      number: '18501',
      object: 'Поставка кабеля',
      customer: 'Завод',
      price: '',
      published: '19.11.2026',
      updated: '',
      deadline: '01.12.2026 10:00',
      url: 'https://www.b2b-center.ru/market/view.html?id=18501',
    },
  ])
  expect(readB2bStatus('<error_code>1</error_code><error_message>Нет доступа</error_message>').message).toBe('Нет доступа')
})
