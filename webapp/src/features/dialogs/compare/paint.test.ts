import { expect, test } from 'bun:test'

import { compareDocumentTexts } from './diff'
import { locateMarks, pieceAppearance, withBreaks } from './paint'

test('a replacement is marked on the page, after the letterhead', () => {
  const haystack = 'Колонтитул SMART CONTROL\nПёс сидел на окне дома'
  const marks = locateMarks(haystack, compareDocumentTexts('Кот сидел на окне', 'Пёс сидел на окне дома'))
  const dog = haystack.indexOf('Пёс')
  expect(marks).toEqual([
    { type: 'insert', at: dog, text: 'Кот ' },
    { type: 'wrap', start: dog, end: dog + 'Пёс'.length, kind: 'changed' },
    { type: 'wrap', start: haystack.indexOf('дома'), end: haystack.indexOf('дома') + 'дома'.length, kind: 'added' },
  ])
})

test('separate paragraphs still line up with the extracted text', () => {
  const stream = withBreaks(['Пёс сидел на окне', 'Договор действует один год.', 'Срок оплаты — десять дней.'])
  const marks = locateMarks(stream.text, compareDocumentTexts(
    'Кот сидел на окне\nДоговор действует один год.',
    'Пёс сидел на окне\nДоговор действует один год.\nСрок оплаты — десять дней.',
  ))
  expect(marks.some((mark) => mark.type === 'wrap' && mark.kind === 'changed' && stream.text.slice(mark.start, mark.end) === 'Пёс')).toBe(true)
  expect(marks.some((mark) => mark.type === 'wrap' && mark.kind === 'added' && stream.text.slice(mark.start, mark.end).includes('Срок оплаты'))).toBe(true)
  expect(marks.some((mark) => mark.type === 'insert' && mark.text.startsWith('Кот'))).toBe(true)
})

test('a deleted paragraph keeps its line breaks', () => {
  const marks = locateMarks('Дальше', [
    { kind: 'removed', text: 'Замечание классифицируется по предмету.' },
    { kind: 'same', text: '\n\n' },
    { kind: 'removed', text: 'нарушение поточности: пересечение потоков.' },
    { kind: 'same', text: 'Дальше' },
  ])
  expect(marks[0]).toEqual({
    type: 'insert',
    at: 0,
    text: 'Замечание классифицируется по предмету.\n\nнарушение поточности: пересечение потоков.',
  })
})

test('a deleted list stays after the paragraph it followed, not at the next heading', () => {
  const haystack = 'Предписание действует в установленный срок.\nФункционал модуля включает\n:\n•\nсоздание проверки и предписания.\nМодуль «Справочная информация / Новости»'
  const marks = locateMarks(haystack, [
    { kind: 'same', text: 'Предписание действует в установленный срок.\n\n' },
    { kind: 'removed', text: 'Замечание классифицируется по предмету.\n\nнарушение поточности.' },
    { kind: 'same', text: 'Функционал модуля включает:\n\nсоздание проверки и предписания.\n\n' },
    { kind: 'same', text: 'Модуль «Справочная информация / Новости»' },
  ])
  const insert = marks.find((mark) => mark.type === 'insert')
  expect(insert).toEqual({
    type: 'insert',
    at: haystack.indexOf('Функционал'),
    text: 'Замечание классифицируется по предмету.\n\nнарушение поточности.',
  })
})

test('a deleted line is written into the gap in the same type', () => {
  const haystack = 'Первая\nТретья'
  const marks = locateMarks(haystack, compareDocumentTexts('Первая\nВторая\nТретья', 'Первая\nТретья'))
  expect(marks).toEqual([{ type: 'insert', at: haystack.indexOf('Третья'), text: 'Вторая ' }])
})

test('turning a correction off drops a deletion and keeps the new words plain', () => {
  const shown = { removed: false, changed: false, added: true }
  expect(pieceAppearance('removed', shown)).toBe('omit')
  expect(pieceAppearance('changed', shown)).toBe('plain')
  expect(pieceAppearance('added', shown)).toBe('mark')
  expect(pieceAppearance('same', shown)).toBe('plain')
})
