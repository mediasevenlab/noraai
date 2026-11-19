import { z } from 'zod'

const procurementFieldSchema = z
  .object({
    label: z.string(),
    value: z.string(),
  })
  .strict()

const procurementSectionSchema = z
  .object({
    title: z.string(),
    fields: z.array(procurementFieldSchema),
  })
  .strict()

const procurementBlockSchema = z
  .object({
    name: z.string(),
    hint: z.string(),
  })
  .strict()

const procurementAttachmentSchema = z
  .object({
    name: z.string(),
    bytes: z.number().int().nonnegative(),
    size: z.string(),
    url: z.string(),
  })
  .strict()

const procurementPositionSchema = z
  .object({
    name: z.string(),
    unit: z.string(),
    price: z.string(),
    quantity: z.string(),
  })
  .strict()

/** One small EIS archive, read into a card. Not a search result. */
export const procurementSampleSchema = z
  .object({
    registryNumber: z.string(),
    subsystem: z.string(),
    fileName: z.string(),
    documentKind: z.string(),
    documentTitle: z.string(),
    schemeVersion: z.string(),
    positionCount: z.number().int().nonnegative(),
    sections: z.array(procurementSectionSchema),
    blocks: z.array(procurementBlockSchema),
    attachments: z.array(procurementAttachmentSchema),
    attachmentBytes: z.number().int().nonnegative(),
    attachmentSize: z.string(),
    positions: z.array(procurementPositionSchema),
  })
  .strict()

export type ProcurementSample = z.infer<typeof procurementSampleSchema>

const procurementNoticeSchema = z
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

/** Ten open notices from the public search page. Not an archive download. */
export const procurementOpenListSchema = z
  .object({
    notices: z.array(procurementNoticeSchema).max(10),
  })
  .strict()

export type ProcurementOpenList = z.infer<typeof procurementOpenListSchema>

export const procurementSavedPageSchema = z
  .object({
    total: z.number().int().nonnegative(),
    page: z.number().int().positive(),
    pageCount: z.number().int().positive(),
    notices: z.array(procurementNoticeSchema).max(50),
  })
  .strict()

export type ProcurementSavedPage = z.infer<typeof procurementSavedPageSchema>

export const procurementSyncSchema = z
  .object({
    running: z.boolean(),
    phase: z.string(),
    day: z.string(),
    page: z.number().int().nonnegative(),
    queued: z.number().int().nonnegative(),
    saved: z.number().int().nonnegative(),
    failed: z.number().int().nonnegative(),
    zipBytes: z.number().int().nonnegative(),
    truncated: z.number().int().nonnegative(),
    dropped: z.number().int().nonnegative(),
    cellsDone: z.number().int().nonnegative(),
    cellsTotal: z.number().int().nonnegative(),
    eta: z.string(),
  })
  .strict()

export type ProcurementSync = z.infer<typeof procurementSyncSchema>
