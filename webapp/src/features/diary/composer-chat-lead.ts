export const COMPOSER_CHAT_LEAD_EMOJIS = ['📷', '🎤', '📝', '⏳', '✅', '❌'] as const

export type ComposerChatLeadEmoji = (typeof COMPOSER_CHAT_LEAD_EMOJIS)[number]

const VARIATION_SELECTOR = '\uFE0F'

export function splitComposerChatLead(text: string): {
  lead: ComposerChatLeadEmoji | null
  body: string
} {
  for (const lead of COMPOSER_CHAT_LEAD_EMOJIS) {
    const withVariant = `${lead}${VARIATION_SELECTOR}`
    if (text.startsWith(withVariant)) {
      return { lead, body: text.slice(withVariant.length).replace(/^\s+/, '') }
    }
    if (text.startsWith(lead)) {
      return { lead, body: text.slice(lead.length).replace(/^\s+/, '') }
    }
  }
  return { lead: null, body: text }
}
