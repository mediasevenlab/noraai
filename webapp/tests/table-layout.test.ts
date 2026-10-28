import { expect, test } from 'bun:test'

import { bannerSpans, fitColumnWidths, modalTableWidth, sheetColumnWidths, tableHeading } from '../src/features/dialogs/table-layout'

test('a title row spans the sheet and a data row keeps its columns', () => {
  expect(bannerSpans(['Смета и расчет', '', '', ''], 4)).toEqual([4])
  expect(bannerSpans(['по', 'ООО Электромагнитные системы', '', ''], 4)).toEqual([1, 3])
  expect(bannerSpans(['№', 'Наименование', '10', '12'], 4)).toBeNull()
  expect(bannerSpans(['1', '', 'Амортизация', ''], 4)).toBeNull()
})

test('the sheet heading is the form name, not the word table', () => {
  expect(
    tableHeading([
      ['Форма № 12', 'Форма № 12', ''],
      ['Смета и расчет', '', ''],
      ['11.16', 'Аренда', '1149032.61'],
    ]),
  ).toBe('Форма № 12. Смета и расчет')
  expect(tableHeading([['11.16', 'Аренда', '1149032.61']])).toBe('Таблица')
  expect(tableHeading([['Название', 'Цена'], ['Яблоко', '50']])).toBe('Название. Цена')
})

test('a wide sheet keeps readable columns instead of squeezing them into the window', () => {
  const widths = sheetColumnWidths([
    ['№', 'Наименование товара, работы, услуги', '', '1149032.61'],
    ['', 'Кронштейн', '', ''],
  ])
  expect(widths[0]).toBeLessThan(widths[1] ?? 0)
  expect(widths[1]).toBeGreaterThan(140)
  expect(widths[1]).toBeLessThanOrEqual(280)
  expect(widths[2]).toBeLessThan(widths[1] ?? 0)
  expect(widths.reduce((sum, width) => sum + width, 0)).toBeGreaterThan(400)
})

test('columns share the screen and a small table keeps the chat width', () => {
  const widths = fitColumnWidths(['№', 'Наименование статей затрат', '10'], 300)
  expect(widths.reduce((sum, width) => sum + width, 0)).toBeCloseTo(300)
  expect(widths[1]).toBeGreaterThan(widths[0] ?? 0)
  expect(modalTableWidth({ columns: 15, chatWidth: 640, viewport: 1440 })).toBe(1408)
  expect(modalTableWidth({ columns: 5, chatWidth: 720, viewport: 1440 })).toBe(720)
})
