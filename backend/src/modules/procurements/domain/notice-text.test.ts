import { expect, test } from 'bun:test'

import { noticeBody, noticeMatch } from './notice-text'

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

test('a search phrase becomes a short prefix query', () => {
  expect(noticeMatch('  Масляный трансформатор ')).toBe('"масляный"* "трансформатор"*')
  expect(noticeMatch('"кабель" OR *')).toBe('"кабель"* "or"*')
  expect(noticeMatch('а')).toBe('')
})
