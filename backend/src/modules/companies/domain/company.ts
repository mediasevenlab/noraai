export const COMPANY_NAME_MAX = 80
export const COMPANY_PROMPT_MAX = 4000
export const COMPANY_LIMIT = 24
export const COMPANY_CHAT_LIMIT = 8

export class CompanyRuleError extends Error {
  constructor(
    message: string,
    readonly status: 400 | 404 = 400,
  ) {
    super(message)
  }
}

export function companyName(value: string) {
  const name = value.trim().replace(/\s+/g, ' ').slice(0, COMPANY_NAME_MAX)
  if (!name) throw new CompanyRuleError('Укажите название')
  return name
}

export function companyPrompt(value: string) {
  return value.replace(/\r\n/g, '\n').trim().slice(0, COMPANY_PROMPT_MAX)
}

export type CompanyRecord = {
  id: string
  name: string
  prompt: string
  enabled: boolean
}

export type CompanyStore = {
  list: (userId: string) => Promise<CompanyRecord[]>
  count: (userId: string) => Promise<number>
  create: (userId: string, name: string) => Promise<CompanyRecord>
  update: (
    userId: string,
    id: string,
    patch: { name?: string; prompt?: string; enabled?: boolean },
  ) => Promise<CompanyRecord | null>
  remove: (userId: string, id: string) => Promise<boolean>
  briefs: (userId: string, ids: readonly string[]) => Promise<Array<{ id: string; name: string; prompt: string }>>
}
