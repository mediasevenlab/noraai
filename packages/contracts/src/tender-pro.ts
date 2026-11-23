import { z } from 'zod'

const tenderProNoticeSchema = z
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

/** Open procedures from the Tender.pro feed. At most 50 cards. */
export const tenderProPageSchema = z
  .object({
    configured: z.boolean(),
    message: z.string(),
    notices: z.array(tenderProNoticeSchema).max(50),
  })
  .strict()

export type TenderProPage = z.infer<typeof tenderProPageSchema>
