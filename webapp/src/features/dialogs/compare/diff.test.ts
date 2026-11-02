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

test('a long document keeps one replacement and leaves the other lines plain', () => {
  const lines = Array.from({ length: 1200 }, (_, index) => `Пункт ${index}. Текст без правок.`)
  const changed = lines.slice()
  changed[640] = 'Пункт 640. Текст с новой формулировкой.'
  const pieces = compareDocumentTexts(lines.join('\n'), changed.join('\n'))
  const marked = pieces.filter((piece) => piece.kind !== 'same').map((piece) => piece.text).join('')
  expect(marked).toContain('новой формулировкой')
  expect(marked).not.toContain('Пункт 10.')
  expect(pieces.some((piece) => piece.kind === 'same' && piece.text.includes('Пункт 10.'))).toBe(true)
})

test('different table rows stay on their own lines', () => {
  const left = '| Наименование | Количество |\n| Печь | 2 |\n| Телега | 1 |\n'
  const right = '| Наименование | Количество |\n| Чайник | 3 |\n'
  const pieces = compareDocumentTexts(left, right)
  expect(pieces.some((piece) => piece.text.includes('Печь') && piece.text.includes('Чайник'))).toBe(false)
  expect(pieces.some((piece) => piece.kind === 'removed' && piece.text.includes('Печь'))).toBe(true)
  expect(pieces.some((piece) => piece.kind !== 'removed' && piece.text.includes('Чайник'))).toBe(true)
})

test('a value in one table cell is still a word change', () => {
  const pieces = compareDocumentTexts('| Сибирь | 1 |\n', '| Аэрофлот | 1 |\n')
  expect(pieces.some((piece) => piece.kind === 'removed' && piece.text.includes('Сибирь'))).toBe(true)
  expect(pieces.some((piece) => piece.kind === 'changed' && piece.text.includes('Аэрофлот'))).toBe(true)
})

test('a signature line stays text when a table row is what it stands next to', () => {
  const pieces = compareDocumentTexts(
    '| Контейнер 2/3 S7 | 1 |  |\n| Вкладыш GB,S7 | 1 |  |',
    'Сдал экспедитор_________________________    Принял б/п______________________________',
  )
  const text = pieces.map((piece) => piece.text).join('')
  const line = text.split('\n').find((item) => item.includes('Сдал экспедитор'))
  expect(line?.startsWith('|')).toBe(false)
  expect(text.includes('Контейнерэстафете')).toBe(false)
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
