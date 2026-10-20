import type { ParsedTelegramMedia, ParsedTelegramPost } from '../domain/telegram-page'

export type StoredNewsPost = {
  id: string
  userId: string
  channelHandle: string
  telegramPostId: number
  text: string
  postedAt: Date
  media: ParsedTelegramMedia[]
}

export type NewsStore = {
  list(userId: string): Promise<StoredNewsPost[]>
  existing(userId: string, handles: string[]): Promise<Map<string, StoredNewsPost>>
  create(userId: string, post: ParsedTelegramPost): Promise<StoredNewsPost>
  update(id: string, post: ParsedTelegramPost): Promise<void>
  find(id: string): Promise<StoredNewsPost | null>
  delete(userId: string, id: string): Promise<void>
  deleteChannel(userId: string, handle: string): Promise<number>
}

export type TelegramChannelSource = {
  loadRecent(handle: string, since: Date): Promise<ParsedTelegramPost[]>
  openMedia(url: string, range?: string): Promise<Response>
}

export function newsPostKey(handle: string, telegramPostId: number) {
  return `${handle.toLowerCase()}/${telegramPostId}`
}
