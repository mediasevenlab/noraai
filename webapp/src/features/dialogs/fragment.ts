export type FragmentQuote = {
  text: string
  messageId: string
}

/** The selection bar asks the chat composer to keep a passage as a block. */
export const COMPOSER_FRAGMENT_EVENT = 'nora-composer-fragment'

/** A quote block asks the thread to show the passage where it was taken. */
export const REVEAL_FRAGMENT_EVENT = 'nora-reveal-fragment'

const COMPARE_QUOTE = 'compare:'

export type CompareSide = 'left' | 'right'

/** A passage taken inside one comparison page. A chat selection stays a plain message id. */
export function compareQuoteMessageId(messageId: string, side: CompareSide | null = null) {
  if (side) return `${COMPARE_QUOTE}${side}:${messageId}`
  return `${COMPARE_QUOTE}${messageId}`
}

export function quoteOrigin(messageId: string): {
  source: 'chat' | 'compare'
  messageId: string
  side: CompareSide | null
} {
  if (messageId.startsWith(`${COMPARE_QUOTE}left:`)) {
    return { source: 'compare', messageId: messageId.slice(`${COMPARE_QUOTE}left:`.length), side: 'left' }
  }
  if (messageId.startsWith(`${COMPARE_QUOTE}right:`)) {
    return { source: 'compare', messageId: messageId.slice(`${COMPARE_QUOTE}right:`.length), side: 'right' }
  }
  if (messageId.startsWith(COMPARE_QUOTE)) {
    return { source: 'compare', messageId: messageId.slice(COMPARE_QUOTE.length), side: null }
  }
  return { source: 'chat', messageId, side: null }
}

export function readFragmentQuote(event: Event): FragmentQuote | null {
  if (!(event instanceof CustomEvent)) return null
  const detail = event.detail
  if (!detail || typeof detail !== 'object') return null
  const text = 'text' in detail && typeof detail.text === 'string' ? detail.text.trim() : ''
  const messageId = 'messageId' in detail && typeof detail.messageId === 'string' ? detail.messageId : ''
  if (!text) return null
  return { text, messageId }
}

export function quoteFromCustom(custom: Record<string, unknown> | undefined): FragmentQuote | null {
  const quote = custom?.quote
  if (!quote || typeof quote !== 'object') return null
  const text = 'text' in quote && typeof quote.text === 'string' ? quote.text.trim() : ''
  const messageId = 'messageId' in quote && typeof quote.messageId === 'string' ? quote.messageId : ''
  if (!text) return null
  return { text, messageId }
}

/** The model still receives the passage, ahead of the question the person typed. */
export function textWithPassage(text: string, passage: string) {
  const body = text.trim()
  const quote = passage.trim()
  if (!quote) return body
  const block = `«${quote}»`
  return body ? `${block}\n\n${body}` : block
}
