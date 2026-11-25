import { chatAgentUpdateSchema, chatAgentViewSchema, type ChatAgentId, type ChatAgentView } from '@web-app-demo/contracts'

import type { AuthenticatedTransport } from '@/platform/api'

export function loadAgents(transport: AuthenticatedTransport) {
  return transport.request('/api/users/me/agent', chatAgentViewSchema)
}

export function selectAgent(transport: AuthenticatedTransport, agent: ChatAgentId) {
  return transport.request('/api/users/me/agent', chatAgentViewSchema, {
    method: 'PUT',
    body: chatAgentUpdateSchema.parse({ agent }),
  })
}

export type { ChatAgentView }
