/** Same rule as the server: a new photo replaces the meal unless the note asks to add it. */
export function photoAttachKeepsCurrentMeal(message: string) {
  const text = message.toLowerCase().replace(/ё/g, 'е').replace(/\s+/g, ' ').trim()
  if (!text) return false
  if (/не\s+замен/.test(text)) return true
  if (/добав[а-я]*(?:\s+\S+){0,6}\s+к\s+(?:текущ|уже|эт(?:от|ому|им)|существующ)/.test(text)) {
    return true
  }
  if (/добав[а-я]*(?:\s+\S+){0,6}\s+к\s+(?:этому\s+)?прием/.test(text)) return true
  if (/дополн[а-я]*(?:\s+\S+){0,4}\s+(?:этот\s+|текущ[а-я]*\s+|уже\s+)?прием/.test(text)) {
    return true
  }
  if (/дополн[а-я]*(?:\s+\S+){0,3}\s+(?:текущ|этот|уже)/.test(text)) return true
  if (/прибав[а-я]*(?:\s+\S+){0,4}\s+к\s+(?:текущ|прием|уже)/.test(text)) return true
  if (/остав[а-я]*(?:\s+\S+){0,4}\s+добав/.test(text)) return true
  return false
}
