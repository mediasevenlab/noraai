import { z } from 'zod'

export const chatAgentSchema = z.enum(['nora', 'chatgpt', 'gemini'])

export const chatAgentCardSchema = z
  .object({
    id: chatAgentSchema,
    name: z.string().min(1).max(40),
    ready: z.boolean(),
    detail: z.string().max(240),
  })
  .strict()

export const chatAgentViewSchema = z
  .object({
    agent: chatAgentSchema,
    agents: z.array(chatAgentCardSchema).length(3),
  })
  .strict()

export const chatAgentUpdateSchema = z
  .object({
    agent: chatAgentSchema,
  })
  .strict()

export type ChatAgentId = z.infer<typeof chatAgentSchema>
export type ChatAgentView = z.infer<typeof chatAgentViewSchema>
export type ChatAgentUpdate = z.infer<typeof chatAgentUpdateSchema>
