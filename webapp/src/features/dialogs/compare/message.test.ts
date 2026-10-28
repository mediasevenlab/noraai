import { expect, test } from 'bun:test'

import { compareQuoteMessageId, quoteOrigin, readFragmentQuote, textWithPassage } from '../fragment'
import { compareMessageText, readCompareMessage } from './message'

test('a comparison message keeps the document names and the written differences', () => {
  const text = compareMessageText(
    { id: '11111111-1111-4111-8111-111111111111', leftName: 'Договор v1.docx', rightName: 'Договор v2.docx' },
    'Во втором документе добавили срок.',
  )
  expect(readCompareMessage(text)).toEqual({
    id: '11111111-1111-4111-8111-111111111111',
    leftName: 'Договор v1.docx',
    rightName: 'Договор v2.docx',
    summary: 'Во втором документе добавили срок.',
  })
  expect(text.startsWith('\u2063')).toBe(true)
})

test('a selected fragment stays a quote ahead of the question', () => {
  expect(textWithPassage('', 'срок оплаты')).toBe('«срок оплаты»')
  expect(textWithPassage('Что это значит?', 'срок оплаты')).toBe('«срок оплаты»\n\nЧто это значит?')
  expect(readFragmentQuote(new CustomEvent('nora', { detail: { text: ' абзац ', messageId: 'm1' } }))).toEqual({
    text: 'абзац',
    messageId: 'm1',
  })
  expect(readFragmentQuote(new CustomEvent('nora', { detail: { text: '  ' } }))).toBeNull()
  expect(quoteOrigin(compareQuoteMessageId('msg-1', 'right'))).toEqual({
    source: 'compare',
    messageId: 'msg-1',
    side: 'right',
  })
  expect(quoteOrigin(compareQuoteMessageId('msg-1'))).toEqual({ source: 'compare', messageId: 'msg-1', side: null })
  expect(quoteOrigin('msg-1')).toEqual({ source: 'chat', messageId: 'msg-1', side: null })
})
