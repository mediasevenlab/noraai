import { expect, test } from 'bun:test'

import { readTenderProList } from './read-tenders'

test('an open tender becomes a card and an error stays a message', () => {
  const notices = readTenderProList(JSON.stringify([
    {
      id: 144276,
      title: 'Поставка кабеля',
      company_name: 'Завод',
      open_date: '19.11.2026',
      close_date: '01.12.2026',
    },
  ])).notices
  expect(notices).toEqual([
    {
      law: 'Tender.pro',
      status: 'Приём предложений',
      number: '144276',
      object: 'Поставка кабеля',
      customer: 'Завод',
      price: '',
      published: '19.11.2026',
      updated: '',
      deadline: '01.12.2026',
      url: 'https://www.tender.pro/view_tender.shtml?tenderid=144276',
    },
  ])
  expect(readTenderProList('{"error":{"message":"Нет доступа"}}').error).toBe('Нет доступа')
})
