import { z } from 'zod'

export const companySchema = z
  .object({
    id: z.string().uuid(),
    name: z.string().min(1).max(80),
    prompt: z.string().max(4000),
    enabled: z.boolean(),
  })
  .strict()

export const companyListSchema = z
  .object({
    companies: z.array(companySchema).max(24),
  })
  .strict()

export const companyCreateSchema = z
  .object({
    name: z.string().trim().min(1).max(80),
  })
  .strict()

export const companyUpdateSchema = z
  .object({
    name: z.string().trim().min(1).max(80).optional(),
    prompt: z.string().max(4000).optional(),
    enabled: z.boolean().optional(),
  })
  .strict()
  .refine(
    (value) => value.name !== undefined || value.prompt !== undefined || value.enabled !== undefined,
    'Нечего сохранять',
  )

export const companyDeletedSchema = z
  .object({
    ok: z.literal(true),
  })
  .strict()

export type Company = z.infer<typeof companySchema>
export type CompanyList = z.infer<typeof companyListSchema>
export type CompanyCreate = z.infer<typeof companyCreateSchema>
export type CompanyUpdate = z.infer<typeof companyUpdateSchema>
