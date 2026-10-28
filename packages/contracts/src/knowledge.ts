import { z } from 'zod'

const knowledgeNameSchema = z.string().trim().min(1).max(80)
export const knowledgeFileSchema = z
  .object({
    id: z.string().uuid(),
    name: z.string().min(1).max(180),
    bytes: z.number().int().nonnegative(),
    createdAt: z.string(),
  })
  .strict()
const knowledgeBaseSchema = z
  .object({
    id: z.string().uuid(),
    name: knowledgeNameSchema,
    builtin: z.boolean(),
    updatedAt: z.string(),
    files: z.array(knowledgeFileSchema),
  })
  .strict()

export const knowledgeBaseListSchema = z
  .object({
    bases: z.array(knowledgeBaseSchema),
  })
  .strict()
export const knowledgeBaseSchemaResponse = knowledgeBaseSchema
export const createKnowledgeBaseRequestSchema = z
  .object({
    name: knowledgeNameSchema,
  })
  .strict()
export const renameKnowledgeBaseRequestSchema = createKnowledgeBaseRequestSchema
export const deleteKnowledgeResponseSchema = z
  .object({
    ok: z.literal(true),
  })
  .strict()

export type KnowledgeFile = z.infer<typeof knowledgeFileSchema>
export type KnowledgeBaseList = z.infer<typeof knowledgeBaseListSchema>
export type KnowledgeBase = z.infer<typeof knowledgeBaseSchema>
export type CreateKnowledgeBaseRequest = z.infer<typeof createKnowledgeBaseRequestSchema>
