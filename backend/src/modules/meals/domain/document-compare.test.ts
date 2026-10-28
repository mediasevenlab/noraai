import { expect, test } from 'bun:test'

import { clipCompareSide, documentComparePrompt } from './document-compare'

test('the compare prompt names both files and keeps a long text inside the model window', () => {
  const prompt = documentComparePrompt({
    leftName: 'Было.docx',
    leftText: 'а'.repeat(6000),
    rightName: 'Стало.docx',
    rightText: 'Новый срок — 10 дней.',
  })
  expect(prompt).toContain('Первый документ «Было.docx»')
  expect(prompt).toContain('Второй документ «Стало.docx»')
  expect(prompt).toContain('Новый срок — 10 дней.')
  expect(clipCompareSide('а'.repeat(6000)).endsWith('…')).toBe(true)
  expect(prompt.length).toBeLessThan(12_000)
})
