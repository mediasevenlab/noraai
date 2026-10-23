import { expect, test } from 'bun:test'

import { bannerSpans, fitColumnWidths, modalTableWidth } from '../src/features/dialogs/table-layout'

test('a title row spans the sheet and a data row keeps its columns', () => {
  expect(bannerSpans(['Смета и расчет', '', '', ''], 4)).toEqual([4])
  expect(bannerSpans(['по', 'ООО Электромагнитные системы', '', ''], 4)).toEqual([1, 3])
  expect(bannerSpans(['№', 'Наименование', '10', '12'], 4)).toBeNull()
  expect(bannerSpans(['1', '', 'Амортизация', ''], 4)).toBeNull()
})

test('columns share the screen and a small table keeps the chat width', () => {
  const widths = fitColumnWidths(['№', 'Наименование статей затрат', '10'], 300)
  expect(widths.reduce((sum, width) => sum + width, 0)).toBeCloseTo(300)
  expect(widths[1]).toBeGreaterThan(widths[0] ?? 0)
  expect(modalTableWidth({ columns: 15, chatWidth: 640, viewport: 1440 })).toBe(1408)
  expect(modalTableWidth({ columns: 5, chatWidth: 720, viewport: 1440 })).toBe(720)
})
