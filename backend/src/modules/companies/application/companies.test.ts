import { expect, test } from 'bun:test'

import { CompanyRuleError, type CompanyRecord, type CompanyStore } from '../domain/company'
import { createCompaniesService } from './companies'

function memoryStore() {
  const rows = new Map<string, CompanyRecord & { userId: string }>()
  let next = 0
  const store: CompanyStore = {
    async list(userId) {
      return [...rows.values()].filter((row) => row.userId === userId).map(publicRow)
    },
    async count(userId) {
      return [...rows.values()].filter((row) => row.userId === userId).length
    },
    async create(userId, name) {
      next += 1
      const row = { id: `00000000-0000-7000-8000-${String(next).padStart(12, '0')}`, userId, name, prompt: '', enabled: true }
      rows.set(row.id, row)
      return publicRow(row)
    },
    async update(userId, id, patch) {
      const row = rows.get(id)
      if (!row || row.userId !== userId) return null
      if (patch.name !== undefined) row.name = patch.name
      if (patch.prompt !== undefined) row.prompt = patch.prompt
      if (patch.enabled !== undefined) row.enabled = patch.enabled
      return publicRow(row)
    },
    async remove(userId, id) {
      const row = rows.get(id)
      if (!row || row.userId !== userId) return false
      rows.delete(id)
      return true
    },
    async briefs(userId, ids) {
      return ids.flatMap((id) => {
        const row = rows.get(id)
        if (!row || row.userId !== userId || !row.enabled) return []
        return [{ id: row.id, name: row.name, prompt: row.prompt }]
      })
    },
  }
  return store
}

function publicRow(row: CompanyRecord): CompanyRecord {
  return { id: row.id, name: row.name, prompt: row.prompt, enabled: row.enabled }
}

test('a company keeps its own prompt and a disabled company stays out of chat', async () => {
  const service = createCompaniesService(memoryStore())
  const first = await service.create('user-a', '  Промальянс  ')
  const second = await service.create('user-a', 'Другая')
  await service.create('user-b', 'Чужая')
  expect(first.name).toBe('Промальянс')
  const saved = await service.update('user-a', first.id, { prompt: 'вывоз медицинских отходов\nобезвреживание' })
  expect(saved.prompt).toBe('вывоз медицинских отходов\nобезвреживание')
  await service.update('user-a', second.id, { enabled: false })
  const chat = await service.profilesForChat('user-a', [second.id, first.id, second.id])
  expect(chat).toEqual([{ name: 'Промальянс', prompt: 'вывоз медицинских отходов\nобезвреживание' }])
  await expect(service.update('user-a', 'missing', { name: 'Нет' })).rejects.toBeInstanceOf(CompanyRuleError)
  await expect(service.create('user-a', '   ')).rejects.toThrow('Укажите название')
})
