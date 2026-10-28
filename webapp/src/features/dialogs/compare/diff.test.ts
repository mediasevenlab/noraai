import { expect, test } from 'bun:test'

import { compareDocumentTexts } from './diff'

function kinds(left: string, right: string) {
  return compareDocumentTexts(left, right).map((piece) => `${piece.kind}:${piece.text}`)
}

test('an unchanged document stays plain', () => {
  expect(kinds('Абзац один.\nАбзац два.', 'Абзац один.\nАбзац два.')).toEqual([
    'same:Абзац один.\nАбзац два.',
  ])
})

test('a new phrase is green, a removed phrase is red, and a replacement is blue', () => {
  const pieces = compareDocumentTexts('Кот сидел на окне', 'Пёс сидел на окне дома')
  expect(pieces).toEqual([
    { kind: 'removed', text: 'Кот' },
    { kind: 'changed', text: 'Пёс' },
    { kind: 'same', text: ' сидел на окне' },
    { kind: 'added', text: ' дома' },
  ])
})

test('a deleted line stays visible as removed text', () => {
  const pieces = compareDocumentTexts('Первая\nВторая\nТретья', 'Первая\nТретья')
  expect(pieces.some((piece) => piece.kind === 'removed' && piece.text.includes('Вторая'))).toBe(true)
  const right = pieces
    .filter((piece) => piece.kind !== 'removed')
    .map((piece) => piece.text)
    .join('')
  expect(right).toBe('Первая\nТретья')
})
