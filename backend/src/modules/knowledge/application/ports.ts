import type { KnowledgePassage } from '../domain/retrieve'

export type KnowledgeFileRecord = {
  id: string
  name: string
  bytes: number
  createdAt: Date
}

export type KnowledgeBaseRecord = {
  id: string
  name: string
  updatedAt: Date
  files: KnowledgeFileRecord[]
}

export type KnowledgeFileStore = {
  save(fileId: string, bytes: Buffer): Promise<void>
  read(fileId: string): Promise<Buffer | null>
  remove(fileId: string): Promise<void>
}

export type KnowledgeRepository = {
  list(userId: string): Promise<KnowledgeBaseRecord[]>
  create(userId: string, name: string): Promise<KnowledgeBaseRecord>
  rename(userId: string, baseId: string, name: string): Promise<KnowledgeBaseRecord | null>
  findFile(userId: string, fileId: string): Promise<(KnowledgeFileRecord & { baseId: string }) | null>
  remove(userId: string, baseId: string): Promise<boolean>
  addFile(
    userId: string,
    baseId: string,
    file: { name: string; mime: string; bytes: number; chunks: string[] },
  ): Promise<KnowledgeFileRecord | null>
  removeFile(userId: string, fileId: string): Promise<boolean>
  passages(userId: string, baseIds: readonly string[]): Promise<KnowledgePassage[]>
}
