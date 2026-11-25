import {
  COMPANY_CHAT_LIMIT,
  COMPANY_LIMIT,
  companyName,
  companyPrompt,
  CompanyRuleError,
  type CompanyRecord,
  type CompanyStore,
} from '../domain/company'

export function createCompaniesService(store: CompanyStore) {
  return {
    list(userId: string) {
      return store.list(userId)
    },
    async create(userId: string, name: string) {
      if (await store.count(userId) >= COMPANY_LIMIT) {
        throw new CompanyRuleError('Можно сохранить не больше 24 компаний')
      }
      return store.create(userId, companyName(name))
    },
    async update(
      userId: string,
      id: string,
      patch: { name?: string; prompt?: string; enabled?: boolean },
    ) {
      const next: { name?: string; prompt?: string; enabled?: boolean } = {}
      if (patch.name !== undefined) next.name = companyName(patch.name)
      if (patch.prompt !== undefined) next.prompt = companyPrompt(patch.prompt)
      if (patch.enabled !== undefined) next.enabled = patch.enabled
      const saved = await store.update(userId, id, next)
      if (!saved) throw new CompanyRuleError('Компания не найдена', 404)
      return saved
    },
    async remove(userId: string, id: string) {
      if (!(await store.remove(userId, id))) throw new CompanyRuleError('Компания не найдена', 404)
    },
    async profilesForChat(userId: string, ids: readonly string[]) {
      const unique = [...new Set(ids.map((id) => id.trim()).filter(Boolean))].slice(0, COMPANY_CHAT_LIMIT)
      if (unique.length === 0) return []
      const rows = await store.briefs(userId, unique)
      const byId = new Map(rows.map((row) => [row.id, row]))
      return unique.flatMap((id) => {
        const row = byId.get(id)
        return row ? [{ name: row.name, prompt: row.prompt }] : []
      })
    },
  }
}

export type { CompanyRecord }
