import { expect, test } from 'bun:test'

import { excerptAround, noticeBody, noticeMatch } from './notice-text'

test('notice text keeps positions and drops the signature', () => {
  const body = noticeBody(`
    <commonInfo><purchaseObjectInfo>Поставка ёлок</purchaseObjectInfo></commonInfo>
    <purchaseObject><name>Трансформатор масляный</name><OKPDCode>27.11.4</OKPDCode></purchaseObject>
    <contactEMail>snab@zavod.ru</contactEMail>
    <fileName>чертеж-ввода.pdf</fileName>
    <signature>УНИКАЛЬНАЯПОДПИСЬ</signature>
    <printForm><content>${'A'.repeat(200)}</content></printForm>
  `)
  expect(body).toContain('поставка елок')
  expect(body).toContain('трансформатор масляный')
  expect(body).toContain('snab@zavod.ru')
  expect(body).toContain('чертеж-ввода.pdf')
  expect(body).not.toContain('уникальнаяподпись')
  expect(body).not.toContain('aaaa')
})

test('an excerpt stays on the line that names the searched product', () => {
  const header = 'уровень взрывозащиты взрывобезопасное оборудование '.repeat(40)
  const excerpt = excerptAround(`${header} кувалда искробезопасная омедненная 2 кг`, ['взрывобезопас', 'искробезопас', 'омеднен'])
  expect(excerpt).toContain('кувалда искробезопасная')
  expect(excerpt).toContain('омедненная')
})

test('a search phrase becomes a short prefix query', () => {
  expect(noticeMatch('  Масляный трансформатор ')).toBe('"масляный"* "трансформатор"*')
  expect(noticeMatch('"кабель" OR *')).toBe('"кабель"* "or"*')
  expect(noticeMatch('а')).toBe('')
})
