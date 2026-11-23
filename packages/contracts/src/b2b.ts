import { z } from 'zod'

const b2bNoticeSchema = z
  .object({
    law: z.string(),
    status: z.string(),
    number: z.string(),
    object: z.string(),
    customer: z.string(),
    price: z.string(),
    published: z.string(),
    updated: z.string(),
    deadline: z.string(),
    url: z.string(),
  })
  .strict()

/** Procedures of the integrated B2B-Center company. Not the public market. */
export const b2bPageSchema = z
  .object({
    configured: z.boolean(),
    message: z.string(),
    notices: z.array(b2bNoticeSchema).max(50),
  })
  .strict()

export type B2bPage = z.infer<typeof b2bPageSchema>
