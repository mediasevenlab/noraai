import { expect, test } from 'bun:test'

import { markedLines, pageDiff, pdfPages, sheetRowCells, sheetTabs, tableCells, takePieces, workbookPages } from './sheets'

test('a workbook is one page per sheet and the pages still add up', () => {
  const text = 'Лист «РС»\n| N | Имя |\n| --- | --- |\n| 1 | Кронштейн |\n\nЛист «Форма 12»\n| Смета | 10 |\n'
  const pages = workbookPages(text)
  expect(pages.map((page) => page.title)).toEqual(['РС', 'Форма 12'])
  expect(pages.map((page) => page.text).join('')).toBe(text)
})

test('a text pdf keeps a page per form feed', () => {
  const pages = pdfPages('Первая\fВторая')
  expect(pages).toHaveLength(2)
  expect(pages.map((page) => page.text).join('')).toBe('Первая\fВторая')
  expect(pdfPages('Без разрыва')).toEqual([{ title: '', text: 'Без разрыва' }])
})

test('a page takes only its own characters from the diff', () => {
  const taken = takePieces(
    [
      { kind: 'same', text: 'Лист «РС»\n' },
      { kind: 'removed', text: 'старое' },
      { kind: 'added', text: 'новое' },
    ],
    'Лист «РС»\n'.length,
  )
  expect(taken.page.map((piece) => piece.text).join('')).toBe('Лист «РС»\n')
  expect(taken.rest.map((piece) => piece.kind)).toEqual(['removed', 'added'])
})

test('a named sheet is compared with the sheet of the same name', () => {
  const left = 'Лист «РС»\n| 1 |\n\nЛист «Форма 12»\n| 10 |\n'
  const right = 'Лист «РС»\n| 2 |\n\nЛист «Форма 12»\n| 10 |\n'
  const leftPages = workbookPages(left)
  const rightPages = workbookPages(right)
  const first = pageDiff(leftPages, rightPages, 0)
  const second = pageDiff(leftPages, rightPages, 1)
  expect(first.some((piece) => piece.kind !== 'same')).toBe(true)
  expect(second.every((piece) => piece.kind === 'same')).toBe(true)
  expect(second.map((piece) => piece.text).join('')).toContain('Форма 12')
  expect(second.map((piece) => piece.text).join('')).not.toContain('Лист «РС»')
})

test('the second file marks changed sheets and keeps a sheet that only one side has', () => {
  const left = 'Лист «А»\n| 1 |\n\nЛист «Б»\n| 10 |\n\nЛист «В»\nбыло\n'
  const right = 'Лист «А»\n| 1 |\n\nЛист «В»\nстало дома\n\nЛист «Г»\n| 9 |\n'
  const tabs = sheetTabs(workbookPages(left), workbookPages(right))
  expect(tabs.map((tab) => tab.title)).toEqual(['А', 'Б', 'В', 'Г'])
  expect(tabs.find((tab) => tab.title === 'А')?.kinds).toEqual([])
  expect(tabs.find((tab) => tab.title === 'Б')?.kinds).toEqual(['removed'])
  expect(tabs.find((tab) => tab.title === 'Б')?.rightIndex).toBeNull()
  expect(tabs.find((tab) => tab.title === 'В')?.kinds).toEqual(['removed', 'changed', 'added'])
  expect(tabs.find((tab) => tab.title === 'Г')?.kinds).toEqual(['added'])
  expect(tabs.find((tab) => tab.title === 'Г')?.leftIndex).toBeNull()
})

test('a lone sheet value spans the row instead of sitting in the first column', () => {
  const appendix = Array.from({ length: 15 }, () => '')
  appendix[12] = 'Приложение № 5 к приказу ФАС России'
  expect(sheetRowCells(appendix, false)).toEqual([
    { text: 'Приложение № 5 к приказу ФАС России', span: 15, align: 'right' },
  ])
  const title = Array.from({ length: 15 }, () => '')
  title[0] = 'Протокол (Согласование) цены'
  expect(sheetRowCells(title, false)).toEqual([{ text: 'Протокол (Согласование) цены', span: 15, align: 'center' }])
  const note = Array.from({ length: 15 }, () => '')
  note[0] = '1 Согласование прогнозной цены — в случае проведения процедуры определения прогнозной цены.'
  expect(sheetRowCells(note, true)[0]).toMatchObject({ span: 15, align: 'left' })
  expect(sheetRowCells(['1', 'Кронштейн', 'шт'], true)).toEqual([
    { text: '1', span: 1, align: 'left' },
    { text: 'Кронштейн', span: 1, align: 'left' },
    { text: 'шт', span: 1, align: 'left' },
  ])
})

test('a sheet cell keeps a deletion, a change, and an addition', () => {
  const cells = tableCells([
    { kind: 'same', text: '| 1 | ' },
    { kind: 'removed', text: 'старое' },
    { kind: 'changed', text: 'Кронштейн' },
    { kind: 'added', text: ' новое' },
    { kind: 'same', text: ' |' },
  ])
  expect(cells[1]?.map((part) => part.kind)).toEqual(['removed', 'changed', 'added'])
  expect(cells[0]?.map((part) => part.text).join('')).toBe('1')
})

test('a changed sheet row stays one line', () => {
  const lines = markedLines([
    { kind: 'same', text: '| 1 | ' },
    { kind: 'changed', text: 'Кронштейн' },
    { kind: 'same', text: ' |\n' },
  ])
  expect(lines[0]).toEqual({ kind: 'changed', text: '| 1 | Кронштейн |' })
})
