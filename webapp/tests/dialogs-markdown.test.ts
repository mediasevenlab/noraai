import { expect, test } from 'bun:test'

import { prepareDialogMarkdown } from '../src/features/dialogs/markdown-prepare'

test('turns latex brackets into math delimiters and keeps a price', () => {
  const prepared = prepareDialogMarkdown('Площадь \\[S = \\pi r^2\\] стоит $50.')
  expect(prepared).toContain('$$')
  expect(prepared).toContain('S = \\pi r^2')
  expect(prepared).toContain('\\$50')
})

test('keeps a plain line break and leaves a markdown list alone', () => {
  const prepared = prepareDialogMarkdown('Раздел 1. О проекте\nРаздел 2. Руководитель\n\n- аудио\n- видео')
  expect(prepared).toContain('Раздел 1. О проекте  \nРаздел 2. Руководитель')
  expect(prepared).toContain('- аудио\n- видео')
})
