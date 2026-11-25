import { expect, test } from 'bun:test'

import { agentView, isChatAgent, parseChatAgent } from './agent'

test('only one of the three agents is selected, and an unknown value stays Nora', () => {
  expect(isChatAgent('chatgpt')).toBe(true)
  expect(isChatAgent('claude')).toBe(false)
  expect(parseChatAgent('gemini')).toBe('gemini')
  expect(parseChatAgent('claude')).toBe('nora')
  expect(parseChatAgent(null)).toBe('nora')
  const view = agentView('chatgpt', { nora: true, chatgpt: false, gemini: true })
  expect(view.agent).toBe('chatgpt')
  expect(view.agents.map((agent) => agent.id)).toEqual(['nora', 'chatgpt', 'gemini'])
  expect(view.agents.filter((agent) => agent.id === view.agent)).toHaveLength(1)
  expect(view.agents.find((agent) => agent.id === 'chatgpt')?.ready).toBe(false)
  expect(view.agents.find((agent) => agent.id === 'chatgpt')?.detail).toContain('Ключ API')
  expect(view.agents.find((agent) => agent.id === 'nora')?.detail).toContain('карточку компании')
})
