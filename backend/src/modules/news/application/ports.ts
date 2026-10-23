import type { ParsedTelegramMedia, ParsedTelegramPost } from '../domain/telegram-page'

export type ArchivePublication = {
  handle: string
  telegramPostId: number
  chatId: string
  messageIds: number[]
  media: { kind: ParsedTelegramMedia['kind']; fileId: string }[]
}

export type StoredNewsPost = {
  id: string
  userId: string
  channelHandle: string
  telegramPostId: number
  text: string
  postedAt: Date
  media: ParsedTelegramMedia[]
  archiveChatId: string | null
  archiveMessageIds: number[]
  ad: boolean
}

export type NewsPostContent = {
  text: string
  media: ParsedTelegramMedia[]
  archiveChatId: string
  archiveMessageIds: number[]
  ad: boolean
}

export type NewsStore = {
  list(): Promise<StoredNewsPost[]>
  existing(handles: string[]): Promise<Map<string, StoredNewsPost>>
  create(userId: string, post: ParsedTelegramPost, copy: ArchivePublication, ad: boolean): Promise<StoredNewsPost>
  attachArchive(id: string, post: ParsedTelegramPost, copy: ArchivePublication, ad: boolean): Promise<void>
  update(id: string, post: ParsedTelegramPost): Promise<void>
  replaceContent(id: string, content: NewsPostContent): Promise<void>
  find(id: string): Promise<StoredNewsPost | null>
  delete(id: string): Promise<void>
  deleteChannel(handle: string): Promise<number>
}

export type ArchiveEditFile =
  | { kind: ParsedTelegramMedia['kind']; fileId: string }
  | { kind: ParsedTelegramMedia['kind']; url: string }
  | { kind: ParsedTelegramMedia['kind']; bytes: Uint8Array; mime: string }

export type ArchiveEdit = {
  chatId: string | null
  messageIds: number[]
  text: string
  previous: { kind: ParsedTelegramMedia['kind']; fileId: string }[]
  next: ArchiveEditFile[]
}

export type NewsAdClassifier = {
  classify(text: string): Promise<boolean>
}

export type NewsArchive = {
  publish(channels: { handle: string; posts: ParsedTelegramPost[] }[]): Promise<{
    published: ArchivePublication[]
    failed: { handle: string; message: string } | null
  }>
  remove(chatId: string, messageIds: number[]): Promise<void>
  revise(edit: ArchiveEdit): Promise<{
    chatId: string
    messageIds: number[]
    media: { kind: ParsedTelegramMedia['kind']; fileId: string }[]
  }>
  openFile(fileId: string, kind: ParsedTelegramMedia['kind'], range?: string): Promise<Response>
}

export type TelegramChannelSource = {
  loadRecent(handle: string, since: Date): Promise<ParsedTelegramPost[]>
  loadPost(handle: string, telegramPostId: number): Promise<ParsedTelegramPost | null>
  openMedia(url: string, range?: string): Promise<Response>
}

export function newsPostKey(handle: string, telegramPostId: number) {
  return `${handle.toLowerCase()}/${telegramPostId}`
}
