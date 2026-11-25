import { expect, test } from 'bun:test'

import { createAgentsService, type AgentStore } from './agents'

function memoryStore(initial = 'nora'): AgentStore {
  let current = initial
  return {
    async get() {
      return current
    },
    async set(_userId, agent) {
      current = agent
    },
  }
}

test('selecting an agent turns that one on and leaves the others available', async () => {
  const service = createAgentsService(memoryStore(), () => ({ nora: true, chatgpt: false, gemini: false }))
  expect((await service.view('user')).agent).toBe('nora')
  const next = await service.select('user', 'gemini')
  expect(next.agent).toBe('gemini')
  expect(next.agents.filter((agent) => agent.id === 'gemini')).toHaveLength(1)
  expect(await service.preference('user')).toBe('gemini')
  await expect(service.select('user', 'claude')).rejects.toThrow('Такого агента нет')
  expect(await service.preference('user')).toBe('gemini')
})
