export type ComposerChatRole = 'user' | 'assistant'

export type ComposerChatMessage = {
  role: ComposerChatRole
  text: string
  imageUrl?: string
  imageFilter?: 'grayscale'
}

/** App composer welcome — keep in sync with backend `composerWelcomeMessage('app')`. */
export const COMPOSER_APP_WELCOME_TEXT =
  'Пришлите фото вашего приёма пищи — можно несколько блюд или этикетку продукта. Затем отправьте текст или голосовое сообщение. Если знаете размер или вес порции, укажите их для более точного расчёта.'

/** Keep in sync with backend `composerNoteAnalyzing()`. */
export const COMPOSER_APP_NOTE_ANALYZING_TEXT =
  '📝 Пояснение к фото принято. Считаю КБЖУ…'

/** Keep in sync with backend `composerPhotoContinue(count, 'app')`. */
export function composerAppPhotoAcceptedMessage(count: number) {
  if (count <= 1) {
    return '📷 Фото принято. Можно прислать ещё блюдо или этикетку, затем голос, текст или нажмите отправку.'
  }
  return `📷 Фото ${count}/5. Можно ещё фото блюд или этикетки, затем голос, текст или отправку.`
}

export function mergeComposerChat(
  local: ReadonlyArray<ComposerChatMessage>,
  serverAssistant: ReadonlyArray<{ text: string }>,
): ComposerChatMessage[] {
  const server = serverAssistant.map((message) => message.text)
  const next: ComposerChatMessage[] = []

  for (const message of local) {
    if (message.role === 'user') {
      next.push(message)
      continue
    }
    const incoming = server.shift()
    if (!incoming) {
      next.push(message)
      continue
    }
    next.push({
      role: 'assistant',
      text: incoming,
      ...(message.imageUrl ? { imageUrl: message.imageUrl } : {}),
      ...(message.imageFilter ? { imageFilter: message.imageFilter } : {}),
    })
  }

  for (const text of server) {
    next.push({ role: 'assistant', text })
  }

  return next
}

export function appendAssistantMessage(
  current: ReadonlyArray<ComposerChatMessage>,
  message: ComposerChatMessage,
): ComposerChatMessage[] {
  const last = current.at(-1)
  if (
    last?.role === 'assistant' &&
    last.text === message.text &&
    last.imageUrl === message.imageUrl &&
    last.imageFilter === message.imageFilter
  ) {
    return [...current]
  }
  return [...current, message]
}
