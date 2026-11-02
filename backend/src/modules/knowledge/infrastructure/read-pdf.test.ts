import { expect, test } from 'bun:test'

import { layoutPdfPage, layoutPdfPages, type PdfRun } from './read-pdf'

function run(str: string, x: number, y: number, width?: number): PdfRun {
  return { str, x, y, width }
}

test('aligned columns become one markdown table', () => {
  const text = layoutPdfPage([
    run('Наименование', 60, 200),
    run('Количество', 190, 200),
    run('Телега', 20, 150),
    run('1', 200, 150),
    run('Печь', 20, 100),
    run('2', 200, 108),
    run('удлиненная', 20, 88),
  ])
  expect(text).toContain('| Наименование | Количество |')
  expect(text).toContain('| Телега | 1 |')
  expect(text).toContain('| Печь удлиненная | 2 |')
})

test('a heading above the grid stays a paragraph', () => {
  const text = layoutPdfPage([
    run('Перечень БКО', 40, 300),
    run('Наименование', 60, 180),
    run('Количество', 190, 180),
    run('Телега', 20, 130),
    run('1', 200, 130),
  ])
  expect(text.startsWith('Перечень БКО')).toBe(true)
  expect(text).toContain('| Телега | 1 |')
})

test('a header and the values under it stay two rows', () => {
  const text = layoutPdfPage([
    run('Авиакомпания', 30, 200),
    run('Рейс', 200, 200),
    run('Сибирь', 42, 167),
    run('S7 5119', 208, 167),
  ])
  expect(text).toContain('| Авиакомпания | Рейс |')
  expect(text).toContain('| Сибирь | S7 5119 |')
})

test('a note stays in its own column when the quantity is empty', () => {
  const text = layoutPdfPage([
    run('Наименование', 60, 200),
    run('Количество', 190, 200),
    run('Примечание', 400, 200),
    run('Телега', 20, 155),
    run('1', 200, 155),
    run('Печь', 20, 110),
    run('горячая', 410, 110),
  ])
  expect(text).toContain('| Печь |  | горячая |')
})

test('a table that runs onto the next page keeps its columns', () => {
  const text = layoutPdfPages([
    [
      run('Наименование', 60, 200),
      run('Количество', 190, 200),
      run('Примечание', 400, 200),
      run('Телега', 20, 155),
      run('1', 200, 155),
    ],
    [run('Печь', 22, 700), run('горячая', 410, 700)],
  ])
  const pages = text.split('\f')
  expect(pages).toHaveLength(2)
  expect(pages[1]).toContain('| Наименование | Количество | Примечание |')
  expect(pages[1]).toContain('| Печь |  | горячая |')
})

test('signature lines under a table stay text beside each other', () => {
  const text = layoutPdfPage([
    run('Наименование', 60, 400),
    run('Количество', 190, 400),
    run('Примечание', 400, 400),
    run('Вилка десертная', 23, 300, 142),
    run('1', 217, 288, 6),
    run('Сдал экспедитор_________________________', 15, 240, 236),
    run('Принял б/п______________________________', 298, 240, 238),
    run('Сдал б/п________________________________', 15, 210, 236),
    run('Принял экспедитор_______________________', 298, 210, 238),
  ])
  expect(text).toContain('| Вилка десертная | 1 |')
  const sign = text.split('\n').find((line) => line.includes('Сдал экспедитор'))
  expect(sign?.startsWith('|')).toBe(false)
  expect(sign).toContain('Принял б/п')
  expect(text).toContain('Принял экспедитор')
})

test('two columns of sentences stay text', () => {
  const text = layoutPdfPage([
    run('Левая колонка договора описывает условия поставки', 20, 200, 240),
    run('Правая колонка договора описывает порядок оплаты', 300, 200, 240),
    run('Следующая левая строка продолжает тот же абзац', 20, 176, 230),
    run('Следующая правая строка продолжает тот же абзац', 300, 176, 230),
  ])
  expect(text.includes('|')).toBe(false)
  expect(text).toContain('Левая колонка договора')
  expect(text).toContain('Правая колонка договора')
})

test('a paragraph without columns stays text', () => {
  const text = layoutPdfPage([
    run('Первая строка договора', 20, 100),
    run('продолжается ниже', 20, 80),
  ])
  expect(text.includes('|')).toBe(false)
  expect(text).toContain('Первая строка договора')
  expect(text).toContain('продолжается ниже')
})
